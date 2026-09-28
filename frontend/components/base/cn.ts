/**
 * Joins class names, skipping falsy values.
 *
 * Deliberately a plain join rather than a conflict-resolving merger such as
 * tailwind-merge. Base components must not set classes that callers are expected
 * to override, so a conflict between a component class and a caller class should
 * never be produced in the first place. See README.md, "Base components must not
 * set classes that callers are expected to override".
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
