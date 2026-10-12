import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "./header";
import ServiceWorkerRegister from "./service-worker-register";
import WakingNotice from "./waking-notice";
import AudioElement from "@/components/player/audio-element";
import MiniPlayer from "@/components/player/mini-player";
import PlayerAwareMain from "./player-aware-main";
import { AuthProvider } from "@/lib/auth-context";
import { PlayerProvider } from "@/lib/player-context";
import { PodcastSourceProvider } from "@/lib/podcast-source";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Podplayer",
  description: "A disciplined, cross-device podcast player.",
  // iOS reads its own tags rather than the web manifest for the standalone
  // chrome and the home-screen title. See docs/DECISIONS.md entry 45.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Podplayer",
  },
};

/**
 * The browser UI colour. Android draws it into the status bar of the installed
 * app, so it mirrors the manifest's light-mode Zorn background token. A hex
 * literal, for the same reason the manifest carries literals: neither is TSX
 * and neither can read the CSS custom properties.
 */
export const viewport: Viewport = {
  themeColor: "#f1ead9",
};

/**
 * Resolves the mode before React hydrates, on the first paint.
 *
 * This is a raw string rather than an imported module because it must run
 * synchronously while the browser parses `<head>`, before any bundle has
 * been fetched. It reads the persisted preference, falls back to
 * `prefers-color-scheme` when nothing is stored, then writes both `data-*`
 * attributes on `<html>` so the CSS token blocks apply immediately.
 *
 * The `<html>` element itself deliberately does not declare `data-theme` or
 * `data-mode` in JSX: React would overwrite the script's work during
 * hydration. The script is the only writer. See `docs/DECISIONS.md` entry 13.
 */
const THEME_INIT_SCRIPT = `(function(){var root=document.documentElement;var mode="light";try{var stored=localStorage.getItem("mode");if(stored==="light"||stored==="dark"){mode=stored;}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){mode="dark";}}catch(e){}root.dataset.theme="zorn";root.dataset.mode=mode;})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
         /* data-theme and data-mode are written by THEME_INIT_SCRIPT, not by
         React, so the server and client trees differ here by design. */
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        {/* Client child of the server layout: registers the app-shell worker in
            production only. Renders nothing. See docs/DECISIONS.md entry 42. */}
        <ServiceWorkerRegister />
        <ThemeProvider>
          <AuthProvider>
            <PodcastSourceProvider>
              <PlayerProvider>
                <Header />
                <WakingNotice />
                {/* Page content only: the wrapper reserves room for the fixed
                    player bar, and the header is deliberately outside it. */}
                <PlayerAwareMain>{children}</PlayerAwareMain>
                {/*
                  The single media element and the player surface live here, in
                  the layout, so a route change cannot unmount them and stop
                  playback. See docs/DECISIONS.md entry 26.
                */}
                <AudioElement />
                <MiniPlayer />
              </PlayerProvider>
            </PodcastSourceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

