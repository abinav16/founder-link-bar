import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — StartupBar" }] }),
  component: PrivacyPage,
});

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="h-2 w-6 rounded-sm bg-black" />
      <span className="text-base font-semibold tracking-tight text-black">StartupBar</span>
    </Link>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/8">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          <Link to="/" className="text-sm text-black/40 hover:text-black transition-colors">← Back</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
        <p className="mt-2 text-sm text-black/40">Last updated: June 21, 2026</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-black/65">
          <section><h2 className="mb-3 text-base font-semibold text-black">1. Who we are</h2><p>StartupBar ("we", "us", "our") operates startupbar.co — a free traffic-exchange network for software founders. Contact us at <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a> with any privacy-related questions.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">2. Information we collect</h2><ul className="space-y-2 list-disc list-inside"><li><strong className="text-black/80">Account data:</strong> When you sign up via Google OAuth we receive your name, email address, and Google profile picture. We store only your name and email.</li><li><strong className="text-black/80">Startup data:</strong> The startup name, URL, and one-liner you submit during the application process.</li><li><strong className="text-black/80">Analytics events:</strong> Anonymous impression and click events. No personal visitor data is stored.</li></ul></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">3. Google API services</h2><p>StartupBar uses Google Sign-In (OAuth 2.0) for authentication. We request access only to your basic profile (name, email, and profile photo). We do not access your Google Drive, Gmail, Calendar, or any other Google service.</p><p className="mt-3">Our use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">Google API Services User Data Policy</a>, including the Limited Use requirements.</p><p className="mt-3">You can revoke StartupBar's access to your Google account at any time via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">Google Account Permissions</a>.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">4. How we use your data</h2><ul className="space-y-2 list-disc list-inside"><li>To authenticate you and maintain your account session.</li><li>To display your startup in the StartupBar network.</li><li>To power your dashboard analytics.</li><li>To send essential product emails. We do not send marketing emails without your consent.</li></ul></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">5. Data sharing</h2><p>We do not sell, rent, or trade your personal data. We share data only with Supabase (database/auth) and Google (OAuth sign-in).</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">6. Cookies</h2><p>We use a single session cookie to keep you signed in. The StartupBar widget embedded on your site renders inside an isolated iframe and sets no cookies on your visitors.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">7. Data retention & deletion</h2><p>You can delete any of your startups at any time from your <Link to="/account" className="text-black underline underline-offset-2">Account</Link> page. To permanently delete your account, email us at <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">8. Security</h2><p>All data is transmitted over HTTPS. Authentication tokens are managed by Supabase Auth. We do not store passwords.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">9. Children</h2><p>StartupBar is not directed at children under 13.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">10. Changes to this policy</h2><p>We will notify you of material changes by posting the updated policy here with a new date.</p></section>
          <section><h2 className="mb-3 text-base font-semibold text-black">11. Contact</h2><p>Questions? Email <a href="mailto:hello@startupbar.co" className="text-black underline underline-offset-2">hello@startupbar.co</a>.</p></section>
        </div>
      </main>
      <footer className="border-t border-black/8 px-6 py-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between text-xs text-black/30">
          <span>© {new Date().getFullYear()} StartupBar</span>
          <Link to="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
