// Extracts text from the hackathon's KYC specimen images with Apple Vision (macOS).
// Usage: swift scripts/ocr_specimens.swift <kyc_documents dir> > src/data/kyc_ocr.json
// Output: { "K01_gst_certificate": [[text, x, y, w, h, confidence], ...], ... }
// Boxes are fractions of the page with y measured from the top, so src/engine/kyc.ts can pair labels with values.
import Foundation
import Vision
import AppKit

let dir = URL(fileURLWithPath: CommandLine.arguments[1])
let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension == "png" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
var out: [String: [[Any]]] = [:]

/// The specimens carry a light pink "SYNTHETIC SPECIMEN" watermark across the values. Keep only dark ink so it doesn't confuse OCR.
func dropWatermark(_ img: CGImage) -> CGImage? {
  let w = img.width, h = img.height
  var px = [UInt8](repeating: 0, count: w * h * 4)
  guard let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  for i in stride(from: 0, to: px.count, by: 4) {
    let lum = 0.299 * Double(px[i]) + 0.587 * Double(px[i + 1]) + 0.114 * Double(px[i + 2])
    let v: UInt8 = lum < 140 ? 0 : 255
    px[i] = v; px[i + 1] = v; px[i + 2] = v
  }
  return ctx.makeImage()
}
for f in files {
  guard let img = NSImage(contentsOf: f), let src = img.cgImage(forProposedRect: nil, context: nil, hints: nil), let cg = dropWatermark(src) else { continue }
  let req = VNRecognizeTextRequest()
  req.recognitionLevel = .accurate
  req.usesLanguageCorrection = false
  try VNImageRequestHandler(cgImage: cg).perform([req])
  let r3 = { (v: CGFloat) in (Double(v) * 1000).rounded() / 1000 }
  out[f.deletingPathExtension().lastPathComponent] = (req.results ?? []).compactMap { o in
    guard let c = o.topCandidates(1).first else { return nil }
    let b = o.boundingBox
    return [c.string, r3(b.minX), r3(1 - b.maxY), r3(b.width), r3(b.height), r3(CGFloat(c.confidence))]
  }
}
let data = try JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
