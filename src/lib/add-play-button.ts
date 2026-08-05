import sharp from "sharp";

// Bakes a play-button overlay into the image pixels. The dashboard's grid
// shows a play button via CSS on top of an <img> tag, but that's lost once
// a thumbnail is extracted as a flat file for embedding in an email — this
// makes the same visual survive outside our own UI.
export async function addPlayButton(buffer: Buffer): Promise<Buffer> {
  const { width = 1200, height = 675 } = await sharp(buffer).metadata();

  const cx = width / 2;
  const cy = height / 2;
  const r = Math.round(Math.min(width, height) * 0.14);

  const triHalfHeight = r * 0.55;
  const triDepth = r * 0.55;
  const p1 = `${cx - triDepth * 0.6},${cy - triHalfHeight}`;
  const p2 = `${cx - triDepth * 0.6},${cy + triHalfHeight}`;
  const p3 = `${cx + triDepth * 0.75},${cy}`;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="black" fill-opacity="0.5" />
      <polygon points="${p1} ${p2} ${p3}" fill="white" />
    </svg>
  `;

  return sharp(buffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toBuffer();
}
