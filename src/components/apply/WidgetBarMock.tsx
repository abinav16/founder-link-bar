import { Info, X } from "lucide-react";

/** Static replica of the live widget bar (widget.bar.tsx) for previews. Colors come from --mock-* tokens. */
export function WidgetBarMock({
  name, desc, favicon, placement, mobile = false, featured = false,
}: {
  name: string; desc: string; favicon: string | null; placement: "top" | "bottom"; mobile?: boolean; featured?: boolean;
}) {
  return (
    <div
      aria-label="Widget preview"
      className={`wmock mock-blend-surface ${mobile ? "is-mobile" : ""} ${featured ? "is-featured" : ""} ${placement === "top" ? "is-top" : "is-bottom"}`}
    >
      <span className="wmock-icon"><Info /></span>
      {!mobile && <span className="wmock-label">{featured ? "FEATURED" : "STARTUPBAR"}</span>}
      <div className={`wmock-content ${mobile ? "" : "is-centered"}`}>
        {favicon
          ? <img src={favicon} alt="" className="wmock-fav" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
          : <span className="wmock-fav wmock-fav-empty" />}
        <span className="wmock-name">{name}</span>
        {mobile ? (
          <span className="wmock-marquee">
            <span className="sb-marquee-track">
              <span className="sb-marquee-item">· {desc}</span>
              <span className="sb-marquee-item" aria-hidden="true">· {desc}</span>
            </span>
          </span>
        ) : (
          <span className="wmock-desc">&nbsp;· {desc}</span>
        )}
      </div>
      <span className="wmock-cta">Visit<span aria-hidden>→</span></span>
      {!mobile && <span className="wmock-icon"><X /></span>}
    </div>
  );
}
