import UIKit
import Capacitor

/// The app's bridge view controller, which exists for exactly one reason: to register SleepPlugin.
///
/// Capacitor discovers plugins that ship inside a Swift package — that is how `capacitor-health`,
/// `LocalNotifications` and the rest appear in `Capacitor.Plugins`. A plugin that lives in the APP
/// TARGET, as `SleepPlugin.swift` does, is compiled into the binary but never added to that list. The
/// symptom was silent and easy to misread: `strings` found `SleepPlugin` in the built binary, so the
/// plugin looked present, while `Object.keys(Capacitor.Plugins)` on a real device did not contain
/// `Sleep` at all. `Health._sleepP()` therefore returned null for every call, and automatic sleep sync
/// did nothing — no error, no warning, and the Track tab quietly fell back to the manual ± control.
///
/// (Found by printing the plugin list onto the screen in a throwaway build and reading it off a
/// screenshot. The same trick found the `Plugins.Health` vs `Plugins.HealthPlugin` mismatch in v408.)
///
/// `capacitorDidLoad()` is the documented hook for this: it runs after the bridge exists and before the
/// web view loads, so the plugin is registered before any JS can ask for it.
class ViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Registered by instance because this plugin is not part of a package's generated plugin list.
        bridge?.registerPluginInstance(SleepPlugin())
        // Same reason: an app-target plugin is compiled but never auto-discovered.
        bridge?.registerPluginInstance(HealthWritePlugin())
        bridge?.registerPluginInstance(ShareFilePlugin())
        // The live barcode scanner. Same reason again: an app-target plugin is never auto-discovered.
        bridge?.registerPluginInstance(BarcodeScannerPlugin())
        // The Face ID / passcode lock for the journal. Same reason.
        bridge?.registerPluginInstance(BiometricPlugin())
    }
}
