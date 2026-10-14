import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    // ── THE APP SWITCHER SNAPSHOT ────────────────────────────────────────────────────────────────
    // iOS photographs the screen the moment an app resigns active, and shows that image in the app
    // switcher — to anyone holding the phone, with no Face ID in the way.
    //
    // So the whole point of the app lock was being handed away: someone reads their journal, swipes
    // up, passes the phone to a partner or leaves it on a desk, and the journal entry is sitting in
    // the switcher in full. The lock they turned on to prevent exactly that never gets a chance to
    // run, because this happens below the web layer, in UIKit, before any JavaScript is told anything.
    //
    // The cover goes up on willResignActive (before the snapshot) and comes down on didBecomeActive.
    // It is only applied when the person actually turned the lock on — reading the same flag the web
    // layer writes, so one setting governs both halves.
    private var privacyCover: UIView?

    private func lockIsOn() -> Bool {
        // Written by Lock._mirrorToNative() through @capacitor/preferences, which stores strings under
        // a "CapacitorStorage." prefix in UserDefaults — the one store UIKit can read synchronously,
        // which willResignActive requires because the snapshot is taken the instant it returns.
        let d = UserDefaults.standard
        if let v = d.string(forKey: "CapacitorStorage.totry_lock_on") { return v == "true" }
        return false
    }

    private func showPrivacyCover() {
        guard lockIsOn(), privacyCover == nil, let window = self.window else { return }
        let cover = UIView(frame: window.bounds)
        // Apple-native: the cover is the system grouped background and label colour, following the app's
        // own Light/Dark choice (or the device when that choice is "System"), in San Francisco.
        switch UserDefaults.standard.string(forKey: "CapacitorStorage.totry_theme") {
        case "light": cover.overrideUserInterfaceStyle = .light
        case "dark":  cover.overrideUserInterfaceStyle = .dark
        default:      cover.overrideUserInterfaceStyle = .unspecified
        }
        cover.backgroundColor = .systemGroupedBackground
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        // THE COVER IS THE APP'S OWN FACE, NOT SAN FRANCISCO. This drew "ToTry" in
        // `UIFont.systemFont(.bold)` — a deliberate choice back when the brief read "Apple-native",
        // and the owner corrected that brief: "i still liked the totry font, not complete apple
        // font". The wordmark in Cormorant Garamond IS ToTry's identity, so a system-font cover is
        // the one screen where the app does not look like itself — and it is the screen a person
        // meets every time they come back to a locked app, which is the worst place to lose it.
        // The web bundle's Cormorant is woff2, which UIKit cannot load, and nothing is registered in
        // UIAppFonts. But the LAUNCH screen already renders the wordmark correctly because it is an
        // IMAGE — Splash.imageset, with its own light and dark variants. Using that same asset here
        // makes the cover and the launch screen visibly one app, which is the whole point, and costs
        // no font registration.
        if let mark = UIImage(named: "Splash") {
            let iv = UIImageView(image: mark)
            iv.contentMode = .scaleAspectFill
            iv.clipsToBounds = true
            iv.translatesAutoresizingMaskIntoConstraints = false
            cover.addSubview(iv)
            NSLayoutConstraint.activate([
                iv.leadingAnchor.constraint(equalTo: cover.leadingAnchor),
                iv.trailingAnchor.constraint(equalTo: cover.trailingAnchor),
                iv.topAnchor.constraint(equalTo: cover.topAnchor),
                iv.bottomAnchor.constraint(equalTo: cover.bottomAnchor)
            ])
        } else {
            // A MISSING ASSET MUST NOT LEAVE A BLANK RECTANGLE. If Splash ever stops resolving, the
            // cover still has to hide the journal underneath it — that is its actual job — so the
            // old label stays as the fallback rather than being deleted.
            let label = UILabel()
            label.text = "ToTry"
            label.textColor = .label
            label.font = UIFont.systemFont(ofSize: 28, weight: .bold)
            label.translatesAutoresizingMaskIntoConstraints = false
            cover.addSubview(label)
            NSLayoutConstraint.activate([
                label.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
                label.centerYAnchor.constraint(equalTo: cover.centerYAnchor)
            ])
        }
        window.addSubview(cover)
        privacyCover = cover
    }

    private func hidePrivacyCover() {
        privacyCover?.removeFromSuperview()
        privacyCover = nil
    }

    func applicationWillResignActive(_ application: UIApplication) {
        showPrivacyCover()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // The web layer's own lock screen takes over from here; this only covers the snapshot window.
        hidePrivacyCover()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
