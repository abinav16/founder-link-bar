import { createServerFn } from "@tanstack/react-start";
import { probeBestEmbedUrl } from "./preview-probe.server";

/** Given a typed site, returns the variant (apex vs www, after redirects) that
 *  can actually be framed, or null when the site refuses embedding entirely. */
export const resolveEmbedUrl = createServerFn({ method: "GET" })
  .inputValidator((d: { url: string }) => d)
  .handler(async ({ data }) => probeBestEmbedUrl(data.url));
