// Generates the PWA icon set from the Dijla mark (REDESIGN_V2_SPEC §3) — a
// flowing river line above a bowl. Re-run after editing the mark: npm run icons
import sharp from "sharp";
import fs from "node:fs";

const OUT = "./public/icons";
const BRAND = "#047857"; // emerald-700, the light-mode brand
const INK = "#ffffff"; // brand-foreground on the tile

/**
 * The mark on a 100×100 tile — the same geometry as the LogoMark component.
 * @param rounded rounded tile corners (standard) vs square full-bleed (maskable)
 * @param inset   padding fraction so the mark clears a maskable safe area
 */
function svg({ rounded, inset }) {
  const scale = 1 - inset * 2;
  const t = 100 * inset;
  const mark = `
    <g transform="translate(${t} ${t}) scale(${scale})">
      <path d="M26 44c9-7 14 4 24 0s15-8 24-1" stroke="${INK}" stroke-width="5.5"
            stroke-linecap="round" fill="none" opacity="0.55"/>
      <path d="M24 56c0 12 11 20 26 20s26-8 26-20z" fill="${INK}"/>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
    <rect width="100" height="100" ${rounded ? 'rx="24"' : ""} fill="${BRAND}"/>
    ${mark}
  </svg>`;
}

const standard = Buffer.from(svg({ rounded: true, inset: 0 }));
// Maskable icons are cropped to a shape by the launcher, so the mark sits inside
// the middle ~80% and the emerald is full bleed to the edges.
const maskable = Buffer.from(svg({ rounded: false, inset: 0.12 }));

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
