import Foundation
import Capacitor
import LocalAuthentication

/// Face ID / Touch ID / passcode, so the most private thing on someone's phone can be locked.
///
/// WHY THIS EXISTS: this app holds vice logs, confessions, journal entries, prayers and money. People hand
/// their unlocked phone to a partner, a friend, a child. A PWA cannot lock itself by any means — this is
/// one of the few genuinely new things the wrapper makes possible, and it serves the soul directly: a
/// place you can be completely honest has to be a place that is safe.
///
/// THE ONE THING THAT MATTERS MOST HERE IS NOT LOCKING SOMEONE OUT OF THEIR OWN JOURNAL. So:
///   · the policy is `deviceOwnerAuthentication`, NOT `deviceOwnerAuthenticationWithBiometrics` — if Face
///     ID fails, is unavailable, or the person is wearing something it can't read, iOS falls back to the
///     device passcode on its own. There is always a way in.
///   · if the device can offer NEITHER biometry nor a passcode, authenticate() reports `unavailable`
///     rather than a failure, and the JS treats that as "let them in" instead of trapping them.
@objc(BiometricPlugin)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BiometricPlugin"
    public let jsName = "Biometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    /// What this device can actually do, so the JS never offers a lock it cannot honour.
    @objc func isAvailable(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?

        // Biometry specifically — for naming the button "Face ID" or "Touch ID" truthfully.
        let biometryOK = ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err)
        var kind = "none"
        switch ctx.biometryType {
        case .faceID: kind = "faceId"
        case .touchID: kind = "touchId"
        default: kind = "none"
        }

        // The policy actually used: biometry OR passcode. This is what decides whether a lock is safe.
        var passcodeErr: NSError?
        let anyAuthOK = LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &passcodeErr)

        call.resolve([
            "available": anyAuthOK,
            "biometry": biometryOK,
            "kind": kind,
            // Distinguished so the JS can say the useful thing: "set up Face ID" is a different message
            // from "you have no passcode, so a lock could trap you".
            "reason": anyAuthOK ? "" : (passcodeErr?.localizedDescription ?? "No passcode or biometry is set up on this device.")
        ])
    }

    /// authenticate({ reason }) → { ok } | { ok:false, unavailable:true } | { ok:false, cancelled:true }
    ///
    /// Never rejects. A failed unlock is an ordinary event, and a rejection would surface in the JS as an
    /// exception in the middle of the lock screen — the one place that must stay calm and predictable.
    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Unlock To Try"
        let ctx = LAContext()
        // Deliberately not set to "Enter Password": leaving it nil gives the system's own passcode
        // fallback wording, which is what people recognise.
        ctx.localizedFallbackTitle = nil

        var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthentication, error: &err) else {
            // No biometry AND no passcode. Report unavailable so the JS lets them in rather than locking
            // a person out of their own journal with no possible way to prove who they are.
            call.resolve(["ok": false, "unavailable": true,
                          "reason": err?.localizedDescription ?? "No way to authenticate on this device."])
            return
        }

        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { ok, error in
            if ok {
                call.resolve(["ok": true]); return
            }
            let code = (error as NSError?)?.code
            let cancelled = code == LAError.userCancel.rawValue
                || code == LAError.systemCancel.rawValue
                || code == LAError.appCancel.rawValue
            call.resolve([
                "ok": false,
                "cancelled": cancelled,
                // biometryNotAvailable / notEnrolled / passcodeNotSet mid-session: treat as unavailable
                // so the JS opens rather than traps.
                "unavailable": code == LAError.biometryNotAvailable.rawValue
                    || code == LAError.biometryNotEnrolled.rawValue
                    || code == LAError.passcodeNotSet.rawValue,
                "reason": error?.localizedDescription ?? "Could not verify it was you."
            ])
        }
    }
}
