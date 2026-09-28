/**
 * Box styling shared by the form controls (BaseInput, BaseSelect).
 *
 * Kept in one place so the two controls cannot drift apart: adding a state such
 * as `disabled:` to one of them and forgetting the other is exactly the kind of
 * divergence that made the page-level class constants unmaintainable.
 *
 * Controls own their own padding because a control's box is intrinsic to being a
 * control. Layout classes such as `w-full` remain the caller's responsibility.
 *
 * Internal to this folder; not re-exported from index.ts.
 */
export const CONTROL_CLASS =
  "rounded-base border border-fg bg-bg px-3 py-2 text-sm text-fg focus:outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-not-allowed disabled:opacity-50";
