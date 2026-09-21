const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const src = path.join(__dirname, "..", "public", "images", "brand", "logo.png");
const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

async function makeIcon(size, fileName, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const outPath = path.join(outDir, fileName);
  await sharp({ create: { width: size, height: size, channels: 4, background: "#FFF8F0" } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
  console.log("wrote", outPath);
}

(async () => {
  await makeIcon(192, "icon-192.png", 0.14);
  await makeIcon(512, "icon-512.png", 0.14);
  await makeIcon(180, "apple-touch-icon.png", 0.12);
  // Maskable icons get cropped to a circle/rounded-square by the OS, so the
  // logo needs more padding to stay inside that safe zone.
  await makeIcon(512, "icon-512-maskable.png", 0.22);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
