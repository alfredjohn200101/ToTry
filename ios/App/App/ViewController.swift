import UIKit
import WebKit
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

    // ── THE STATUS BAR ────────────────────────────────────────────────────────────────────────
    // Info.plist sets UIViewControllerBasedStatusBarAppearance = true and declares no UIStatusBarStyle,
    // so the style came from CAPBridgeViewController's default — which under iOS 13+ follows the
    // DEVICE's light/dark setting, not the app's own theme. To Try is dark by default. On any iPhone
    // set to Light Mode the status bar therefore drew BLACK text on the app's near-black background:
    // the clock, battery and signal were invisible. A reviewer whose phone is in light mode sees that
    // on the very first screen.
    //
    // The app's own theme is the only thing that should decide this, so read it. applyTheme() mirrors
    // it into Preferences (the same route the Face ID lock already uses), which lands in UserDefaults
    // as "CapacitorStorage.totry_theme". Dark — the default and the value when nothing is set yet —
    // gets light content; the opt-in light theme gets dark content.
    override var preferredStatusBarStyle: UIStatusBarStyle {
        // "light" and "dark" are explicit choices in Settings. "system" — the default since the
        // Apple-native redesign, and the value when nothing is stored yet — hands the decision back to
        // the device, which is exactly what a first-party app does: .default follows the trait
        // collection, so the clock turns dark on a light phone and light on a dark one.
        let theme = UserDefaults.standard.string(forKey: "CapacitorStorage.totry_theme")
        switch theme {
        case "light": return .darkContent
        case "dark":  return .lightContent
        default:      return .default
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        applyAppearance()
        showLaunchCover()
        // Repaint when the theme changes mid-session rather than waiting for the next launch.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(themeMayHaveChanged),
            name: UserDefaults.didChangeNotification,
            object: nil)
    }

    // ── THE FIRST SECOND ───────────────────────────────────────────────────────────────────────────
    // Measured frame by frame on the simulator (16 Sep 2026): the launch storyboard is gone about
    // 200ms in, the web view has not painted until roughly a second, and in between the app shows a
    // BLANK screen — the ground colour and nothing else. The first thing anyone sees, reviewer
    // included, and it reads as a crash.
    //
    // `Notify.hideSplash()` has carried a comment for months saying the launch image stays up until
    // the app calls it. It doesn't. Two separate reasons, both silent:
    //   1. capacitor.config.json said `launchShowDuration: 0`, and the plugin's showOnLaunch() returns
    //      before painting anything when that is 0 (SplashScreen.swift). Fixed in the config, and a
    //      test now fails if that pair ever contradicts itself again.
    //   2. It STILL did not paint after that fix. Proved rather than assumed: the launch storyboard
    //      was temporarily given a bright red background and rebuilt, and the first second stayed
    //      black — so whatever the plugin adds to the view hierarchy is not what is on screen.
    // (The red-storyboard test was itself wrong, and worth recording: iOS caches the launch snapshot in
    // SplashBoard and an uninstall does NOT clear it, so the simulator kept replaying an OLD black
    // launch screen no matter what was built. Deleting the device's SplashBoard directory and rebooting
    // it is what finally showed the truth — the measurement was broken, not only the app.)
    // Either way, this owns the cover rather than hoping a plugin does: the same Splash.imageset the storyboard and the plugin use, added last so it is
    // on top, removed when the WEB says it has something to show, and removed regardless after four
    // seconds, because a cover that never lifts is an app that never opens.
    private var launchCover: UIImageView?

    private func showLaunchCover() {
        guard let img = UIImage(named: "Splash") else { return }
        let cover = UIImageView(image: img)
        cover.contentMode = .scaleAspectFill
        cover.clipsToBounds = true
        cover.frame = view.bounds
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.isUserInteractionEnabled = false
        view.addSubview(cover)
        launchCover = cover
        webView?.configuration.userContentController.add(self, name: "totryReady")
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak self] in self?.hideLaunchCover() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let c = launchCover { view.bringSubviewToFront(c); c.frame = view.bounds }
    }

    func hideLaunchCover() {
        guard let cover = launchCover else { return }
        launchCover = nil
        UIView.animate(withDuration: 0.22, animations: { cover.alpha = 0 }, completion: { _ in cover.removeFromSuperview() })
    }

    // ── THE GROUND BEHIND THE WEB VIEW ─────────────────────────────────────────────────────────────
    // capacitor.config.json paints the web view one fixed hex, which was the old near-black. Since the
    // Apple-native redesign the app follows the phone's appearance, so on a light-mode iPhone that fixed
    // colour flashed dark before the first paint and showed through any overscroll. The native ground is
    // now systemGroupedBackground — the same colour as the web --bg in both appearances — and the app's
    // own Light/Dark choice is applied as an interface-style override so native colours agree with it.
    private func storedInterfaceStyle() -> UIUserInterfaceStyle {
        switch UserDefaults.standard.string(forKey: "CapacitorStorage.totry_theme") {
        case "light": return .light
        case "dark":  return .dark
        default:      return .unspecified      // "system" or nothing stored: follow the device
        }
    }

    private func applyAppearance() {
        overrideUserInterfaceStyle = storedInterfaceStyle()
        view.backgroundColor = .systemGroupedBackground
        webView?.isOpaque = false
        webView?.backgroundColor = .systemGroupedBackground
        webView?.scrollView.backgroundColor = .systemGroupedBackground
    }

    @objc private func themeMayHaveChanged() {
        DispatchQueue.main.async { [weak self] in
            self?.applyAppearance()
            self?.setNeedsStatusBarAppearanceUpdate()
        }
    }

    deinit { NotificationCenter.default.removeObserver(self) }
}

/// The web app's "I have painted something" signal. `Notify.hideSplash()` posts it, from the same two
/// places it already called the plugin from: the first screen paint and a hard timeout behind it.
extension ViewController: WKScriptMessageHandler {
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "totryReady" else { return }
        DispatchQueue.main.async { [weak self] in self?.hideLaunchCover() }
    }
}
