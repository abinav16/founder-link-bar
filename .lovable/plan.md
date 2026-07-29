## Short answer: yes, but it's intermittent

Your screenshot actually confirms half of it — your URL is `startupbar.co/dashboard#`, with the stray `#`. That trailing hash only appears because the sign-in return lands directly on `/dashboard` carrying the provider's token fragment, and something strips it back to a bare `#`.

Whether you also get the *blank* page is a timing race, which is why it works for you and not for him:

- Google sign-in is told to return to `https://startupbar.co/dashboard` (`src/routes/auth.tsx` — the Google button passes `redirect_uri: ${origin}${redirectPath}`, where redirectPath is `/dashboard`).
- `/dashboard` is protected. Its gate (`src/routes/_authenticated/route.tsx`) calls `getUser()` the moment the page loads.
- If the client has already parsed the token fragment and stored the session (fast machine, warm cache) → dashboard renders, you just see the leftover `#`.
- If the gate wins the race (slower network, Firefox, cold load — his case) → no session yet, it bounces, the fragment is gone, and you're left on `/dashboard#` with nothing rendered.

Same race applies to the email-confirmation link, which also points at `/dashboard`.

## The fix

**1. Add a public callback route** — `src/routes/auth.callback.tsx` (`/auth/callback`, `ssr: false`):
- Shows a brief "Signing you in…" state.
- Waits for the session to actually exist (auth-state listener plus a short `getSession()` poll, with a timeout) instead of assuming it's there.
- Reads the intended destination (`/apply` vs `/dashboard`) from a `next` search param, falling back to the existing `startupbar:auth-next` sessionStorage value, then `/dashboard`.
- Navigates there with `replace: true`, so neither the callback URL nor a leftover `#` stays in history.
- On timeout, sends the user to `/auth` with a toast rather than a blank screen.

**2. Point auth returns at the callback instead of the protected route** (`src/routes/auth.tsx`):
- Google: `redirect_uri: ${window.location.origin}/auth/callback?next=${redirectPath}`.
- Signup: `emailRedirectTo: ${window.location.origin}/auth/callback?next=${redirectPath}`.
- Password sign-in is unchanged (no fragment involved).

**3. Harden the protected gate** (`src/routes/_authenticated/route.tsx`): if the URL still carries an auth fragment (`access_token` / `code` / `error` in the hash), let the session settle before deciding instead of redirecting instantly — this closes the same race for anyone who lands on a protected URL with a token fragment, and stops the bare `#` being left behind.

## Verification

Headless run: hit `/auth/callback` with no session (should land on `/auth`, never blank), and confirm normal password sign-in still lands on `/dashboard` with a clean URL. Google's real round-trip can't be driven headlessly, so I'll also assert the constructed `redirect_uri` is exactly `https://startupbar.co/auth/callback?next=/dashboard`. Worth one manual sign-out/sign-in from your side after it ships — ideally in Firefox, since that's where he hits it.

No database, schema, or auth-provider changes needed — `/auth/callback` is same-origin, already covered by the existing redirect allowlist.
