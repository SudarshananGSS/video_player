import sharp from "sharp";

const RASTER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TARGET_WIDTH = 1200;

// Email clients (Outlook especially) don't reliably support SVG in <img>
// tags. Anything not already a widely-supported raster format gets
// rasterized to PNG so it always renders in an email.
export async function ensureRasterImage(
  body: ArrayBuffer,
  contentType: string | null,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (contentType && RASTER_TYPES.has(contentType)) {
    return { buffer: Buffer.from(body), contentType };
  }

  const buffer = Buffer.from(body);

  // SVGs often declare a small intrinsic size (e.g. 50x50). Rasterizing at
  // the default density and then upscaling the resulting bitmap would look
  // blurry, so probe the natural size first and pick a density that renders
  // the vector directly at ~TARGET_WIDTH instead.
  const { width: naturalWidth } = await sharp(buffer).metadata();
  const density = naturalWidth
    ? Math.min(2400, Math.max(72, Math.round(72 * (TARGET_WIDTH / naturalWidth))))
    : 300;

  const png = await sharp(buffer, { density })
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .png()
    .toBuffer();

  return { buffer: png, contentType: "image/png" };
}
