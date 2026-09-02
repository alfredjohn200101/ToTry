// PNG frame sequence → H.264 .mp4, using AVFoundation.
//
// WHY THIS EXISTS: Playwright records webm (VP8) and bundles an ffmpeg built --disable-everything —
// libvpx_vp8 and png only, no H.264 encoder and no mp4 muxer. So the recorder could never produce the
// .mp4 its own header promised; it silently emitted webm instead. There is no ffmpeg on this machine
// and no Homebrew to install one, so this encodes with what macOS already has.
//
// record-reels.js prefers a real ffmpeg whenever one is on PATH and only falls back to this. If you
// ever `brew install ffmpeg`, this stops being used automatically — nothing to undo.
//
//   swiftc -O scripts/png2mp4.swift -o build/png2mp4
//   build/png2mp4 <frames-dir> <fps> <out.mp4>

import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

func die(_ m: String) -> Never { FileHandle.standardError.write(("png2mp4: " + m + "\n").data(using: .utf8)!); exit(1) }

let args = CommandLine.arguments
guard args.count == 4, let fps = Int32(args[2]) else { die("usage: png2mp4 <frames-dir> <fps> <out.mp4>") }
let dir = args[1], outPath = args[3]

let frames = ((try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? [])
    .filter { $0.hasSuffix(".png") }.sorted()
guard !frames.isEmpty else { die("no .png frames in \(dir)") }

// Size comes from the first frame; every frame in a Playwright recording shares it.
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + frames[0]) as CFURL, nil),
      let first = CGImageSourceCreateImageAtIndex(src, 0, nil) else { die("cannot read \(frames[0])") }
let w = first.width, h = first.height

try? FileManager.default.removeItem(atPath: outPath)
guard let writer = try? AVAssetWriter(outputURL: URL(fileURLWithPath: outPath), fileType: .mp4) else { die("cannot create writer") }
writer.shouldOptimizeForNetworkUse = true   // moov atom up front, the +faststart equivalent

let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: w,
    AVVideoHeightKey: h,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: 12_000_000,          // generous: these are re-encoded in the edit
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoAllowFrameReorderingKey: true,
    ],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
    kCVPixelBufferWidthKey as String: w,
    kCVPixelBufferHeightKey as String: h,
])
guard writer.canAdd(input) else { die("writer rejected the video input") }
writer.add(input)
guard writer.startWriting() else { die("startWriting failed: \(writer.error?.localizedDescription ?? "unknown")") }
writer.startSession(atSourceTime: .zero)

let cs = CGColorSpaceCreateDeviceRGB()
var i: Int64 = 0
for name in frames {
    guard let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: dir + "/" + name) as CFURL, nil),
          let img = CGImageSourceCreateImageAtIndex(s, 0, nil) else { die("cannot read frame \(name)") }
    guard let pool = adaptor.pixelBufferPool else { die("no pixel buffer pool") }
    var pbOut: CVPixelBuffer?
    guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pbOut) == kCVReturnSuccess, let pb = pbOut else { die("no pixel buffer") }
    CVPixelBufferLockBaseAddress(pb, [])
    if let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb), width: w, height: h,
                           bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: cs,
                           bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) {
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    }
    CVPixelBufferUnlockBaseAddress(pb, [])

    // Back-pressure: the encoder is slower than the disk, so wait rather than dropping frames.
    while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
    if !adaptor.append(pb, withPresentationTime: CMTime(value: i, timescale: fps)) {
        die("append failed at frame \(i): \(writer.error?.localizedDescription ?? "unknown")")
    }
    i += 1
}

input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { die("finish failed: \(writer.error?.localizedDescription ?? "unknown")") }
print("\(i) frames -> \(outPath) (\(w)x\(h) @ \(fps)fps)")
