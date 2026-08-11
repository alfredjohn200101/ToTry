import Foundation
import Capacitor
import HealthKit

/// Writes back to Apple Health: a workout you logged here, and a weigh-in.
///
/// WHY THIS EXISTS: the app already declared `NSHealthUpdateUsageDescription` — "To Try can record
/// activity you log here back to Apple Health, so your data stays in one place" — and privacy.html
/// promised "anything written back to Apple Health (like a logged workout) is written only at your
/// request". Neither was true: `capacitor-health` exposes only `query*` methods, and nothing else wrote.
/// So the app was requesting a permission it could not use and describing a feature that did not exist.
/// Apple checks that a requested permission is actually used, and beyond the review risk it was simply a
/// claim the code did not keep.
///
/// This is deliberately narrow. It writes two things, both of which the person explicitly logged:
///   · a workout    — type, start, duration, and energy burned if known
///   · a body mass  — a weigh-in
/// It never writes anything inferred, never writes nutrition (the app's calorie figures are estimates and
/// do not belong in a health record), and never writes on a schedule. One log, one write, at their action.
///
/// Read access lives in capacitor-health; this handles the write side only, so the two never fight over
/// the same permission request.
@objc(HealthWritePlugin)
public class HealthWritePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthWritePlugin"
    public let jsName = "HealthWrite"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWeight", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    /// Only the two types this plugin writes. Asking for more than it uses is the problem it fixes.
    private var writeTypes: Set<HKSampleType> {
        var t = Set<HKSampleType>()
        t.insert(HKObjectType.workoutType())
        if let energy = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) { t.insert(energy) }
        if let mass = HKQuantityType.quantityType(forIdentifier: .bodyMass) { t.insert(mass) }
        return t
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false, "reason": "Health data is not available on this device."])
            return
        }
        store.requestAuthorization(toShare: writeTypes, read: nil) { success, error in
            if let error = error {
                call.reject("Health write permission failed: \(error.localizedDescription)")
                return
            }
            // iOS does tell the truth about WRITE authorization (unlike read), so this is checkable.
            let ok = self.store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
            call.resolve(["granted": success && ok])
        }
    }

    /// saveWorkout({ type, startMs, durationMin, calories? })
    ///
    /// Maps the app's own free-text session names onto HKWorkoutActivityType. Anything unrecognised
    /// becomes .other rather than being dropped — a session in Health under the wrong-but-plausible
    /// label is far better than a session the person logged and cannot find.
    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Health data unavailable"); return }
        guard store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
            call.resolve(["ok": false, "reason": "not-authorized"]); return
        }

        let durationMin = call.getDouble("durationMin") ?? 0
        guard durationMin > 0 else { call.resolve(["ok": false, "reason": "no-duration"]); return }

        let startMs = call.getDouble("startMs") ?? (Date().timeIntervalSince1970 * 1000)
        let start = Date(timeIntervalSince1970: startMs / 1000)
        let end = start.addingTimeInterval(durationMin * 60)
        let activity = Self.activityType(for: call.getString("type") ?? "")

        // HKWorkoutBuilder is the modern path; HKWorkout(...) is deprecated from iOS 17.
        let config = HKWorkoutConfiguration()
        config.activityType = activity
        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())

        builder.beginCollection(withStart: start) { ok, err in
            if !ok {
                call.resolve(["ok": false, "reason": err?.localizedDescription ?? "begin-failed"]); return
            }
            let finish = {
                builder.endCollection(withEnd: end) { ok2, err2 in
                    guard ok2 else {
                        call.resolve(["ok": false, "reason": err2?.localizedDescription ?? "end-failed"]); return
                    }
                    builder.finishWorkout { workout, err3 in
                        if let err3 = err3 {
                            call.resolve(["ok": false, "reason": err3.localizedDescription]); return
                        }
                        call.resolve(["ok": workout != nil])
                    }
                }
            }
            // Energy is optional: many strength sessions have no honest calorie figure, and inventing
            // one to make the record look complete would be exactly the wrong trade.
            let cals = call.getDouble("calories") ?? 0
            if cals > 0, let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
                let sample = HKCumulativeQuantitySample(
                    type: energyType,
                    quantity: HKQuantity(unit: .kilocalorie(), doubleValue: cals),
                    start: start, end: end)
                builder.add([sample]) { _, _ in finish() }
            } else {
                finish()
            }
        }
    }

    /// saveWeight({ kg, atMs? })
    @objc func saveWeight(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let massType = HKQuantityType.quantityType(forIdentifier: .bodyMass) else {
            call.reject("Health data unavailable"); return
        }
        guard store.authorizationStatus(for: massType) == .sharingAuthorized else {
            call.resolve(["ok": false, "reason": "not-authorized"]); return
        }
        let kg = call.getDouble("kg") ?? 0
        guard kg > 20, kg < 500 else { call.resolve(["ok": false, "reason": "implausible-weight"]); return }

        let atMs = call.getDouble("atMs") ?? (Date().timeIntervalSince1970 * 1000)
        let at = Date(timeIntervalSince1970: atMs / 1000)
        let sample = HKQuantitySample(
            type: massType,
            quantity: HKQuantity(unit: .gramUnit(with: .kilo), doubleValue: kg),
            start: at, end: at)

        store.save(sample) { ok, err in
            call.resolve(["ok": ok, "reason": err?.localizedDescription ?? ""])
        }
    }

    /// The app's session names are free text ("Push Day", "Indoor Walk", "Leg Day"), so this matches on
    /// substrings rather than an exact table.
    private static func activityType(for raw: String) -> HKWorkoutActivityType {
        let s = raw.lowercased()
        if s.contains("run") { return .running }
        if s.contains("walk") { return .walking }
        if s.contains("cycl") || s.contains("bike") || s.contains("ride") { return .cycling }
        if s.contains("swim") { return .swimming }
        if s.contains("row") { return .rowing }
        if s.contains("yoga") { return .yoga }
        if s.contains("hiit") || s.contains("interval") { return .highIntensityIntervalTraining }
        if s.contains("mobility") || s.contains("stretch") { return .flexibility }
        if s.contains("box") || s.contains("fight") { return .boxing }
        if s.contains("football") || s.contains("soccer") { return .soccer }
        if s.contains("climb") { return .climbing }
        // Push/pull/legs/upper/lower and anything else with exercises in it is strength work.
        return .traditionalStrengthTraining
    }
}
