import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";

/** Floating "back to top" control. Hidden on embed/widget routes. */
export function BackToTop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hidden = pathname.startsWith("/widget") || pathname.startsWith("/embed") || pathname.startsWith("/api");
  if (hidden) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={[
        "fixed bottom-5 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full",
        "border border-black/10 bg-white/90 text-black shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(0,0,0,0.18)] active:translate-y-0 active:scale-95",
        visible ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3",
      ].join(" ")}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}

export default BackToTop;
