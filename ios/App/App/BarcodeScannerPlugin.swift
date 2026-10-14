import Foundation
import Capacitor
import AVFoundation
import UIKit

/// A real, live barcode scanner — point the camera at a product and it reads instantly, offline.
///
/// WHY THIS EXISTS: the web scanner takes a PHOTO and sends it to Gemini Vision to read the digits. Its
/// "fast path" tries `BarcodeDetector`, with a comment claiming iOS Safari 17+ supports it — WebKit has
/// never shipped the Shape Detection API, so on every iPhone `'BarcodeDetector' in window` is false and
/// every single scan went to the AI. That means a network round trip (slow), a paid API call per scan,
/// nothing at all offline, and worse accuracy than the scanner Apple has shipped in AVFoundation for a
/// decade. Barcode scanning is the interaction people judge a food tracker by.
///
/// No third-party dependency: AVCaptureMetadataOutput does the decoding on-device. ML Kit would have
/// pulled in CocoaPods, and this project is deliberately SPM-only.
@objc(BarcodeScannerPlugin)
public class BarcodeScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BarcodeScannerPlugin"
    public let jsName = "BarcodeScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        // CONTINUOUS MODE. Shopping is not one item: the camera stays up, each read is announced to
        // the JS, and the answer comes back through showScanResult so the person never leaves the
        // viewfinder. closeScan is the way out when they are done.
        CAPPluginMethod(name: "showScanResult", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "closeScan", returnType: CAPPluginReturnPromise),
        // THE TROLLEY HAS TO BE ON SCREEN. `showScanResult` paints ONE card for ONE read and the next
        // read overwrites it, so a person scanning a shop saw a single line of text being replaced —
        // the accumulation that is the entire point of continuous mode was invisible, and an
        // accumulation you cannot see reads as nothing happening. The queue, the debounce, the
        // late-arrival parking and the drain were all built and correct; the overlay rendered none
        // of it. This is a separate method rather than more arguments on showScanResult because the
        // two have different contracts: a result card is a CLAIM about the tin in your hand (and so
        // carries the `_bcSeq` staleness guard), while this is a full push of JS-owned state where
        // last-write-wins is correct and a turn guard would be wrong.
        CAPPluginMethod(name: "setScanQueue", returnType: CAPPluginReturnPromise)
    ]

    /// Full-state push of the scan queue. Always send the WHOLE array; there is no incremental form.
    @objc func setScanQueue(_ call: CAPPluginCall) {
        let items = call.getArray("items", JSObject.self) ?? []
        DispatchQueue.main.async {
            guard let vc = BarcodeScanViewController.live else { call.resolve(["shown": false]); return }
            vc.applyQueue(items)
            call.resolve(["shown": true])
        }
    }

    /// Paints the looked-up product over the live preview. Called by the JS after it resolves a code
    /// announced by `barcodeScanned`. Silently does nothing if the camera has since been dismissed —
    /// a late answer to a scanner nobody is looking at is not an error.
    @objc func showScanResult(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let sub = call.getString("sub") ?? ""
        let ok = call.getBool("ok") ?? true
        DispatchQueue.main.async {
            BarcodeScanViewController.live?.present(result: title, sub: sub, ok: ok)
            call.resolve(["shown": BarcodeScanViewController.live != nil])
        }
    }

    /// Closes a continuous scan from the JS side.
    @objc func closeScan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            BarcodeScanViewController.live?.dismissFromJS()
            call.resolve(["closed": true])
        }
    }

    /// Reports whether a live scan is even possible, so the JS can choose the photo path instead of
    /// showing a button that cannot work. False on the Simulator, which has no camera.
    @objc func isAvailable(_ call: CAPPluginCall) {
        let hasCamera = AVCaptureDevice.default(for: .video) != nil
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        call.resolve([
            "available": hasCamera,
            // Distinguished deliberately: "denied" is a dead end the JS should not send someone into,
            // while "notDetermined" just means the prompt has not been shown yet.
            "permission": {
                switch status {
                case .authorized: return "granted"
                case .denied: return "denied"
                case .restricted: return "restricted"
                default: return "prompt"
                }
            }()
        ])
    }

    /// Opens this app's own page in iOS Settings, which is the ONLY way back from a denied camera.
    ///
    /// WHY: iOS asks for the camera exactly once. Tap "Don't Allow" — at any prompt, including the one
    /// the meal photo raises — and every camera surface in the app is dead from then on, with nothing
    /// on screen to say why or what to do. The live-scan button was simply hidden, which is a sound
    /// default for "this device has no camera" and a trap for "you said no once in March". A feature
    /// that fails CLOSED still has to fail VISIBLY. Reported from a real phone as "the camera doesn't
    /// work", and this is the likeliest reason it stopped.
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString),
                  UIApplication.shared.canOpenURL(url) else {
                call.resolve(["opened": false]); return
            }
            UIApplication.shared.open(url, options: [:]) { ok in call.resolve(["opened": ok]) }
        }
    }

    /// scan() → { code } on a read, { cancelled: true } if they backed out, { available: false } if there
    /// is nothing to scan with. Never rejects for an ordinary outcome: the JS falls back to the photo
    /// path, and a rejection there would read as a crash rather than a choice.
    @objc func scan(_ call: CAPPluginCall) {
        guard AVCaptureDevice.default(for: .video) != nil else {
            call.resolve(["available": false, "reason": "This device has no camera."]); return
        }

        let start = { [weak self] in
            DispatchQueue.main.async {
                guard let self = self, let parent = self.bridge?.viewController else {
                    call.resolve(["available": false, "reason": "No view controller to present from."]); return
                }
                let vc = BarcodeScanViewController()
                vc.continuous = call.getBool("continuous") ?? false
                // Each read in continuous mode is announced; the JS looks it up and answers with
                // showScanResult. One listener name, so the JS side cannot drift from this.
                vc.onContinuousRead = { [weak self] code in
                    self?.notifyListeners("barcodeScanned", data: ["code": code])
                }
                vc.onQueueRemove = { [weak self] idx in
                    self?.notifyListeners("scanQueueRemove", data: ["index": idx])
                }
                vc.onResult = { code in
                    if code == "__manual__" {
                        // Not a cancel. They want the keypad, and the JS opens it rather than
                        // dropping them back in the diary to go and find it.
                        call.resolve(["manual": true])
                    } else if let code = code {
                        call.resolve(["code": code])
                    } else {
                        call.resolve(["cancelled": true])
                    }
                }
                vc.modalPresentationStyle = .fullScreen
                parent.present(vc, animated: true)
            }
        }

        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            start()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted { start() }
                else { call.resolve(["available": false, "reason": "Camera access was declined."]) }
            }
        default:
            // Already denied or restricted. Say so plainly; the JS offers the photo path and a pointer
            // to iOS Settings rather than opening a black screen.
            call.resolve(["available": false, "permission": "denied",
                          "reason": "Camera access is off for To Try. Turn it on in iOS Settings → To Try → Camera."])
        }
    }
}

/// The camera screen.
///
/// This replaced a deliberately plain one — a preview, a cut-out, a hint and Cancel — on 13 Oct 2026,
/// because "plain" had quietly become "less than every app it is compared to". The owner's words were
/// that we are not a vibe-coded PWA any more and this feature should stop behaving like one.
///
/// WHAT WAS ACTUALLY WRONG, rather than merely sparse:
///  · NO TORCH. A barcode is read in a supermarket aisle, often on dark packaging, often in a fridge.
///    Every competitor has a torch; without one the scanner simply fails in the place it is used most.
///  · THE AIMING FRAME WAS DECORATIVE. `rectOfInterest` was never set, so AVFoundation read the WHOLE
///    frame. The gold box said "put it here" and meant nothing — and worse, a barcode on a NEIGHBOURING
///    product could win. It is the scan window now, converted through the preview layer so it is right
///    whatever the aspect fill is doing.
///  · NO FOCUS OR ZOOM. A small barcode on a curved bottle needs both, and a phone that cannot focus on
///    it reads as a broken camera rather than a hard shot.
///  · IT DISMISSED ON EVERY READ. Shopping is not one item. MyFitnessPal keeps the camera up and slides
///    the result in; here you were thrown back to the diary and had to start again for the next thing.
///  · NO WAY OUT BUT CANCEL. If a barcode will not read — scuffed, curved, missing — the only exit was
///    to leave and go hunting for manual entry.
///
/// The session work stays off the main thread, the overlay is laid out in `viewDidLayoutSubviews` so
/// rotation is correct, and every exit releases the camera and answers the promise exactly once.
class BarcodeScanViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {

    /// `code` on a read, nil if they backed out, `"__manual__"` if they asked to type it instead.
    var onResult: ((String?) -> Void)?
    /// Called for every read in continuous mode. The JS looks the code up and calls back with
    /// `present(result:)`, so the person never leaves the viewfinder.
    var onContinuousRead: ((String) -> Void)?
    /// Fired when the person taps × on a trolley cell. The JS owns the queue, so it splices and
    /// pushes the whole array back rather than this side mutating its own copy.
    var onQueueRemove: ((Int) -> Void)?
    var continuous = false

    static weak var live: BarcodeScanViewController?

    private let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?
    private var device: AVCaptureDevice?
    private var finished = false
    private var lastCode = ""
    private var lastReadAt = Date.distantPast

    private let dim = UIView()
    private let aim = UIView()
    private let hint = UILabel()
    private let torchBtn = UIButton(type: .system)
    private let resultCard = UIView()
    private let resultTitle = UILabel()
    private let resultSub = UILabel()
    private let focusRing = UIView()
    private var aimBox: CGRect = .zero
    private var lifecycleObservers: [NSObjectProtocol] = []
    // THE TROLLEY, ON SCREEN. A count chip that survives every card overwrite (it is the answer to
    // "did that do anything"), and a strip of what is in the basket so a wrong product can be caught
    // while the tin is still in your hand rather than in the diary three taps later.
    private let countChip = UILabel()
    private let strip = UIScrollView()
    private var queue: [[String: Any]] = []
    private var stripCells: [UIView] = []
    private var cardHideWork: DispatchWorkItem?
    private weak var cancelBtn: UIButton?

    private let gold = UIColor(red: 0.78, green: 0.66, blue: 0.43, alpha: 1)

    /// UPC-A arrives as EAN-13 with a leading zero, which is why it is not listed separately.
    private let formats: [AVMetadataObject.ObjectType] = [
        .ean13, .ean8, .upce, .code128, .code39, .code39Mod43, .code93, .itf14, .interleaved2of5
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        BarcodeScanViewController.live = self

        guard let dev = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: dev),
              session.canAddInput(input) else { finish(nil); return }
        device = dev
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { finish(nil); return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        // Must be set AFTER addOutput — before it, availableMetadataObjectTypes is empty and this traps.
        output.metadataObjectTypes = formats.filter { output.availableMetadataObjectTypes.contains($0) }
        self.metadataOutput = output

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(layer)
        preview = layer

        // ZOOM IS THE DEVICE'S, NOT THE SCREEN'S. A pinch to 6x persisted after dismissal, so the
        // next scan opened at 6x showing a sliver of a shelf, with nothing on screen explaining it.
        if let dev = device, (try? dev.lockForConfiguration()) != nil {
            dev.videoZoomFactor = max(dev.minAvailableVideoZoomFactor, 1.0)
            dev.unlockForConfiguration()
        }
        buildOverlay()
        addGestures()
        observeLifecycle()
        // startRunning blocks; keeping it off the main thread stops the present animation stuttering.
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.session.startRunning() }
    }

    /// A CAMERA THAT COMES BACK FROZEN READS AS A BROKEN FEATURE. Backgrounding the app mid-scan — a
    /// phone call, a glance at a shopping list, the app switcher — does NOT call `viewWillDisappear`:
    /// the controller stays presented while iOS interrupts the capture session. Most interruptions
    /// resume on their own; `.videoDeviceInUseByAnotherClient` and a media-services reset do not, and
    /// without this the person returns to a black rectangle that never scans again, with the only way
    /// out being a swipe they have no reason to think will help.
    private func observeLifecycle() {
        let nc = NotificationCenter.default
        let resume: (Notification) -> Void = { [weak self] _ in
            guard let self = self, !self.finished, !self.session.isRunning else { return }
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.session.startRunning() }
        }
        lifecycleObservers.append(
            nc.addObserver(forName: UIApplication.willEnterForegroundNotification,
                           object: nil, queue: .main, using: resume))
        lifecycleObservers.append(
            nc.addObserver(forName: .AVCaptureSessionInterruptionEnded,
                           object: session, queue: .main, using: resume))
        // A RUNTIME ERROR IS NOT AN INTERRUPTION. `mediaServicesWereReset` is recoverable and worth
        // one attempt; anything else has taken the camera for good, and leaving the viewfinder up
        // would be the "appears dead from then on" failure `viewWillDisappear` already guards
        // against — so answer the promise and let the JS offer the keypad.
        lifecycleObservers.append(
            nc.addObserver(forName: .AVCaptureSessionRuntimeError,
                           object: session, queue: .main) { [weak self] note in
                guard let self = self, !self.finished else { return }
                let err = note.userInfo?[AVCaptureSessionErrorKey] as? NSError
                if err?.code == AVError.mediaServicesWereReset.rawValue {
                    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                        self?.session.startRunning()
                    }
                } else {
                    self.finish(nil)
                }
            })
    }

    private func releaseLifecycleObservers() {
        for o in lifecycleObservers { NotificationCenter.default.removeObserver(o) }
        lifecycleObservers.removeAll()
    }

    deinit { releaseLifecycleObservers() }

    private var metadataOutput: AVCaptureMetadataOutput?

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
        layoutOverlay()
        applyRectOfInterest()
    }

    // MARK: overlay

    private func buildOverlay() {
        dim.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        view.addSubview(dim)

        aim.layer.borderColor = gold.cgColor
        aim.layer.borderWidth = 2
        aim.layer.cornerRadius = 14
        aim.backgroundColor = .clear
        view.addSubview(aim)

        hint.text = "Point at the barcode"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 15, weight: .medium)
        hint.textAlignment = .center
        hint.numberOfLines = 2
        view.addSubview(hint)

        // TORCH. The single most-missed control in a supermarket.
        torchBtn.setTitle("Light", for: .normal)
        torchBtn.setTitleColor(.white, for: .normal)
        torchBtn.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        torchBtn.backgroundColor = UIColor.white.withAlphaComponent(0.16)
        torchBtn.layer.cornerRadius = 20
        torchBtn.addTarget(self, action: #selector(toggleTorch), for: .touchUpInside)
        torchBtn.isHidden = !(device?.hasTorch ?? false)
        view.addSubview(torchBtn)

        countChip.textColor = .white
        countChip.font = .systemFont(ofSize: 14, weight: .semibold)
        countChip.textAlignment = .center
        countChip.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        countChip.layer.cornerRadius = 16
        countChip.layer.borderWidth = 1
        countChip.layer.borderColor = gold.withAlphaComponent(0.7).cgColor
        countChip.clipsToBounds = true
        countChip.isHidden = true
        view.addSubview(countChip)

        strip.showsHorizontalScrollIndicator = false
        strip.alwaysBounceHorizontal = true
        strip.isHidden = true
        view.addSubview(strip)

        // A WAY OUT THAT IS NOT GIVING UP. A scuffed or curved barcode is common, and the answer is
        // to type the digits, not to leave the feature.
        let manual = UIButton(type: .system)
        manual.setTitle("Type it instead", for: .normal)
        manual.setTitleColor(.white, for: .normal)
        manual.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
        manual.addTarget(self, action: #selector(manualTapped), for: .touchUpInside)
        manual.tag = 901
        view.addSubview(manual)

        let cancel = UIButton(type: .system)
        cancel.setTitle(continuous ? "Done" : "Cancel", for: .normal)
        cancelBtn = cancel
        cancel.setTitleColor(.white, for: .normal)
        cancel.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancel.tag = 902
        view.addSubview(cancel)

        // The in-camera result, so a read does not cost you the viewfinder.
        resultCard.backgroundColor = UIColor.black.withAlphaComponent(0.82)
        resultCard.layer.cornerRadius = 16
        resultCard.layer.borderWidth = 1
        resultCard.layer.borderColor = gold.withAlphaComponent(0.5).cgColor
        resultCard.alpha = 0
        view.addSubview(resultCard)

        resultTitle.textColor = .white
        resultTitle.font = .systemFont(ofSize: 16, weight: .semibold)
        resultTitle.numberOfLines = 1
        resultCard.addSubview(resultTitle)

        resultSub.textColor = UIColor.white.withAlphaComponent(0.75)
        resultSub.font = .systemFont(ofSize: 13, weight: .regular)
        resultSub.numberOfLines = 1
        resultCard.addSubview(resultSub)

        focusRing.layer.borderColor = gold.cgColor
        focusRing.layer.borderWidth = 1.5
        focusRing.layer.cornerRadius = 36
        focusRing.alpha = 0
        focusRing.isUserInteractionEnabled = false
        view.addSubview(focusRing)
    }

    /// Laid out every pass rather than once, so a rotation does not leave the dim, the box, the hint
    /// and the buttons where the old bounds used to be.
    private func layoutOverlay() {
        let b = view.bounds
        let safeTop = view.safeAreaInsets.top
        let safeBottom = view.safeAreaInsets.bottom

        dim.frame = b
        let w = min(b.width - 56, 340)
        aimBox = CGRect(x: (b.width - w) / 2, y: b.height * 0.32, width: w, height: w * 0.62)
        aim.frame = aimBox

        let path = UIBezierPath(rect: b)
        path.append(UIBezierPath(roundedRect: aimBox, cornerRadius: 14).reversing())
        let shape = CAShapeLayer()
        shape.path = path.cgPath
        dim.layer.mask = shape

        hint.frame = CGRect(x: 20, y: aimBox.maxY + 18, width: b.width - 40, height: 44)
        torchBtn.frame = CGRect(x: (b.width - 110) / 2, y: aimBox.minY - 56, width: 110, height: 40)

        resultCard.frame = CGRect(x: 20, y: b.height - safeBottom - 168, width: b.width - 40, height: 72)
        resultTitle.frame = CGRect(x: 16, y: 14, width: resultCard.bounds.width - 32, height: 20)
        resultSub.frame = CGRect(x: 16, y: 38, width: resultCard.bounds.width - 32, height: 18)

        view.viewWithTag(901)?.frame = CGRect(x: 20, y: b.height - safeBottom - 90, width: b.width - 40, height: 40)
        view.viewWithTag(902)?.frame = CGRect(x: 20, y: b.height - safeBottom - 48, width: b.width - 40, height: 40)

        // FRAMED HERE AND NOWHERE ELSE. layoutOverlay re-lays every pass precisely so a rotation
        // cannot strand a view at the old geometry; anything framed in buildOverlay is in the wrong
        // place after one turn of the phone. `safeTop` was computed and then discarded (`_ = safeTop`)
        // — the chip is what it was always for.
        countChip.frame = CGRect(x: b.width - 20 - 104, y: safeTop + 12, width: 104, height: 32)
        // The strip sits in the free band between the hint and the result card, so it displaces
        // nothing: on a 393x852 with a 34pt inset the hint ends ~544 and the card starts ~650.
        let stripH: CGFloat = 72
        strip.frame = CGRect(x: 20, y: resultCard.frame.minY - stripH - 12, width: b.width - 40, height: stripH)
        layoutStripCells()
    }

    /// Lays the cells inside the strip. Separate from layoutOverlay because the cell COUNT changes
    /// on every read while the strip's own frame only changes on rotation.
    private func layoutStripCells() {
        let cw: CGFloat = 150, gap: CGFloat = 8
        for (i, cell) in stripCells.enumerated() {
            cell.frame = CGRect(x: CGFloat(i) * (cw + gap), y: 0, width: cw, height: strip.bounds.height)
        }
        strip.contentSize = CGSize(width: max(0, CGFloat(stripCells.count) * (cw + gap) - gap),
                                   height: strip.bounds.height)
    }

    /// Applies the full queue the JS owns. Rebuilds the cells rather than diffing: the array is at
    /// most a trolley's worth, and a diff is a second source of truth about what is on screen.
    func applyQueue(_ items: [[String: Any]]) {
        queue = items
        stripCells.forEach { $0.removeFromSuperview() }
        stripCells.removeAll()

        let n = items.reduce(0) { $0 + (($1["n"] as? Int) ?? 1) }
        countChip.text = n == 1 ? "1 kept" : "\(n) kept"
        countChip.isHidden = n == 0
        strip.isHidden = items.isEmpty
        // A BUTTON WITH A VISIBLE OBJECT IS A DIFFERENT BUTTON. "Done" asks you to remember what you
        // are finishing; "Done · 3 items" tells you what it is about to do with them.
        if continuous {
            cancelBtn?.setTitle(n == 0 ? "Done" : (n == 1 ? "Done · 1 item" : "Done · \(n) items"), for: .normal)
        }

        // NEWEST FIRST. The thing just scanned is the thing being checked, so it must not require a
        // scroll to see.
        for (i, it) in items.enumerated().reversed() {
            let name = (it["name"] as? String) ?? "Unknown"
            let cal  = it["cal"] as? Int
            let qty  = (it["n"] as? Int) ?? 1
            let cell = UIView()
            cell.backgroundColor = UIColor.black.withAlphaComponent(0.58)
            cell.layer.cornerRadius = 12
            cell.layer.borderWidth = 1
            cell.layer.borderColor = UIColor.white.withAlphaComponent(0.16).cgColor
            cell.clipsToBounds = true

            // A LETTER TILE RATHER THAN AN EMPTY SQUARE. The product image is fetched asynchronously
            // and may never arrive — no network, no image on the record, a slow shop wifi — and a
            // blank hole reads as broken where a letter reads as "this one".
            let tile = UILabel(frame: CGRect(x: 10, y: 12, width: 48, height: 48))
            tile.text = String(name.prefix(1)).uppercased()
            tile.textColor = .white
            tile.font = .systemFont(ofSize: 20, weight: .semibold)
            tile.textAlignment = .center
            tile.backgroundColor = UIColor.white.withAlphaComponent(0.12)
            tile.layer.cornerRadius = 8
            tile.clipsToBounds = true
            cell.addSubview(tile)

            let t = UILabel(frame: CGRect(x: 66, y: 13, width: 74, height: 18))
            // TRUNCATE, NEVER WRAP — this repo's own rule for a row title, and a wrapped product
            // name would push the calorie line out of a 72pt cell.
            t.text = qty > 1 ? "\(name) ×\(qty)" : name
            t.textColor = .white
            t.font = .systemFont(ofSize: 13, weight: .semibold)
            t.lineBreakMode = .byTruncatingTail
            cell.addSubview(t)

            let sub = UILabel(frame: CGRect(x: 66, y: 33, width: 74, height: 16))
            sub.text = cal != nil ? "\(cal!) cal/100g" : "no figure"
            sub.textColor = UIColor.white.withAlphaComponent(0.72)
            sub.font = .systemFont(ofSize: 11, weight: .regular)
            sub.lineBreakMode = .byTruncatingTail
            cell.addSubview(sub)

            // REMOVE IN THE AISLE, NOT IN THE DIARY. A mis-scan caught over the trolley costs one
            // tap; the same mis-scan caught later costs a serving sheet, a confirm and a delete.
            let x = UIButton(type: .system)
            x.frame = CGRect(x: 150 - 30, y: 4, width: 26, height: 26)
            x.setTitle("×", for: .normal)
            x.setTitleColor(UIColor.white.withAlphaComponent(0.8), for: .normal)
            x.titleLabel?.font = .systemFont(ofSize: 18, weight: .medium)
            x.tag = 5000 + i
            x.addTarget(self, action: #selector(removeFromQueue(_:)), for: .touchUpInside)
            cell.addSubview(x)

            strip.addSubview(cell)
            stripCells.append(cell)
            if let u = it["img"] as? String, !u.isEmpty { loadThumb(u, into: tile) }
        }
        layoutStripCells()
        strip.setContentOffset(.zero, animated: false)
    }

    @objc private func removeFromQueue(_ sender: UIButton) {
        let idx = sender.tag - 5000
        guard idx >= 0 && idx < queue.count else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        onQueueRemove?(idx)
    }

    /// Fetches a product thumbnail. NEVER blocks the preview and never fails loudly: the letter tile
    /// underneath is already a correct answer, so a dropped image costs nothing.
    private func loadThumb(_ urlStr: String, into tile: UILabel) {
        guard let u = URL(string: urlStr) else { return }
        URLSession.shared.dataTask(with: u) { data, _, _ in
            guard let d = data, let img = UIImage(data: d) else { return }
            DispatchQueue.main.async {
                guard tile.superview != nil else { return }   // the cell was rebuilt while we waited
                let iv = UIImageView(frame: tile.bounds)
                iv.image = img
                iv.contentMode = .scaleAspectFill
                iv.clipsToBounds = true
                iv.layer.cornerRadius = 8
                tile.text = ""
                tile.addSubview(iv)
            }
        }.resume()
    }

    /// THE BOX IS THE SCANNER. Without this AVFoundation reads the whole frame, so the aiming frame was
    /// decoration and a barcode on the next product along could win the race. The conversion must go
    /// through the preview layer: `rectOfInterest` is in the capture device's own rotated, normalised
    /// space, not the view's, and hand-computing it is the usual way this ends up subtly wrong.
    private func applyRectOfInterest() {
        guard let preview = preview, let output = metadataOutput, aimBox != .zero else { return }
        let roi = preview.metadataOutputRectConverted(fromLayerRect: aimBox)
        guard roi.width > 0, roi.height > 0,
              roi.minX >= 0, roi.minY >= 0, roi.maxX <= 1.0001, roi.maxY <= 1.0001 else { return }
        output.rectOfInterest = roi
    }

    // MARK: gestures

    private func addGestures() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(tapToFocus(_:)))
        view.addGestureRecognizer(tap)
        let pinch = UIPinchGestureRecognizer(target: self, action: #selector(pinchToZoom(_:)))
        view.addGestureRecognizer(pinch)
    }

    @objc private func tapToFocus(_ g: UITapGestureRecognizer) {
        guard let device = device, let preview = preview else { return }
        let p = g.location(in: view)
        // Ignore taps that land on a control, or the focus fights the button.
        if let hit = view.hitTest(p, with: nil), hit is UIButton { return }
        let devicePoint = preview.captureDevicePointConverted(fromLayerPoint: p)
        do {
            try device.lockForConfiguration()
            if device.isFocusPointOfInterestSupported { device.focusPointOfInterest = devicePoint }
            // .autoFocus focuses ONCE and then holds, which is right for a photo and wrong for a
            // scanner: the next product never comes into focus and the camera looks broken. Return to
            // continuous after the tap, so the aim is a nudge rather than a lock.
            if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
            else if device.isFocusModeSupported(.autoFocus) { device.focusMode = .autoFocus }
            if device.isExposurePointOfInterestSupported { device.exposurePointOfInterest = devicePoint }
            if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
            else if device.isExposureModeSupported(.autoExpose) { device.exposureMode = .autoExpose }
            device.unlockForConfiguration()
        } catch { return }
        focusRing.frame = CGRect(x: p.x - 36, y: p.y - 36, width: 72, height: 72)
        focusRing.alpha = 1
        UIView.animate(withDuration: 0.45, delay: 0.15, options: [], animations: { self.focusRing.alpha = 0 })
    }

    private var zoomAtPinchStart: CGFloat = 1

    @objc private func pinchToZoom(_ g: UIPinchGestureRecognizer) {
        guard let device = device else { return }
        if g.state == .began { zoomAtPinchStart = device.videoZoomFactor }
        guard g.state == .changed || g.state == .began else { return }
        // Clamped to what the ACTIVE FORMAT allows. Going past it throws, and 6x is past the point a
        // barcode stays readable anyway.
        let maxUseful = min(device.activeFormat.videoMaxZoomFactor, 6.0)
        let want = max(device.minAvailableVideoZoomFactor, min(zoomAtPinchStart * g.scale, maxUseful))
        do {
            try device.lockForConfiguration()
            device.videoZoomFactor = want
            device.unlockForConfiguration()
        } catch { return }
    }

    @objc private func toggleTorch() {
        guard let device = device, device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            let on = device.torchMode == .on
            device.torchMode = on ? .off : .on
            torchBtn.backgroundColor = on ? UIColor.white.withAlphaComponent(0.16) : gold.withAlphaComponent(0.85)
            torchBtn.setTitleColor(on ? .white : .black, for: .normal)
            device.unlockForConfiguration()
        } catch { return }
    }

    /// The JS asking us to close (they tapped Done in a web sheet, or the diary navigated away).
    func dismissFromJS() { finish(nil) }

    @objc private func cancelTapped() { finish(nil) }
    @objc private func manualTapped() { finish("__manual__") }

    // MARK: reads

    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !finished,
              let obj = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = obj.stringValue else { return }
        let digits = value.filter { $0.isNumber }
        // A product barcode is at least 8 digits (EAN-8). Anything shorter is a misread or a different
        // kind of code entirely, and looking it up would just waste the person's time.
        guard digits.count >= 8 else { return }

        if continuous {
            // DEBOUNCE THE SAME PRODUCT. The delegate fires many times a second while a barcode is in
            // view, and without this one tin would be logged repeatedly while they held the phone still.
            // LATCH, DO NOT RE-ARM. Writing `lastReadAt = now` on every frame kept pushing the
            // window forward only while the code kept matching — but the delegate fires many times a
            // second, so the moment the person held still for 2.5s the same tin queued AGAIN, and
            // again, and the trolley filled with duplicates of one product. The stamp is set ONCE per
            // distinct code and only cleared when a DIFFERENT code is seen, so one product in view is
            // one read no matter how long they hold it there.
            let now = Date()
            if digits == lastCode { return }
            if now.timeIntervalSince(lastReadAt) < 0.4 { return }   // debounce a genuine re-aim
            lastCode = digits
            lastReadAt = now
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            flashFound()
            present(result: "Looking up…", sub: digits, ok: true)
            onContinuousRead?(digits)
            return
        }

        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        finish(digits)
    }

    /// Called from the plugin once the JS has looked the code up, so the answer appears over the
    /// viewfinder instead of replacing it.
    func present(result: String, sub: String, ok: Bool) {
        resultTitle.text = result
        resultSub.text = sub
        resultCard.layer.borderColor = (ok ? gold : UIColor.systemRed).withAlphaComponent(0.6).cgColor
        resultCard.alpha = 0
        UIView.animate(withDuration: 0.18) { self.resultCard.alpha = 1 }
    }

    private func flashFound() {
        aim.layer.borderColor = UIColor.white.cgColor
        aim.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        UIView.animate(withDuration: 0.35) {
            self.aim.layer.borderColor = self.gold.cgColor
            self.aim.backgroundColor = .clear
        }
    }

    // MARK: lifecycle

    private func finish(_ code: String?) {
        guard !finished else { return }
        finished = true
        // The torch is the device's, not ours — leaving it on would burn their battery after we are gone.
        // THE LOCK MUST SUCCEED BEFORE THE WRITE. Written as three statements on one line, a failed
        // lock still fell through to `torchMode = .off` and `unlockForConfiguration()` — configuring
        // and unlocking a device we do not hold, which throws an NSException Swift cannot catch.
        if let d = device, d.hasTorch, d.torchMode == .on {
            do { try d.lockForConfiguration(); d.torchMode = .off; d.unlockForConfiguration() }
            catch { /* someone else holds it; it will be released with the session */ }
        }
        if session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.session.stopRunning() }
        }
        releaseLifecycleObservers()
        if BarcodeScanViewController.live === self { BarcodeScanViewController.live = nil }
        let cb = onResult
        onResult = nil
        onContinuousRead = nil
        onQueueRemove = nil
        dismiss(animated: true) { cb?(code) }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Swipe-to-dismiss or any other exit must still release the camera and answer the promise, or
        // the JS awaits forever and the scan button appears dead from then on.
        if !finished { finish(nil) }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
}
