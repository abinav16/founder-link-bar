import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Code2, Eye, Globe, MousePointerClick, Plus, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromoVideo } from "@/components/PromoVideo";
import { LiveVisitorMap } from "@/components/LiveVisitorMap";
import { SignupTrackingJourney } from "@/components/SignupTrackingJourney";
import { StartupFavicon } from "@/components/StartupFavicon";
import { useBidBoard, formatUsd } from "@/lib/bid";

type Startup = { name: string; description: string; website_url: string; logo_url: string | null };

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add("is-visible"); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`welcome-reveal ${className}`}>{children}</div>;
}

const steps = [
  { icon: Globe, title: "Add your startup", text: "A real product, a short description, and your link. Your first listing is free forever.", label: "Your startup", detail: "Ready to be discovered" },
  { icon: Code2, title: "Make a little room", text: "Add one line of code. A small, 36px bar introduces another founder’s product on your site.", label: "Your website", detail: "One small bar. Another great startup." },
  { icon: MousePointerClick, title: "Get discovered back", text: "Your startup appears on other founders’ sites. Follow the views and clicks in your dashboard.", label: "The founder network", detail: "Their visitors can discover you, too." },
];

function Exchange({ startups }: { startups: Startup[] }) {
  const [step, setStep] = useState(0);
  const selected = steps[step];
  const Icon = selected.icon;
  return <section id="how" className="welcome-section">
    <Reveal className="welcome-container">
      <div className="welcome-section-head"><div><span className="welcome-kicker">01 / THE EXCHANGE</span><h2>A little space.<br />A whole new audience.</h2></div><p>You’re building something worth finding.<br />Let other founders help people find it.</p></div>
      <div className="welcome-exchange">
        <div className="welcome-step-list" role="tablist" aria-label="How StartupBar works" onKeyDown={(event) => {
          if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
          if (!(event.target instanceof HTMLElement) || event.target.getAttribute("role") !== "tab") return;
          event.preventDefault();
          const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (step + (["ArrowUp", "ArrowLeft"].includes(event.key) ? 2 : 1)) % 3;
          setStep(next);
          document.getElementById(`welcome-step-${next}`)?.focus();
        }}>
          {steps.map((item, i) => <Button key={item.title} variant="ghost" role="tab" aria-selected={step === i} aria-controls="welcome-step-visual" id={`welcome-step-${i}`} className="welcome-step" onClick={() => setStep(i)}><span className="welcome-step-number">0{i + 1}</span><span><strong>{item.title}</strong><span>{item.text}</span></span><ArrowUpRight /></Button>)}
          <Button asChild className="welcome-action"><Link to="/apply">Find your first visitors <ArrowRight /></Link></Button>
        </div>
        <div id="welcome-step-visual" role="tabpanel" aria-labelledby={`welcome-step-${step}`} className={`welcome-exchange-visual welcome-exchange-step-${step}`}>
          <div className="welcome-diagram-caption"><span><span className="welcome-live-dot" /> FOUNDER TO FOUNDER</span><span>Give a little. Grow together.</span></div>
          <div className="welcome-flow-node welcome-flow-source"><Icon /><strong>{selected.label}</strong><span>{selected.detail}</span></div>
          <div className="welcome-flow-path" aria-hidden="true"><i /><i /><i /><ArrowDown /></div>
          <div className="welcome-network-nodes">{startups.slice(0, 3).map((startup) => <div key={startup.website_url}><StartupFavicon url={startup.website_url} name={startup.name} logoUrl={startup.logo_url} size={36} /><span>{startup.name}</span></div>)}{startups.length === 0 && <div><Users size={36} /><span>Other founders</span></div>}</div>
          <div className="welcome-return-line"><ArrowRight /><span>Your startup is shown on their sites</span><ArrowRight /></div>
          <div className="welcome-visual-foot"><ShieldCheck /><span>Human-reviewed startups. Shared discovery.</span></div>
        </div>
      </div>
    </Reveal>
  </section>;
}

function Discovery({ startups, logo }: { startups: Startup[]; logo?: string }) {
  return <section className="welcome-section welcome-network-section"><Reveal className="welcome-container">
    <div className="welcome-section-head"><div><span className="welcome-kicker">02 / REAL PRODUCTS. REAL PEOPLE.</span><h2>Small startups.<br />Not-so-small possibilities.</h2></div><Button variant="outline" asChild className="welcome-action"><Link to="/network">Explore the network <ArrowUpRight /></Link></Button></div>
    <div className="welcome-founder-strip">{startups.slice(0, 6).map((startup) => <a key={startup.website_url} href={startup.website_url} target="_blank" rel="noopener noreferrer" className="welcome-founder"><StartupFavicon url={startup.website_url} name={startup.name} logoUrl={startup.logo_url} size={40} /><span><strong>{startup.name}</strong><span>{startup.description}</span></span><ArrowUpRight /></a>)}</div>
    <div className="welcome-map-heading"><span className="welcome-live-label"><span className="welcome-live-dot" /> Live network activity</span><p>Visitor activity across founder websites — not just visits to StartupBar.</p></div>
    <div className="welcome-map"><ClientOnly fallback={<div className="welcome-map-loading" role="status">Loading live network activity…</div>}><LiveVisitorMap networkMode title="Live network activity" startupName="StartupBar" startupLogoUrl={logo} /></ClientOnly></div>
  </Reveal></section>;
}

function Proof() {
  return <section className="welcome-section"><Reveal className="welcome-container">
    <div className="welcome-section-head"><div><span className="welcome-kicker">03 / MORE THAN A CLICK COUNTER</span><h2>Don’t guess.<br />See what’s working.</h2></div><p>From a first impression to a new signup.<br />Keep each part of the journey in view.</p></div>
    <div className="welcome-proof-grid">
      <div className="welcome-analytics-visual"><div className="welcome-diagram-caption"><span><TrendingUp /> YOUR GROWTH, AT A GLANCE</span><span>Illustrative view</span></div><div className="welcome-analytic-stats"><div><Eye /><strong>Views</strong><span>Visible impressions</span></div><div><MousePointerClick /><strong>Clicks</strong><span>Visitors to your site</span></div><div><Globe /><strong>Referrals</strong><span>Where they came from</span></div></div><div className="welcome-chart" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} />)}</div><div className="welcome-chart-label"><span>Every impression has a beginning.</span><span>Follow your momentum <ArrowUpRight /></span></div></div>
      <div className="welcome-proof-copy"><span className="welcome-icon-square"><ShieldCheck /></span><h3>Visits are good.<br />Knowing they joined is better.</h3><p>Optional signup tracking connects referred visits to new accounts, using the widget you already installed.</p><ul><li><Check /> A 30-day attribution window</li><li><Check /> No customer names or emails</li><li><Check /> Signed confirmations and browser reports stay separate</li></ul><Button variant="link" asChild className="welcome-text-link"><Link to="/faq">Understand signup tracking <ArrowRight /></Link></Button></div>
    </div>
    <div className="welcome-signup-journey signup-tracking-ui"><span className="welcome-kicker">THE JOURNEY, NOT JUST THE DESTINATION</span><SignupTrackingJourney /><p>Referral visit → new account → signed partner confirmation.</p></div>
  </Reveal></section>;
}

function Options() {
  const { data: board } = useBidBoard();
  return <section className="welcome-section"><Reveal className="welcome-container">
    <div className="welcome-section-head"><div><span className="welcome-kicker">04 / YOUR NEXT MOVE</span><h2>Start free.<br />Grow on your terms.</h2></div><p>The exchange is the starting point.<br />Everything else is your choice.</p></div>
    <div className="welcome-options">
      <article className="welcome-option"><div className="welcome-option-art welcome-supporter-art"><div className="welcome-mini-browser"><div><i /><i /><i /><span>yourstartup.com</span></div><div className="welcome-lifting-bar"><span className="promo-brand-mark" /> StartupBar <ArrowUpRight /></div><div className="welcome-clean-site"><span /><span /><div><i /><i /><i /></div></div></div><span className="welcome-art-note"><Check /> Your listing stays. The bar goes.</span></div><div className="welcome-option-body"><span className="welcome-kicker">SUPPORTER MEMBERSHIP</span><h3>Keep the reach.<br />Lose the bar.</h3><p>Stay in the network without displaying the bar on your own site. Keep your profile, analytics, and Gold highlight.</p><Button variant="outline" asChild className="welcome-action"><Link to="/pricing">Explore Supporter <ArrowRight /></Link></Button></div></article>
      <article className="welcome-option"><div className="welcome-option-art welcome-bid-art"><div className="welcome-bid-heading"><span>StartupBid</span><TrendingUp /><span>LIVE BOARD</span></div>{(board ?? []).slice(0, 3).map(row => <Link key={row.id} to="/startupbid" className="welcome-bid-row"><span>#{row.rank}</span><StartupFavicon url={row.display_url} name={row.display_url} size={28} /><strong>{row.display_url}</strong><span>{formatUsd(row.total_cents)}</span></Link>)}{!board?.length && <div className="welcome-board-empty"><TrendingUp /><strong>The top spot is open.</strong><span>Build your place on the board.</span></div>}</div><div className="welcome-option-body"><span className="welcome-kicker">STARTUPBID / A SEPARATE LEADERBOARD</span><h3>Make your move.<br />Climb the board.</h3><p>A pay-to-rank board with cumulative bids. No widget installation required. Separate from the free exchange.</p><Button variant="outline" asChild className="welcome-action"><Link to="/startupbid">See StartupBid <ArrowRight /></Link></Button></div></article>
    </div>
    <div className="welcome-advertise-link"><span><Sparkles /><strong>Have a launch worth putting in the spotlight?</strong></span><Button variant="link" asChild><Link to="/advertise">Explore advertising <ArrowUpRight /></Link></Button></div>
  </Reveal></section>;
}

export function WelcomeSections({ startups, logo }: { startups: Startup[]; logo?: string }) {
  return <div className="welcome-content">
    <section className="welcome-film-section"><Reveal className="welcome-container"><div className="welcome-film-heading"><span className="welcome-kicker">A SMALL BAR. A SHARED AMBITION.</span><h2>Meet your next growth channel.</h2><p>49 seconds. The whole idea.</p></div><PromoVideo /></Reveal></section>
    <Exchange startups={startups} />
    <section className="welcome-facts-band"><Reveal className="welcome-container welcome-facts"><div><strong>$0</strong><span>Your first listing. Forever.</span></div><div><strong>36px</strong><span>A small space on your site.</span></div><div><strong>1 line</strong><span>Install once. Keep building.</span></div><div><ShieldCheck /><span>Reviewed by people.<br />Built for founders.</span></div></Reveal></section>
    <Discovery startups={startups} logo={logo} />
    <Proof />
    <Options />
    <section className="welcome-section welcome-faq"><Reveal className="welcome-container welcome-faq-grid"><div><span className="welcome-kicker">GOOD QUESTIONS</span><h2>Before you<br />make room.</h2><Button variant="link" asChild className="welcome-text-link"><Link to="/faq">All your questions, answered <ArrowUpRight /></Link></Button></div><div>{[
      ["Is it really free?", "Your first startup listing is free forever while you display the bar. Paid upgrades are optional, not a requirement to join the exchange."],
      ["Will it match my website?", "The bar automatically blends with your site’s background and text colors. The preview at the top of this page lets you try your own website."],
      ["What happens after I apply?", "Install your snippet, then your startup is reviewed before joining the network. Once approved, your startup can appear on other founders’ sites."],
      ["Are clicks the same as signups?", "No. Views, clicks, and signup reports are different measures. Optional signup tracking keeps signed partner confirmations separate from browser success-page reports."],
    ].map(([question, answer]) => <details key={question}><summary>{question}<Plus /></summary><p>{answer}</p></details>)}</div></Reveal></section>
    <section className="welcome-closing"><Reveal className="welcome-container"><span className="welcome-kicker">YOUR NEXT VISITOR IS OUT THERE.</span><h2>Make room for<br />a little discovery.</h2><p>You keep building. Let the network help you get found.</p><Button asChild className="welcome-action"><Link to="/apply">Add your startup <ArrowRight /></Link></Button><span className="welcome-closing-note">First listing free forever · Optional paid upgrades</span></Reveal></section>
    <footer className="welcome-footer"><div className="welcome-container"><div className="welcome-footer-top"><div><Link to="/" className="welcome-footer-brand"><span className="promo-brand-mark" /> StartupBar</Link><p>Built for founders. Grown together.</p></div><div><span>DISCOVER</span><Link to="/network">Network</Link><Link to="/leaderboard">Leaderboard</Link><Link to="/startupbid">StartupBid</Link></div><div><span>GET STARTED</span><Link to="/apply">Add your startup</Link><Link to="/pricing">Pricing</Link><Link to="/advertise">Advertise</Link></div><div><span>LET’S TALK</span><a href="mailto:hello@startupbar.co">Contact us <ArrowUpRight /></a><Link to="/faq">FAQ</Link><a href="https://x.com/danielabinav16" target="_blank" rel="noopener noreferrer">Follow on X <ArrowUpRight /></a></div></div><div className="welcome-footer-bottom"><span>© {new Date().getFullYear()} StartupBar</span><div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div><span>A little bar. A lot of possibility.</span></div></div></footer>
  </div>;
}