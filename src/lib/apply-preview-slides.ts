import type { CheckoutPlan } from "./checkout-plans";

export type PreviewSlide = "site" | "network" | "list" | "leaderboard" | "digest";
export type PreviewFocus = "site" | "clicks" | "newsletter";

export function previewSlides(plan: CheckoutPlan, focus?: PreviewFocus): PreviewSlide[] {
  if (focus === "site") return ["site"];
  if (focus === "newsletter" && plan.newsletter && plan.base !== "supporter") return ["digest"];
  if (focus === "clicks" && plan.base === "clicks") return ["network", "list", "leaderboard"];
  if (plan.base === "supporter") return ["site"];
  const slides: PreviewSlide[] = plan.base === "clicks"
    ? ["network", "list", "leaderboard"]
    : [];
  if (plan.newsletter) slides.push("digest");
  return slides.length ? slides : ["site"];
}