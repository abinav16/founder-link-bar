import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side admin check.
 *
 * The /admin route previously gated only in the browser (comparing the
 * signed-in email in client JS), which any signed-in user could step over in
 * devtools to render the console shell. This resolves the question on the
 * server from a verified bearer token, so the answer can't be faked locally.
 *
 * Returns false rather than throwing so the route can redirect quietly.
 */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const adminEmail = (process.env.ADMIN_EMAIL ?? "danielabinav16@gmail.com").toLowerCase();
    const email = String((context.claims as { email?: string })?.email ?? "").toLowerCase();
    return email.length > 0 && email === adminEmail;
  });
