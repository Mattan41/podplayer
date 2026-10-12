import type { MetadataRoute } from "next";

/**
 * The web app manifest, emitted as `manifest.webmanifest` next to the HTML by
 * the static export (see docs/roadmap/pwa-media-session.md).
 *
 * It makes the site installable: a name, a start URL, `standalone` display so
 * an installed copy opens without browser chrome, and the two existing icons.
 *
 * The two colours are the light-mode Zorn background token, written as literals
 * because a web manifest is JSON and cannot reference the CSS custom properties
 * that carry the tokens. The values must be kept in step with
 * `frontend/app/globals.css` by hand; see docs/DECISIONS.md entry 45.
 */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Podplayer",
    short_name: "Podplayer",
    description: "A disciplined, cross-device podcast player.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f1ead9",
    theme_color: "#f1ead9",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        type: "image/png",
      },
    ],
  };
}
