import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

/*
 * Guards the two facts the install prompt depends on: the manifest is
 * standalone and rooted at the site, and it references the icons that actually
 * ship. See docs/roadmap/pwa-media-session.md.
 */
describe("web app manifest", () => {
  it("is installable and rooted at the site", () => {
    const result = manifest();
    expect(result.name).toBe("Podplayer");
    expect(result.short_name).toBe("Podplayer");
    expect(result.start_url).toBe("/");
    expect(result.scope).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.background_color).toBe("#f1ead9");
    expect(result.theme_color).toBe("#f1ead9");
  });

  it("references the two existing icons", () => {
    const sources = manifest().icons?.map((icon) => icon.src) ?? [];
    expect(sources).toContain("/icon.svg");
    expect(sources).toContain("/apple-icon.png");
  });
});
