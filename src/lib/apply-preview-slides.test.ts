import { describe, expect, it } from "vitest";
import { previewSlides } from "./apply-preview-slides";

describe("selected option previews", () => {
  it("cycles only paid placements for guaranteed clicks", () => {
    expect(previewSlides({ base: "clicks", clicks: 500 })).toEqual(["network", "list", "leaderboard"]);
  });
  it("shows the site for the default details preview", () => {
    expect(previewSlides({ base: "free" })).toEqual(["site"]);
  });
  it("shows only the digest for a newsletter selection", () => {
    expect(previewSlides({ base: "free", newsletter: true })).toEqual(["digest"]);
  });
  it("adds the digest to selected click placements without the site", () => {
    expect(previewSlides({ base: "clicks", clicks: 500, newsletter: true })).toEqual(["network", "list", "leaderboard", "digest"]);
  });
  it("focuses only the newsletter while retaining a selected click pack", () => {
    expect(previewSlides({ base: "clicks", clicks: 500, newsletter: true }, "newsletter")).toEqual(["digest"]);
  });
  it("focuses only click placements when the click option is clicked", () => {
    expect(previewSlides({ base: "clicks", clicks: 500, newsletter: true }, "clicks")).toEqual(["network", "list", "leaderboard"]);
  });
});