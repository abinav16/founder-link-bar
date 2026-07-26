import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side admin check.
 *
 * The /admin route previously gated only in the browser (comparing the
 * signed-in email in client JS), which any signed-in user could step over in
 * devtools to render the console shell. This resolves the question on the
 * server from a verified bearer token, so the answer can't be faked locally.
 *
 * Deliberately does NOT use the shared `requireSupabaseAuth` middleware: that
 * middleware throws on a missing/!invalid token, and the global error
 * middleware turns the throw into a 500 HTML page (blank screen + runtime
 * error overlay) for every signed-out visitor who touches /admin. A gate
 * should answer "no", not crash — so every failure path returns false and the
 * route redirects quietly.
 */
export const checkIsAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    try {
      const authHeader = getRequestHeader("authorization");
      if (!authHeader?.startsWith("Bearer ")) return false;
      const token = authHeader.slice("Bearer ".length).trim();
      if (!token) return false;

      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (!url || !key) return false;

      const supabase = createClient(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      // Verifies the JWT signature server-side; a forged token fails here.
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) return false;

      const adminEmail = (process.env.ADMIN_EMAIL ?? "danielabinav16@gmail.com").toLowerCase();
      const email = String((data.claims as { email?: string }).email ?? "").toLowerCase();
      return email.length > 0 && email === adminEmail;
    } catch {
      return false;
    }
  },
);
