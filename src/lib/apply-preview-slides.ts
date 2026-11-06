import type { CheckoutPlan } from "./checkout-plans";

export type PreviewSlide = "site" | "network" | "list" | "leaderboard" | "digest";

export function previewSlides(plan: CheckoutPlan): PreviewSlide[] {
  if (plan.base === "supporter") return ["site"];
  const slides: PreviewSlide[] = plan.base === "clicks"
    ? ["network", "list", "leaderboard"]
    : [];
  if (plan.newsletter) slides.push("digest");
  return slides.length ? slides : ["site"];
}