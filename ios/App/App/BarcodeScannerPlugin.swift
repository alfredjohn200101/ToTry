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
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

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
                vc.onResult = { code in
                    if let code = code {
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

/// The camera screen. Deliberately plain: a live preview, a cut-out frame to aim with, one line of
/// instruction and a Cancel button. Nothing to learn, nothing to tap before it works.
class BarcodeScanViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {

    var onResult: ((String?) -> Void)?

    private let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?
    private var finished = false          // one result only, ever
    private let hint = UILabel()

    /// UPC-A arrives as EAN-13 with a leading zero, which is why it is not listed separately.
    private let formats: [AVMetadataObject.ObjectType] = [
        .ean13, .ean8, .upce, .code128, .code39, .code39Mod43, .code93, .itf14, .interleaved2of5
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            finish(nil); return
        }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { finish(nil); return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        // Must be set AFTER addOutput — before it, availableMetadataObjectTypes is empty and this traps.
        output.metadataObjectTypes = formats.filter { output.availableMetadataObjectTypes.contains($0) }

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.addSublayer(layer)
        preview = layer

        addOverlay()
        // startRunning blocks; keeping it off the main thread stops the present animation stuttering.
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.session.startRunning() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    private func addOverlay() {
        let dim = UIView(frame: view.bounds)
        dim.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        dim.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(dim)

        // A landscape window, because that is the shape of a barcode.
        let w = min(view.bounds.width - 56, 340)
        let box = CGRect(x: (view.bounds.width - w) / 2, y: view.bounds.height * 0.36, width: w, height: w * 0.62)
        let mask = CALayer()
        let path = UIBezierPath(rect: dim.bounds)
        path.append(UIBezierPath(roundedRect: box, cornerRadius: 14).reversing())
        let shape = CAShapeLayer()
        shape.path = path.cgPath
        mask.addSublayer(shape)
        dim.layer.mask = shape

        let frame = UIView(frame: box)
        frame.layer.borderColor = UIColor(red: 0.78, green: 0.66, blue: 0.43, alpha: 1).cgColor  // the app's gold
        frame.layer.borderWidth = 2
        frame.layer.cornerRadius = 14
        view.addSubview(frame)

        hint.text = "Point at the barcode"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 15, weight: .medium)
        hint.textAlignment = .center
        hint.frame = CGRect(x: 20, y: box.maxY + 22, width: view.bounds.width - 40, height: 24)
        view.addSubview(hint)

        let cancel = UIButton(type: .system)
        cancel.setTitle("Cancel", for: .normal)
        cancel.setTitleColor(.white, for: .normal)
        cancel.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        cancel.frame = CGRect(x: 20, y: view.bounds.height - 96, width: view.bounds.width - 40, height: 50)
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        view.addSubview(cancel)
    }

    @objc private func cancelTapped() { finish(nil) }

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
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        finish(digits)
    }

    private func finish(_ code: String?) {
        guard !finished else { return }
        finished = true
        if session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.session.stopRunning() }
        }
        let cb = onResult
        onResult = nil
        dismiss(animated: true) { cb?(code) }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Swipe-to-dismiss or any other exit must still release the camera and answer the promise, or
        // the JS awaits forever and the scan button appears dead from then on.
        if !finished { finish(nil) }
    }
}
