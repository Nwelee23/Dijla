// Generates the PWA icon set from an inline SVG. Placeholder art — swap the
// river mark for the real logo later and re-run: npm run icons
import sharp from "sharp";
import fs from "node:fs";

const OUT = "./public/icons";
const BRAND = "#008383";

/** @param inset 0 = full bleed (maskable), higher = more padding */
function svg({ rounded, inset }) {
  const S = 512;
  const scale = 1 - inset * 2;
  // One bold S-curve. Anything finer disappears at 192px on a phone.
  const river = `
    <g transform="translate(${S * inset} ${S * inset}) scale(${scale})">
      <path d="M256 48 C 128 132, 128 216, 256 256 C 384 296, 384 380, 256 464"
            stroke="#ffffff" stroke-width="58" stroke-linecap="round" fill="none"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <rect width="${S}" height="${S}" ${rounded ? 'rx="112"' : ""} fill="${BRAND}"/>
    ${river}
  </svg>`;
}

const standard = Buffer.from(svg({ rounded: true, inset: 0 }));
// Maskable icons get cropped to a circle by the launcher, so the mark must sit
// inside the middle ~80%. Background is full bleed.
const maskable = Buffer.from(svg({ rounded: false, inset: 0.14 }));

const jobs = [
  ["icon-192.png", standard, 192],
  ["icon-512.png", standard, 512],
  ["icon-maskable-192.png", maskable, 192],
  ["icon-maskable-512.png", maskable, 512],
  ["apple-touch-icon.png", standard, 180],
];

for (const [name, src, size] of jobs) {
  await sharp(src).resize(size, size).png().toFile(`${OUT}/${name}`);
  console.log(`${name}  ${size}x${size}`);
}

// Favicon: 32px, and keep the source SVG around for future edits.
await sharp(standard).resize(32, 32).png().toFile(`${OUT}/favicon-32.png`);
fs.writeFileSync(`${OUT}/logo.svg`, svg({ rounded: true, inset: 0 }));
console.log("favicon-32.png  32x32\nlogo.svg (source)");
