import Foundation
import Capacitor
import UIKit

/// Hands a file to the iOS share sheet.
///
/// WHY THIS EXISTS: every "save this" path in the app used the web pattern —
/// `URL.createObjectURL(blob)` then a synthetic click on an `<a download>`. That works in a browser and
/// does NOTHING in a WKWebView: downloads there require a `WKDownloadDelegate` (iOS 14.5+), and
/// Capacitor's default bridge does not install one. So in the App Store build, tapping Export produced
/// no file, no error and no explanation. That silently broke:
///   · Settings → Your data → Export  (the app's whole data-custody promise, and privacy.html says
///     "Export everything")
///   · the CSV exports (journal, wins, training)
///   · the progress collage and the shareable day card
///
/// The share sheet is also strictly better than a download on iOS: it can save to Files, AirDrop, message
/// it, or open it in another app — one action instead of "downloaded, now go find it".
///
/// Deliberately dumb: it takes bytes and a filename, writes them to a temp file, and presents the sheet.
/// It knows nothing about what is inside, so there is one path for JSON, CSV and PNG alike.
@objc(ShareFilePlugin)
public class ShareFilePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareFilePlugin"
    public let jsName = "ShareFile"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    /// share({ filename, base64, title? })
    ///
    /// base64 rather than a string, so the same call handles a PNG and a JSON file without the JS side
    /// having to care. Written to the temp directory: iOS clears it, and a backup of someone's journal
    /// should not linger in app storage after they have saved it where they want it.
    @objc func share(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"), !base64.isEmpty else {
            call.reject("Nothing to share"); return
        }
        let filename = call.getString("filename") ?? "totry-export"
        // Strip a data: prefix if the caller passed a whole data URL — easy mistake, cheap to absorb.
        let raw = base64.contains(",") ? String(base64.split(separator: ",").last ?? "") : base64
        guard let data = Data(base64Encoded: raw, options: .ignoreUnknownCharacters) else {
            call.reject("Could not decode the file"); return
        }

        let url = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        do { try data.write(to: url, options: .atomic) }
        catch { call.reject("Could not write the file: \(error.localizedDescription)"); return }

        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else {
                call.reject("No view controller to present from"); return
            }
            let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
            if let title = call.getString("title") { sheet.setValue(title, forKey: "subject") }

            // iPad presents this as a popover and CRASHES without an anchor. Centre of the presenting
            // view is the honest anchor when the tap came from inside the web view and we do not have
            // its coordinates.
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 1, height: 1)
                pop.permittedArrowDirections = []
            }

            sheet.completionWithItemsHandler = { _, completed, _, _ in
                // Tidy up either way — a cancelled share should not leave the file behind.
                try? FileManager.default.removeItem(at: url)
                call.resolve(["ok": true, "completed": completed])
            }
            vc.present(sheet, animated: true)
        }
    }
}
