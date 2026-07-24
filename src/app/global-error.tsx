"use client";

/**
 * Last-resort boundary for a crash in the root layout itself.
 *
 * This replaces the whole document, so it must render its own <html>/<body> and
 * cannot rely on the i18n provider, fonts or globals.css — those live in the
 * layout that just failed. Hence inline styles and a bilingual message: it only
 * appears when everything else is gone, and it must not itself depend on
 * anything that could be the thing that broke.
 *
 * This is the one deliberate exception to "no literal hex in components": the
 * stylesheet defining the tokens is exactly what is unavailable here, so the
 * REDESIGN_V2_SPEC §1 light values are inlined by hand.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#1c1917",
          background: "#fafaf9",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          حدث خطأ ما · Something went wrong
        </h1>
        <p style={{ color: "#78716c", maxWidth: "22rem", margin: 0 }}>
          تعذّر تحميل التطبيق. حاول مرة أخرى.
          <br />
          The app could not load. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.6rem 1.25rem",
            fontSize: "1rem",
            fontWeight: 600,
            color: "#fff",
            background: "#047857",
            cursor: "pointer",
          }}
        >
          إعادة المحاولة · Try again
        </button>
      </body>
    </html>
  );
}
