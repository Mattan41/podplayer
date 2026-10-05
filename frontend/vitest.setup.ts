/*
 * Test setup: extends Vitest's `expect` with the jest-dom matchers, so a test
 * can assert on the DOM the way the rest of the ecosystem expects.
 */
import "@testing-library/jest-dom/vitest";

/*
 * `lib/supabase.ts` builds a client at module load and throws "supabaseUrl is
 * required" when the two public identifiers are absent. Vitest does not read
 * `.env.local`, so any test that imports the player (which now reaches the API
 * layer through `PlaybackSource`) would fail before it ran. These are the
 * public, non-secret `NEXT_PUBLIC_*` values, set only if the environment has not
 * supplied real ones. No test reaches the network: the API tests mock the
 * client, and a real one with these values simply reports no session.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost/supabase";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
