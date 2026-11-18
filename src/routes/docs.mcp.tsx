import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Copy, PlugZap, ShieldCheck, Terminal, ChartNoAxesCombined, FilePenLine, BookOpen, LockKeyhole } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { MCP_DOC_TOOLS, MCP_ENDPOINT } from "@/lib/mcp-documentation";
import { STARTUP_CATEGORIES } from "@/lib/startup-categories";

export const Route = createFileRoute("/docs/mcp")({
  head: () => ({ meta: [
    { title: "StartupBar MCP Guide — Setup, OAuth & 11 AI Tools" },
    { name: "description", content: "Connect your AI assistant to StartupBar MCP with OAuth. Follow the setup guide, explore 11 startup and analytics tools, and troubleshoot your connection." },
    { property: "og:title", content: "StartupBar MCP Guide — Setup, OAuth & 11 AI Tools" },
    { property: "og:description", content: "Connect an AI assistant to your founder workspace with the MCP setup guide, complete tool reference, permissions and troubleshooting." },
    { property: "og:url", content: "https://startupbar.co/docs/mcp" },
    { name: "twitter:title", content: "StartupBar MCP Guide — Setup, OAuth & 11 AI Tools" },
    { name: "twitter:description", content: "OAuth connection instructions, startup management, analytics and the complete 11-tool MCP reference." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://startupbar.co/docs/mcp" }], scripts: [{
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [{
        "@type": "TechArticle",
        "@id": "https://startupbar.co/docs/mcp#guide",
        url: "https://startupbar.co/docs/mcp",
        headline: "StartupBar MCP Guide — Setup, OAuth & 11 AI Tools",
        description: "OAuth connection instructions, the complete StartupBar MCP tool reference, founder workflows, permissions and troubleshooting.",
        inLanguage: "en",
        author: { "@type": "Organization", name: "StartupBar", url: "https://startupbar.co" },
        publisher: { "@type": "Organization", name: "StartupBar", url: "https://startupbar.co" },
        mainEntityOfPage: "https://startupbar.co/docs/mcp",
        about: { "@type": "Thing", name: "Model Context Protocol (MCP)" },
        articleSection: ["Connection setup", "MCP tool reference", "Founder workflows", "Permissions and safety", "Troubleshooting"],
        hasPart: [{ "@type": "WebPageElement", name: "Connect your assistant", url: "https://startupbar.co/docs/mcp#connect" }, { "@type": "WebPageElement", name: "MCP tool reference", url: "https://startupbar.co/docs/mcp#tools" }],
      }, {
        "@type": "BreadcrumbList",
        "@id": "https://startupbar.co/docs/mcp#breadcrumbs",
        itemListElement: [{ "@type": "ListItem", position: 1, name: "StartupBar", item: "https://startupbar.co" }, { "@type": "ListItem", position: 2, name: "MCP guide", item: "https://startupbar.co/docs/mcp" }],
      }],
    }),
  }] }),
  component: McpDocumentation,
});

const contents = [["connect", "Connect your assistant"], ["examples", "Ask something useful"], ["tools", "Tool reference"], ["workflows", "Founder workflows"], ["security", "Permissions & safety"], ["troubleshooting", "Troubleshooting"]] as const;

function McpDocumentation() {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [filter, setFilter] = useState("All");
  async function copyEndpoint() {
    try { await navigator.clipboard.writeText(MCP_ENDPOINT); setCopied(true); setCopyError(false); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopyError(true); }
  }
  const tools = MCP_DOC_TOOLS.filter(tool => filter === "All" || tool.type === filter);
  return <div className="mcp-docs"><SiteHeader />
    <main className="mcp-docs-shell">
      <aside className="mcp-docs-sidebar"><Link to="/docs/mcp" className="mcp-docs-mark"><PlugZap size={19} /> MCP DOCUMENTATION</Link><nav aria-label="Documentation contents">{contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><div className="mcp-docs-sidebar-note"><LockKeyhole size={18} /><strong>Your account. Your control.</strong><p>OAuth sign-in. Owner-only private data. No API key to paste.</p></div></aside>
      <article className="mcp-docs-content">
        <header className="mcp-docs-intro"><span className="mcp-docs-eyebrow"><BookOpen size={16} /> FOUNDER TOOLKIT / MCP</span><h1>StartupBar MCP</h1><p className="mcp-docs-lead">Your founder workspace,<br />one conversation away.</p><p>Connect an AI assistant to your startups, traffic and campaigns. Find your next milestone, understand what’s working, and manage your listings without jumping between pages.</p><div className="mcp-docs-facts"><span><PlugZap size={16} /> Streamable HTTP</span><span><ShieldCheck size={16} /> OAuth protected</span><span><Terminal size={16} /> 11 documented tools</span></div></header>
        <div className="mcp-docs-flow" aria-label="An assistant connects through OAuth to your StartupBar account"><div><Terminal /><strong>Your assistant</strong><span>Your request</span></div><ArrowRight /><div><ShieldCheck /><strong>You authorize</strong><span>Secure account sign-in</span></div><ArrowRight /><div><ChartNoAxesCombined /><strong>Your StartupBar</strong><span>Real listings & performance</span></div></div>
        <section id="connect" className="mcp-docs-section"><span className="mcp-docs-eyebrow">01 / GET CONNECTED</span><h2>One address. Your own account.</h2><p>MCP (Model Context Protocol) is a standard that lets assistants call StartupBar’s tools directly, rather than guessing from website text. Use a client that supports remote MCP over Streamable HTTP with OAuth sign-in.</p><div className="mcp-endpoint"><div><span>SERVER URL</span><code>{MCP_ENDPOINT}</code></div><Button variant="outline" size="icon" onClick={copyEndpoint} aria-label={copied ? "Endpoint copied" : "Copy MCP endpoint"} title="Copy server URL">{copied ? <Check /> : <Copy />}</Button></div>{copyError && <p role="alert">Copy isn’t available in this browser. Select the address above and copy it manually.</p>}<span className="sr-only" role="status">{copied ? "MCP endpoint copied" : ""}</span>
          <ol className="mcp-docs-steps"><li><span>1</span><div><h3>Add a remote MCP connection</h3><p>Open your assistant’s integrations or MCP connections and choose a custom remote server. Names and availability differ between clients and plans.</p></div></li><li><span>2</span><div><h3>Paste the server URL</h3><p>Use the address above and choose OAuth if asked. Do not paste a password, browser session token or secret key into the assistant.</p></div></li><li><span>3</span><div><h3>Sign in and approve</h3><p>Complete StartupBar sign-in and review the requesting client on the consent screen. Approve only a client you trust; denying leaves it disconnected.</p></div></li><li><span>4</span><div><h3>Start with your startups</h3><p>Ask “List my startups on StartupBar.” The assistant should call <code>list_my_startups</code> and use the returned startup IDs for later requests.</p></div></li></ol>
          <div className="mcp-docs-callout"><ShieldCheck /><div><strong>Endpoint available · sign-in required</strong><p>The published address responds with an authentication requirement and OAuth discovery information. This guide documents the newest 11-tool revision; that revision requires publication. External approve/deny and the complete hosted catalog have not yet been verified.</p></div></div>
        </section>
        <section id="examples" className="mcp-docs-section"><span className="mcp-docs-eyebrow">02 / START A CONVERSATION</span><h2>Less clicking. Better questions.</h2><div className="mcp-prompt-grid">{[{ icon: ChartNoAxesCombined, label: "Understand your growth", text: "Compare my startups’ last complete week with the week before. Which gained the most clicks?" }, { icon: FilePenLine, label: "Keep your listing fresh", text: "Update my startup’s one-liner and send the change for review. Keep its current approved text live." }, { icon: PlugZap, label: "Find what needs attention", text: "Check my startup’s bar installation and explain what I need to fix." }].map(({ icon: Icon, label, text }) => <div className="mcp-prompt" key={label}><Icon size={23} /><h3>{label}</h3><p>“{text}”</p></div>)}</div></section>
        <section id="tools" className="mcp-docs-section"><span className="mcp-docs-eyebrow">03 / THE COMPLETE REFERENCE</span><h2>Eleven tools. Real founder jobs.</h2><p>Private reads and changes act only on the connected account. Public discovery tools return approved, non-banned network listings. Inputs not listed in a tool’s schema are rejected.</p><div className="mcp-docs-filters" aria-label="Filter tools">{["All", "Read", "Write", "Confirmation"].map(value => <Button key={value} variant={filter === value ? "default" : "ghost"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}{value === "All" ? " · 11" : ""}</Button>)}</div><div className="mcp-tool-list">{tools.map(tool => <details key={tool.name} className="mcp-tool"><summary><div><code>{tool.name}</code><span>{tool.title}</span></div><span className="mcp-tool-kind">{tool.type}</span></summary><div className="mcp-tool-body"><p>{tool.description}</p><h4>Arguments & limits</h4><p>{tool.arguments}</p><h4>Example request</h4><blockquote>“{tool.example}”</blockquote></div></details>)}</div><details className="mcp-tool mcp-categories"><summary>Supported startup categories</summary><div className="mcp-tool-body"><p>{STARTUP_CATEGORIES.join(" · ")}</p></div></details></section>
        <section id="workflows" className="mcp-docs-section"><span className="mcp-docs-eyebrow">04 / WORK WITH CONFIDENCE</span><h2>From a question to the next step.</h2><div className="mcp-workflow"><h3>Adding a startup</h3><p>Prepare a draft → install its matching snippet → verify the published site → explicitly submit for review. The first listing is free; additional listings use the existing $9.99 payment flow or an eligible prepaid credit. A duplicate consumes no new payment. Submission never means approval.</p><h3>Editing an approved listing</h3><p>Name and description changes wait for review while approved text stays live. Category and existing uploaded-logo changes apply immediately. Upload new images from <Link to="/account">Account</Link>; the website URL is fixed.</p><h3>Removing a startup</h3><p>Ask for removal → open the returned Account link → review the warning → choose Yes, delete or Cancel yourself. The AI tool never deletes directly. Confirmed removal is permanent and does not cancel billing or issue refunds.</p><h3>Reading performance correctly</h3><p>Received means your startup was shown or clicked. Delivered means your site showed or sent a click to another startup. CTR is received clicks divided by received impressions. Performance windows include today; comparisons deliberately use complete UTC days excluding today. Clicks do not prove signups or revenue.</p></div></section>
        <section id="security" className="mcp-docs-section"><span className="mcp-docs-eyebrow">05 / PERMISSIONS & SAFETY</span><h2>Connected, not uncontrolled.</h2><ul className="mcp-safety-list"><li><ShieldCheck /><div><strong>Account-scoped access</strong><p>Private startup data, changes and campaign reads stay restricted to the signed-in owner. Startup IDs are references, not permission to access another founder’s data.</p></div></li><li><LockKeyhole /><div><strong>Use OAuth, not copied credentials</strong><p>The server requires OAuth-issued client tokens. Normal browser-session tokens are not a connection method. Disconnect from your assistant’s integration controls when you no longer want it connected.</p></div></li><li><FilePenLine /><div><strong>Payments and review remain separate</strong><p>Tools cannot charge you, purchase ads, auto-approve a listing, submit StartupBid bids, send emails or bypass installation requirements. Review changes before asking an assistant to apply them.</p></div></li></ul><p>Browser-local tools are separate: Network and Leaderboard expose read-only page data; Account can open the existing removal confirmation when Your startups is visible. They depend on browser support and do not replace the remote MCP connection. See <Link to="/privacy">Privacy</Link> and <Link to="/terms">Terms</Link>.</p></section>
        <section id="troubleshooting" className="mcp-docs-section"><span className="mcp-docs-eyebrow">06 / WHEN SOMETHING DOESN’T WORK</span><h2>A few useful checks.</h2>{[
          ["The URL says unauthorized", "That is expected when opening the protected server without OAuth. Connect it through your assistant and finish account authorization; it is not a normal web page."],
          ["My assistant cannot connect", "Confirm remote Streamable HTTP and OAuth support in that client. Use the exact server URL. If sign-in or consent fails, reconnect and retry rather than sharing tokens or switching to public access."],
          ["I cannot see the newest tools", "The guide describes the latest revision. It must be published before external assistants can discover it. After publication, refresh or reconnect the integration; a generated catalog alone does not prove hosted availability."],
          ["My startup is missing or unranked", "Check you authorized the correct founder account. Private tools use owned IDs; public discovery and rankings include approved, non-banned listings only."],
          ["The scan cannot confirm my bar", "Security policy, matching-ID, consent and conditional installation can affect detection. Bundled or inner-page installs may not appear in a static scan. Missing evidence does not prove removal; retry from Account."],
          ["My comparison has no percentage change", "A zero previous count has no meaningful percentage baseline. The tool returns the actual difference and leaves percentage change empty rather than inventing growth."],
        ].map(([question, answer]) => <details key={question} className="mcp-tool"><summary>{question}</summary><div className="mcp-tool-body"><p>{answer}</p></div></details>)}</section>
        <footer className="mcp-docs-footer"><PlugZap /><div><h2>Your next question starts here.</h2><p>Connect your account, then ask about your startups.</p></div><Button variant="outline" onClick={copyEndpoint}>{copied ? <Check /> : <Copy />} Copy server URL</Button></footer>
      </article>
    </main>
  </div>;
}