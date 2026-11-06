import { newsletterDateLabel } from "@/lib/newsletter-slots";

export function NewsletterPreview({ name, desc, url, date, mobile = false }: {
  name: string; desc: string; url: string; date?: string; mobile?: boolean;
}) {
  return (
    <div className={`digest-preview ${mobile ? "is-mobile" : ""}`}>
      <div className="digest-envelope"><span>From StartupBar</span><span>{date ? newsletterDateLabel(date) : "Sunday newsletter"}</span></div>
      <article className="digest-paper">
        <header className="digest-brand"><img src="/favicon.png" alt="" /><b>StartupBar</b></header>
        <div className="digest-rule" />
        <p className="digest-meta">Weekly summary · Last 7 days</p>
        <h2>Your weekly stats.</h2>
        <p className="digest-greeting">Hi founder,</p>
        <p className="digest-intro">Your week in the network. Founders helping founders.</p>
        <section className="digest-sponsor">
          <p className="digest-meta">This week's featured sponsor</p>
          <div className="digest-startup">
            {url ? <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`} alt="" /> : <span className="digest-logo" />}
            <div><h3>{name.trim() || "Your startup"}</h3><p>{desc.trim() || "Your startup description"}</p></div>
          </div>
          <span className="digest-visit">Visit {name.trim() || "your startup"} →</span>
        </section>
        <div className="digest-stat-lines" aria-hidden="true"><i /><i /><i /></div>
        <footer>Founders helping founders.<div className="digest-rule" /><span>StartupBar · Privacy · Unsubscribe</span></footer>
      </article>
    </div>
  );
}