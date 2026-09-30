import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "./header";
import WakingNotice from "./waking-notice";
import { AuthProvider } from "@/lib/auth-context";
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
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <WakingNotice />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

