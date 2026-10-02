import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Token and component discipline, enforced instead of merely documented.
 *
 * `react/forbid-elements` keeps raw form elements inside the base component
 * folder, and `no-restricted-syntax` keeps three skin-hostile class patterns out
 * of className strings. Both rules are described in ARCHITECTURE.md §5 and in
 * frontend/components/base/README.md; they exist so the documentation cannot
 * quietly rot.
 */

/**
 * One entry per banned className pattern. `pattern` is an esquery regex literal
 * (slashes included) and is applied to the three shapes a className string takes
 * in this codebase: a JSX string literal, a string literal inside a JSX
 * expression container, and a template literal.
 */
const CLASSNAME_BANS = [
  {
    pattern: "/rounded-(?!base|full)/",
    message:
      "intermediate border radii are banned: use rounded-base for rectangular surfaces or rounded-full for focal circles (see docs/DECISIONS.md entry 6)",
  },
  {
    pattern: "/(text|bg)-fg\\//",
    message:
      "use the muted token instead of an opacity utility on the foreground: text-fg/70 is text-muted (see docs/DECISIONS.md entry 7)",
  },
  {
    pattern: "/outline-accent/",
    message:
      "focus outlines use the cta token: outline-accent is outline-cta (see docs/DECISIONS.md entry 5)",
  },
];

const classNameBanRules = CLASSNAME_BANS.flatMap(({ pattern, message }) => [
  { selector: `JSXAttribute[name.name="className"][value.value=${pattern}]`, message },
  {
    selector: `JSXAttribute[name.name="className"][value.expression.value=${pattern}]`,
    message,
  },
  {
    selector: `JSXAttribute[name.name="className"] TemplateElement[value.raw=${pattern}]`,
    message,
  },
]);

/** Both rules share one level, so they cannot drift apart. */
const ENFORCEMENT = "error";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.tsx"],
    rules: {
      "react/forbid-elements": [
        ENFORCEMENT,
        {
          forbid: [
            {
              element: "button",
              message:
                "use BaseButton from frontend/components/base/ (ARCHITECTURE.md §5.4)",
            },
            {
              element: "input",
              message:
                "use BaseInput from frontend/components/base/ (ARCHITECTURE.md §5.4)",
            },
            {
              element: "select",
              message:
                "use BaseSelect from frontend/components/base/ (ARCHITECTURE.md §5.4)",
            },
          ],
        },
      ],
      "no-restricted-syntax": [ENFORCEMENT, ...classNameBanRules],
    },
  },
  {
    /*
     * Every <img> in this app is third-party feed artwork: the podcast cover and
     * the episode artwork come from whichever host publishes the feed.
     * next/image cannot optimize them under output: 'export' (no image
     * optimizer is built), and listing every host in next.config.ts would not
     * help because the hosts are arbitrary.
     *
     * The rule is off rather than per-file so the next <img> does not
     * re-litigate the same decision. A local static image, if one is ever added
     * to public/, should still use next/image with explicit width and height;
     * the comment here is not a licence for that.
     */
    files: ["**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    /*
     * The base components are the one place raw elements may appear: they are
     * what the rule above points callers at.
     */
    files: ["components/base/**/*.tsx"],
    rules: {
      "react/forbid-elements": "off",
    },
  },
]);

export default eslintConfig;
