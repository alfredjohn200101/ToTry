import Foundation
import Capacitor
import HealthKit

/// Reads sleep from Apple Health.
///
/// Why this exists: `capacitor-health` — which the app already uses for steps, active energy, workouts,
/// heart rate and mindfulness — exposes no sleep permission or data type at all. Sleep is the single most
/// valuable automatic signal this app could have: it already feeds `getLifeState()` and already changes
/// what the coach says, but until now a person had to type it in every morning, which nobody does.
///
/// This is deliberately small. It adds ONE capability to what is already there rather than replacing the
/// existing health integration: the HealthKit entitlement, the usage descriptions and the permission flow
/// are all already in place, so this only asks for the one category type the other plugin cannot read.
@objc(SleepPlugin)
public class SleepPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SleepPlugin"
    public let jsName = "Sleep"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "querySleep", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    private var sleepType: HKCategoryType? {
        return HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable() && sleepType != nil])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let type = sleepType else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: nil, read: [type]) { success, error in
            if let error = error {
                call.reject("Sleep permission failed: \(error.localizedDescription)")
                return
            }
            // iOS never tells us whether READ access was actually granted — a denied read simply returns
            // no samples. So `granted` here means "the sheet completed", and the JS side treats an empty
            // result as "no data yet" rather than claiming the person sleeps zero hours.
            call.resolve(["granted": success])
        }
    }

    /// Returns nightly totals: [{ "date": "YYYY-MM-DD", "hours": Double, "inBedHours": Double }]
    ///
    /// A night is attributed to the day the person WAKES, which is how anyone reading it thinks about it:
    /// sleep that starts at 23:40 on the 3rd and ends 07:10 on the 4th is "the 4th's sleep".
    @objc func querySleep(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let type = sleepType else {
            call.resolve(["nights": []])
            return
        }
        let days = call.getInt("days") ?? 14
        let end = Date()
        guard let start = Calendar.current.date(byAdding: .day, value: -max(1, days), to: end) else {
            call.resolve(["nights": []])
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit,
                                  sortDescriptors: [sort]) { _, samples, error in
            if let error = error {
                call.reject("Sleep query failed: \(error.localizedDescription)")
                return
            }
            guard let samples = samples as? [HKCategorySample] else {
                call.resolve(["nights": []])
                return
            }

            let fmt = DateFormatter()
            fmt.dateFormat = "yyyy-MM-dd"
            fmt.timeZone = TimeZone.current

            var asleepByDay: [String: Double] = [:]
            var inBedByDay: [String: Double] = [:]

            for s in samples {
                let seconds = s.endDate.timeIntervalSince(s.startDate)
                if seconds <= 0 { continue }
                let key = fmt.string(from: s.endDate)   // attribute to the waking day

                // Raw values rather than the enum cases, so this works on iOS 15 through 18 without
                // availability branches: 0 = inBed, 2 = awake, everything else (1 unspecified, 3 core,
                // 4 deep, 5 REM) is genuinely asleep.
                let v = s.value
                if v == HKCategoryValueSleepAnalysis.inBed.rawValue {
                    inBedByDay[key, default: 0] += seconds
                } else if v != 2 {
                    asleepByDay[key, default: 0] += seconds
                }
            }

            // Prefer measured asleep time; fall back to in-bed for older trackers that only record that.
            var nights: [[String: Any]] = []
            let allKeys = Set(asleepByDay.keys).union(inBedByDay.keys)
            for key in allKeys.sorted() {
                let asleep = asleepByDay[key] ?? 0
                let inBed = inBedByDay[key] ?? 0
                let best = asleep > 0 ? asleep : inBed
                if best <= 0 { continue }
                nights.append([
                    "date": key,
                    "hours": (best / 3600 * 10).rounded() / 10,
                    "inBedHours": (inBed / 3600 * 10).rounded() / 10
                ])
            }
            call.resolve(["nights": nights])
        }
        store.execute(query)
    }
}
