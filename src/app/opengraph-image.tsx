import { ImageResponse } from "next/og";

// The card that previews when a Dijla link is shared (WhatsApp, etc.).
// REDESIGN_V2_SPEC §3. The Arabic name and pitch ride in the OG title/description
// metadata; the image itself is the mark + the Latin wordmark, which needs no
// bundled font (satori has no Arabic face, and the self-hosted Cairo is woff2,
// which it cannot load).

export const alt = "دجلة — Dijla";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#047857";

// The mark in white on transparent, embedded as a data URI (satori renders it
// as an <img>). Same geometry as the LogoMark component.
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M26 44c9-7 14 4 24 0s15-8 24-1" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" fill="none" opacity="0.55"/>
  <path d="M24 56c0 12 11 20 26 20s26-8 26-20z" fill="#ffffff"/>
</svg>`;
const markUri = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString("base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={240} height={240} src={markUri} alt="" />
        <div
          style={{
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: "0.18em",
            marginTop: 16,
            // letter-spacing pushes the block right; nudge it back to centre
            paddingInlineStart: "0.18em",
          }}
        >
          DIJLA
        </div>
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 12 }}>
          Commission-free ordering for restaurants
        </div>
      </div>
    ),
    size
  );
}
