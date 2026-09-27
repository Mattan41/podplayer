import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Calls the Spring Boot backend with the current Supabase access token.
 *
 * The caller decides how to parse the returned response.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    throw new Error("Not authenticated");
  }

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(`${API_URL}${path}`, { ...init, headers });
}
