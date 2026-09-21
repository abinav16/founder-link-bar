# Are those scan findings real?

Short answer: partly. One is a genuine gap worth closing, the rest are scanner noise or things already handled.

## What I checked on the live site

Your live responses already send:

- Strict transport security (forces HTTPS)
- Referrer policy
- No sniff protection
- Cloudflare in front, blocking sensitive paths (the scanner itself noted this)

What is genuinely missing: a Content Security Policy header. That is the "High" item. It is a hardening layer, not an active vulnerability. Nobody is exploiting it today, but adding it reduces the damage if a script ever gets injected.

The "partly assessed" items (broken links, backend exposure) are not findings at all. The scanner ran out of time or hit its own limit, so it simply did not test those. That is not evidence of a problem.

The score of 28 out of 100 is misleading here: it was measured over 10 of 204 pages and counts untested areas against you.

## What is worth doing

Add a Content Security Policy in report only mode first, so nothing can break for visitors:

- Allow your own pages, the backend, fonts, images from the sites you preview, and the payment provider
- Keep frame embedding open for the bar, since member sites load it inside a frame on their own domain
- Watch reports for a short period, then switch it to enforcing

Also add a permissions policy line turning off camera, microphone, and location, which your site never uses.

## What I would not do

- Do not add a blanket frame blocking header. It would kill the bar on every member site, which is the whole product.
- Do not chase the broken link and backend items until the scanner actually completes a full run.

## Technical notes

- Headers are set in `src/server.ts`, on the response returned from the SSR handler, so every route gets them.
- Skip the policy on `/widget/bar` and `/api/*` responses, or scope it loosely there, so the embedded bar and the public endpoints keep working.
- Start with `Content-Security-Policy-Report-Only`, including `frame-ancestors *` for the bar route, and only promote to the enforcing header after a clean period.
