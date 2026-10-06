import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import QRCode from "qrcode";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Check,
  CheckCircle2, ChevronRight, CircleHelp, Clock3, Copy, CreditCard,
  ExternalLink, FileText, Globe2, Image, LockKeyhole, LogOut, Menu,
  Plus, QrCode, RefreshCw, ShieldCheck, Sparkles, X,
} from "lucide-react";
import {
  getGetAdminDashboardQueryKey, getGetAdminSettingsQueryKey,
  getGetPublicSiteQueryKey, getGetOrderPaymentQueryKey,
  getListAdminChallengesQueryKey, getListAdminFaqsQueryKey,
  getListAdminMediaQueryKey, getListAdminOrdersQueryKey,
  getListAdminPaymentMethodsQueryKey, getListAdminStatisticsQueryKey,
  getListAdminTestimonialsQueryKey, getListPublicPaymentMethodsQueryKey,
  useCreateChallenge, useCreateFaq, useCreateMedia, useCreatePaymentMethod,
  useCreateTestimonial, useCreateOrder, useDeleteChallenge, useDeleteFaq,
  useDeleteMedia, useDeletePaymentMethod, useDeleteTestimonial,
  useGetAdminDashboard, useGetAdminSettings, useGetOrderPayment,
  useGetPublicSite, useHealthCheck, useListAdminChallenges, useListAdminFaqs,
  useListAdminMedia, useListAdminOrders, useListAdminPaymentMethods,
  useListAdminStatistics, useListAdminTestimonials, useListPublicPaymentMethods,
  useReplaceAdminStatistics, useSubmitPayment, useUpdateAdminOrder,
  useUpdateAdminSettings, useUpdateChallenge, useUpdateFaq, useUpdateMedia,
  useUpdatePaymentMethod, useUpdateTestimonial,
} from "@workspace/api-client-react";
import type {
  Challenge, ChallengeInput, Faq, FaqInput, MediaInput,
  Order, OrderInput, PaymentMethodInput,
  PaymentSubmissionInput, SiteSettingsInput, SiteStatistic, StatisticsInput,
  TestimonialInput,
} from "@workspace/api-client-react";
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
function stripBase(path: string) { return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path; }
if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: { logoPlacement: "inside" as const, logoLinkUrl: basePath || "/", logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
  variables: {
    colorPrimary: "#378361", colorForeground: "#eeeDE8", colorMutedForeground: "#aab2ae",
    colorDanger: "#d86c63", colorBackground: "#171c1a", colorInput: "#121716",
    colorInputForeground: "#eeeDE8", colorNeutral: "#37413d", fontFamily: "Manrope, sans-serif",
    borderRadius: "0px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#171c1a] border border-[#303a35] rounded-none w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f1f0ea] font-semibold",
    headerSubtitle: "text-[#aab2ae]",
    socialButtonsBlockButtonText: "text-[#eeeDE8]",
    formFieldLabel: "text-[#d6d9d3]",
    footerActionLink: "text-[#8dc2a6]",
    footerActionText: "text-[#aab2ae]",
    dividerText: "text-[#aab2ae]",
    identityPreviewEditButton: "text-[#8dc2a6]",
    formFieldSuccessText: "text-[#8dc2a6]",
    alertText: "text-[#eeeDE8]",
    logoBox: "mb-2",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border-[#37413d] bg-[#121716] hover:bg-[#1d2521]",
    formButtonPrimary: "bg-[#2d7958] hover:bg-[#388d67] text-white",
    formFieldInput: "bg-[#121716] border-[#37413d] text-[#eeeDE8]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[#303a35]",
    alert: "bg-[#2a1d1b] border-[#69413b]",
    otpCodeFieldInput: "bg-[#121716] border-[#37413d] text-[#eeeDE8]",
    formFieldRow: "text-[#eeeDE8]",
    main: "text-[#eeeDE8]",
  },
};

function Logo({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? "brand-small" : ""}`} aria-label="BLACK Trading">
    <span className="brand-symbol">B</span><span className="brand-name">BLACK<span>TRADING</span></span>
  </span>;
}

function TopNav() {
  const [open, setOpen] = useState(false);
  return <header className="bt-nav sticky top-0 z-40 border-b bt-rule">
    <div className="bt-wrap flex h-[74px] items-center justify-between">
      <Link href="/" className="no-underline"><Logo /></Link>
      <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
        <a className="nav-link" href="/#evaluations">Evaluations</a>
        <a className="nav-link" href="/#process">How it works</a>
        <a className="nav-link" href="/#faq">FAQ</a>
      </nav>
      <div className="hidden items-center gap-5 md:flex">
        <Link className="nav-signin" href="/sign-in">Sign in</Link>
        <Link className="bt-button" href="/checkout">Choose evaluation <ArrowRight size={15} /></Link>
      </div>
      <button type="button" className="nav-menu md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} data-testid="button-menu">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
    {open && <div className="mobile-menu md:hidden">
      <a onClick={() => setOpen(false)} href="/#evaluations">Evaluations</a><a onClick={() => setOpen(false)} href="/#process">How it works</a>
      <a onClick={() => setOpen(false)} href="/#faq">FAQ</a><Link href="/sign-in" onClick={() => setOpen(false)}>Sign in</Link>
      <Link className="bt-button" href="/checkout" onClick={() => setOpen(false)}>Choose evaluation <ArrowRight size={15} /></Link>
    </div>}
  </header>;
}

function Footer({ company = "BLACK Trading", supportEmail }: { company?: string; supportEmail?: string }) {
  return <footer className="site-footer">
    <div className="bt-wrap">
      <div className="footer-main">
        <div><Logo /><p className="footer-note">A structured environment to evaluate your process.<br />All trading activity is simulated.</p></div>
        <div className="footer-col"><span className="bt-kicker">Explore</span><Link href="/#evaluations">Evaluations</Link><Link href="/#process">How it works</Link><Link href="/#faq">Questions</Link></div>
        <div className="footer-col"><span className="bt-kicker">Information</span><Link href="/terms">Terms of service</Link><Link href="/terms?section=privacy">Privacy</Link>{supportEmail && <a href={`mailto:${supportEmail}`}>Contact support</a>}</div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {company}</span><span>Evaluation access is simulated and does not provide live capital.</span><Link href="/admin">Administration <ArrowRight size={12} /></Link></div>
    </div>
  </footer>;
}

function SiteFrame({ children, company, supportEmail }: { children: ReactNode; company?: string; supportEmail?: string }) {
  return <div className="bt-page"><TopNav />{children}<Footer company={company} supportEmail={supportEmail} /></div>;
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-stack" aria-label="Loading content">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-row" />)}</div>;
}

function ErrorNotice({ onRetry, message = "We could not load this information." }: { onRetry: () => void; message?: string }) {
  return <div className="state-card"><div className="state-icon"><RefreshCw size={18} /></div><h3>That didn’t load</h3><p>{message}</p><button className="bt-button secondary" type="button" onClick={onRetry}>Try again <RefreshCw size={14} /></button></div>;
}

function useSite() { return useGetPublicSite(); }

function HomePage() {
  const { data: site, isLoading, isError, refetch } = useSite();
  useHealthCheck();
  const challenges = useMemo(() => [...(site?.challenges ?? [])].filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder), [site?.challenges]);
  const faqs = useMemo(() => [...(site?.faqs ?? [])].filter((f) => f.published).sort((a, b) => a.sortOrder - b.sortOrder), [site?.faqs]);
  const stats = useMemo(() => [...(site?.statistics ?? [])].filter((s) => s.visible && s.verified).sort((a, b) => a.sortOrder - b.sortOrder), [site?.statistics]);
  const testimonials = (site?.testimonials ?? []).filter((t) => t.published && (t.verified || t.demo));
  const media = [...(site?.media ?? [])].filter((item) => item.published).sort((a,b)=>a.sortOrder-b.sortOrder).slice(0,3);
  return <SiteFrame company={site?.companyName} supportEmail={site?.supportEmail}>
    <main>
      <section className="hero-section">
        <div className="hero-grid bt-wrap">
          <div className="hero-copy">
            <div className="bt-kicker bt-reveal"><span className="live-dot" /> Performance is a process</div>
            <h1 className="bt-reveal-2">Trade with<br /><em>intention.</em></h1>
            <p className="hero-lede bt-reveal-3">A clear, rules-based evaluation for traders who want to prove consistency before they scale.</p>
            <div className="hero-actions bt-reveal-3"><a href="#evaluations" className="bt-button">Explore evaluations <ArrowRight size={16} /></a><a href="#process" className="text-link">See how it works <ArrowDownRight size={15} /></a></div>
            <div className="hero-trust bt-reveal-3"><ShieldCheck size={16} /><span>Simulated evaluation. Transparent rules. No live capital.</span></div>
          </div>
          <div className="hero-art" aria-label="Abstract chart illustration">
            <div className="art-frame">
              <div className="art-header"><span>MARKET SESSION / 01</span><span className="art-dot">●</span></div>
              <div className="chart-label">DISCIPLINE OVER<br /><i>IMPULSE.</i></div>
              <svg viewBox="0 0 560 230" className="chart-svg" role="img" aria-label="Illustrative market chart">
                <defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4b9975" stopOpacity=".28" /><stop offset="1" stopColor="#4b9975" stopOpacity="0" /></linearGradient></defs>
                {[40,90,140,190].map(y=><line key={y} x1="0" x2="560" y1={y} y2={y} stroke="#303b36" strokeDasharray="3 6" />)}
                <path d="M0 177 C35 167 51 187 82 153 S126 164 154 130 S202 145 229 111 S265 141 301 103 S345 124 372 86 S411 108 438 65 S483 93 510 50 S539 67 560 26 L560 220 L0 220Z" fill="url(#area)" />
                <path d="M0 177 C35 167 51 187 82 153 S126 164 154 130 S202 145 229 111 S265 141 301 103 S345 124 372 86 S411 108 438 65 S483 93 510 50 S539 67 560 26" fill="none" stroke="#73b392" strokeWidth="2" />
                <circle cx="510" cy="50" r="4" fill="#badcc8" /><line x1="510" x2="510" y1="50" y2="220" stroke="#73b392" strokeDasharray="3 5" opacity=".45" />
              </svg>
              <div className="chart-axis"><span>OPEN</span><span>STRUCTURE</span><span>EXECUTION</span><span>REVIEW</span></div>
              <div className="art-bottom"><span><b>SIMULATED</b> environment</span><span>01 / 04</span></div>
            </div>
            <div className="art-stamp"><span>THE EDGE IS<br />IN THE PROCESS</span><ArrowUpRight size={18} /></div>
          </div>
        </div>
        <div className="hero-bottom bt-wrap"><span>Built for deliberate traders</span><span className="hero-bottom-line" /><span>RULES BEFORE RESULTS</span></div>
      </section>

      <section className="intro-band"><div className="bt-wrap intro-layout"><p className="bt-kicker">The BLACK standard</p><div><h2>Capital follows<br /><em>consistency.</em></h2><p>BLACK Trading provides simulated evaluation accounts. You work within defined parameters, submit your performance for review, and learn where your process holds up under pressure.</p></div><div className="intro-mark">BT<span>®</span></div></div></section>

      <section className="section-padding" id="evaluations">
        <div className="bt-wrap">
          <div className="section-heading"><div><p className="bt-kicker">01 / Choose your evaluation</p><h2>Start with a clear brief.</h2></div><p>One evaluation. A defined set of rules.<br />No ambiguity about what comes next.</p></div>
          {isLoading ? <Skeleton rows={2} /> : isError ? <ErrorNotice onRetry={() => void refetch()} /> : challenges.length === 0 ? <div className="empty-panel"><CircleHelp size={20} /><div><b>Evaluations are being prepared.</b><p>Check back soon, or contact support for availability.</p></div></div> :
            <div className="challenge-list">{challenges.map((challenge, i) => <ChallengeCard challenge={challenge} index={i} key={challenge.id} />)}</div>}
          <div className="offer-note"><LockKeyhole size={15} /><p>Any launch offer shown is the price for a <strong>simulated evaluation</strong>, not a cash balance, live account, or guaranteed funding. Evaluation availability and rules are set out before checkout.</p></div>
        </div>
      </section>

      <section className="process-section" id="process"><div className="bt-wrap">
        <div className="section-heading"><div><p className="bt-kicker">02 / A measured path</p><h2>Know what you’re<br /><em>agreeing to.</em></h2></div><p>Every step is visible before you commit.<br />Nothing is hidden behind a dashboard.</p></div>
        <div className="process-track">
          {[["01","Choose an evaluation","Select an available simulated account and review its specific rules."],["02","Complete checkout","Provide the details needed to create your order and receive payment instructions."],["03","Submit payment proof","Pay through an enabled payment method and send the transaction hash for manual review."],["04","Begin the evaluation","Once your payment is reviewed, receive next-step details for your evaluation."]].map(([num,title,body])=><article key={num} className="process-step"><span className="step-num">{num}</span><span className="step-connector" /><h3>{title}</h3><p>{body}</p></article>)}
        </div>
        <div className="sim-banner"><div className="sim-icon"><Activity size={21} /></div><div><span className="bt-kicker">A necessary distinction</span><h3>This is a simulated trading evaluation.</h3><p>Trades are not executed in live markets with customer funds. Account sizes refer to simulated notional balances and are not cash deposits, cash-equivalent balances, or investment accounts.</p></div></div>
      </div></section>

      <section className="section-padding proof-section"><div className="bt-wrap">
        <div className="section-heading"><div><p className="bt-kicker">03 / Clear by design</p><h2>Facts, not theater.</h2></div><p>We publish only information that is<br />verified or clearly marked as illustrative.</p></div>
        {stats.length > 0 && <div className="stat-strip">{stats.map((s)=><div className="stat-item" key={s.id}><span className="stat-value">{s.value}</span><span className="stat-label">{s.label}</span><span className="verified-label"><BadgeCheck size={13} /> Verified</span></div>)}</div>}
        {media.length > 0 && <div className="media-strip">{media.map((item)=><article key={item.id} className="media-card"><div className="media-art">{item.assetUrl ? <img src={item.assetUrl} alt={item.title} /> : <div className="media-placeholder"><Image size={23} /><span>MEDIA PREVIEW</span></div>}<span className="media-kind">{item.kind}</span></div><div className="media-info"><div><h3>{item.title}</h3><p>{item.caption}</p></div>{item.demo && <span className="demo-badge">DEMO</span>}</div></article>)}</div>}
        {testimonials.length > 0 && <div className="testimonial-list">{testimonials.map((t)=><blockquote key={t.id}><p>“{t.quote}”</p><footer>{t.customerName}<span>{t.demo ? "DEMO EXAMPLE — NOT A CUSTOMER CLAIM" : t.verified ? "VERIFIED" : "UNVERIFIED"}</span></footer></blockquote>)}</div>}
        {stats.length === 0 && media.length === 0 && testimonials.length === 0 && <div className="proof-placeholder"><ShieldCheck size={19} /><span>Performance claims and customer stories appear here only when verified or explicitly labelled as examples.</span></div>}
      </div></section>

      <section className="faq-section" id="faq"><div className="bt-wrap faq-layout"><div><p className="bt-kicker">04 / Questions, answered</p><h2>Clarity before<br /><em>commitment.</em></h2><p className="faq-lede">Still unsure? Contact our team before placing an order.</p>{site?.supportEmail && <a className="text-link" href={`mailto:${site.supportEmail}`}>{site.supportEmail} <ArrowRight size={14} /></a>}</div>
        <div className="faq-list">{isLoading ? <Skeleton rows={3} /> : isError ? <ErrorNotice onRetry={() => void refetch()} /> : faqs.length ? faqs.map((faq)=><details key={faq.id}><summary>{faq.question}<Plus size={16} className="faq-plus" /></summary><p>{faq.answer}</p></details>) : <div className="empty-panel"><CircleHelp size={18} /><span>Frequently asked questions are being updated.</span></div>}</div>
      </div></section>
      <section className="closing-cta"><div className="bt-wrap"><p className="bt-kicker">The next decision is yours</p><h2>Make the process<br /><em>the advantage.</em></h2><Link href="/checkout" className="bt-button">Choose an evaluation <ArrowRight size={16} /></Link><p>Simulated evaluation only · Terms apply</p></div></section>
    </main>
  </SiteFrame>;
}

function ChallengeCard({ challenge, index }: { challenge: Challenge; index: number }) {
  return <article className={`challenge-row ${index === 0 ? "challenge-featured" : ""}`}>
    <div className="challenge-number">0{index + 1}</div><div className="challenge-details"><div className="challenge-title-row"><h3>{challenge.displayName}</h3>{challenge.launchOffer && <span className="launch-label"><Sparkles size={12} /> Limited Launch Evaluation Offer</span>}</div><p>{challenge.description || challenge.rulesSummary}</p><div className="rules-inline">{challenge.rulesSummary && <span><Check size={13} />{challenge.rulesSummary}</span>}<span><Activity size={13} /> Simulated notional size</span></div></div>
    <div className="challenge-price"><span className="account-size">{challenge.accountSize}</span><span className="price-amount">${challenge.price.toLocaleString()}</span><span className="price-caption">{challenge.launchOffer ? "launch evaluation fee" : "evaluation fee"}</span></div>
    <Link className="challenge-cta" href={`/checkout?challenge=${encodeURIComponent(challenge.id)}`} aria-label={`Select ${challenge.displayName}`}><ArrowRight size={19} /></Link>
  </article>;
}

function TermsPage() {
  const { data: site } = useSite();
  const params = new URLSearchParams(window.location.search);
  const privacy = params.get("section") === "privacy";
  const content = privacy ? site?.privacyContent : site?.termsContent;
  return <SiteFrame company={site?.companyName} supportEmail={site?.supportEmail}><main className="legal-page bt-wrap">
    <p className="bt-kicker">Information / {privacy ? "Privacy" : "Terms of service"}</p><h1>{privacy ? "Privacy notice" : "Terms of service"}</h1>
    <div className="legal-review"><FileText size={18} /><div><b>Draft placeholder — qualified lawyer review required</b><p>This content is not legal advice and must be reviewed, completed, and approved by a qualified lawyer in each relevant jurisdiction before publication or use.</p></div></div>
    <div className="legal-copy">{content ? content.split("\n").map((line,i)=>line.trim() ? <p key={i}>{line}</p> : <br key={i} />) : <><h2>{privacy ? "Privacy and information use" : "Evaluation terms"}</h2><p>This page is a legal placeholder. The final terms should accurately describe the operator, the simulated evaluation service, customer eligibility, order and payment review process, applicable fees and refunds, intellectual property, data use, dispute process, governing law, and contact information.</p><p>BLACK Trading evaluations are simulated. Any account size is a notional simulated value and is not customer cash, a brokerage account, a deposit, or a promise of funding, profit, or employment. Simulated results do not represent actual trading results.</p><p>Before accepting payment or publishing this site, have a qualified lawyer review all terms, privacy disclosures, consumer protection requirements, payment processor requirements, and restrictions in every market where the service is offered.</p></>}</div>
    <Link className="bt-button secondary" href="/">Return to home <ArrowRight size={14} /></Link>
  </main></SiteFrame>;
}

function CheckoutPage() {
  const qc = useQueryClient(); const [, setLocation] = useLocation();
  const { data: site, isLoading, isError, refetch } = useSite();
  const create = useCreateOrder({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetPublicSiteQueryKey() }); } } });
  const available = useMemo(() => [...(site?.challenges ?? [])].filter(c=>c.enabled).sort((a,b)=>a.sortOrder-b.sortOrder), [site?.challenges]);
  const requestedId = new URLSearchParams(window.location.search).get("challenge");
  const [challengeId,setChallengeId] = useState(requestedId ?? "");
  const [notice,setNotice] = useState("");
  useEffect(()=>{ if (available.length && (!challengeId || !available.some(c=>c.id===challengeId))) setChallengeId(requestedId && available.some(c=>c.id===requestedId) ? requestedId : available[0].id); },[available, challengeId, requestedId]);
  const selected = available.find(c=>c.id===challengeId);
  async function handleSubmit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); setNotice("");
    if (!challengeId) { setNotice("Choose an available evaluation first."); return; }
    const form = new FormData(e.currentTarget);
    create.mutate({data:{fullName:String(form.get("fullName")).trim(), email:String(form.get("email")).trim(), country:String(form.get("country")).trim(), phone:String(form.get("phone")||"").trim()||null, challengeId} satisfies OrderInput}, {
      onSuccess: (order) => setLocation(`/payment?order=${encodeURIComponent(order.id)}`),
      onError: () => setNotice("Your order could not be created. Please review your details and try again."),
    });
  }
  return <SiteFrame company={site?.companyName} supportEmail={site?.supportEmail}><main className="checkout-page bt-wrap">
    <div className="checkout-heading"><p className="bt-kicker">Checkout / 01 of 02</p><h1>Begin your<br /><em>evaluation.</em></h1><p>Choose an available evaluation and share your contact details. Payment instructions are provided after an order is created.</p></div>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={handleSubmit}>
      <div className="form-section-title"><span>01</span><div><h2>Select an evaluation</h2><p>Every offer is for simulated evaluation access, not cash or live capital.</p></div></div>
      {isLoading ? <Skeleton rows={2} /> : isError ? <ErrorNotice onRetry={()=>void refetch()} /> : available.length ? <div className="selection-list">{available.map((c)=><label className={`selection-option ${challengeId===c.id?"selected":""}`} key={c.id}><input type="radio" name="challengeId" value={c.id} checked={challengeId===c.id} onChange={()=>setChallengeId(c.id)} /><span className="radio-mark" /><span className="selection-copy"><b>{c.displayName}</b><small>{c.accountSize} simulated · {c.launchOffer ? "Limited Launch Evaluation Offer" : "Evaluation fee"}</small></span><strong>${c.price.toLocaleString()}</strong></label>)}</div> : <div className="empty-panel">No evaluations are currently available.</div>}
      <div className="form-section-title"><span>02</span><div><h2>Your details</h2><p>We’ll use these details to identify your order.</p></div></div>
      <div className="form-grid">
        <label className="bt-field">Full name<input required name="fullName" autoComplete="name" maxLength={160} placeholder="As shown on your payment account" data-testid="input-full-name" /></label>
        <label className="bt-field">Email address<input required type="email" name="email" autoComplete="email" maxLength={320} placeholder="you@example.com" data-testid="input-email" /></label>
        <label className="bt-field">Country / region<input required name="country" autoComplete="country-name" minLength={2} maxLength={100} placeholder="Country or region" data-testid="input-country" /></label>
        <label className="bt-field">Phone <span className="optional-label">Optional</span><input name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="+1 555 000 0000" data-testid="input-phone" /></label>
      </div>
      {notice && <p role="alert" className="form-error">{notice}</p>}
      <button type="submit" disabled={!selected || create.isPending || isLoading} className="bt-button checkout-submit" data-testid="button-create-order">{create.isPending ? "Creating your order…" : "Continue to payment"}{!create.isPending && <ArrowRight size={16} />}</button>
      <p className="checkout-terms"><LockKeyhole size={13} /> By continuing, you acknowledge that this is a simulated trading evaluation. <Link href="/terms">Read terms</Link>.</p>
    </form>
    <aside className="order-summary"><div className="summary-top"><span className="bt-kicker">Order summary</span><CreditCard size={16} /></div>{selected ? <><div className="summary-name"><span className="account-size">{selected.accountSize}</span><h3>{selected.displayName}</h3><p>{selected.description}</p></div><div className="summary-row"><span>Evaluation access</span><b>${selected.price.toLocaleString()}</b></div><div className="summary-row total"><span>Total due</span><b>${selected.price.toLocaleString()}</b></div><div className="summary-caution"><ShieldCheck size={16} /><p>This fee purchases access to a simulated evaluation. It is not a deposit and does not represent cash or live trading capital.</p></div></> : <p className="muted">Choose an evaluation to see its summary.</p>}</aside></div>
  </main></SiteFrame>;
}

function PaymentPage() {
  const qc = useQueryClient();
  const orderId = new URLSearchParams(window.location.search).get("order") ?? "";
  const {data:payment,isLoading,isError,refetch} = useGetOrderPayment(orderId,{query:{enabled:!!orderId,queryKey:getGetOrderPaymentQueryKey(orderId)}});
  const methodsQuery = useListPublicPaymentMethods({query:{queryKey:getListPublicPaymentMethodsQueryKey()}});
  const methods = methodsQuery.data ?? [];
  const submit = useSubmitPayment();
  const [methodId,setMethodId]=useState(""); const [hash,setHash]=useState(""); const [copied,setCopied]=useState(false); const [notice,setNotice]=useState("");
  const [qrImage,setQrImage]=useState("");
  const options = payment?.paymentOptions ?? [];
  const quote = options.find(option=>option.paymentMethodId===methodId) ?? options[0] ?? null;
  const address = quote?.walletAddress || payment?.paymentAddress || "";
  const currency = quote?.currency || payment?.currency || "";
  const network = quote?.network || payment?.network || "";
  useEffect(()=>{ if (options.length && (!methodId || !options.some(option=>option.paymentMethodId===methodId))) setMethodId(options[0].paymentMethodId); },[options,methodId]);
  useEffect(()=>{
    if(!address){setQrImage("");return;}
    let active=true;
    void QRCode.toDataURL(address,{errorCorrectionLevel:"M",margin:1,width:176,color:{dark:"#b6ddc5",light:"#141917"}})
      .then((image)=>{if(active)setQrImage(image);})
      .catch(()=>{if(active)setQrImage("");});
    return()=>{active=false;};
  },[address]);
  async function copyAddress() { if (!address) return; try { await navigator.clipboard.writeText(address); setCopied(true); window.setTimeout(()=>setCopied(false),1800); } catch { setNotice("Clipboard access is unavailable. Select and copy the wallet address manually."); } }
  function submitHash(e:FormEvent) { e.preventDefault(); setNotice(""); if (!currency || !network) { setNotice("A payment method is not available for this order."); return; }
    if (!quote) { setNotice("A server-quoted payment option is required before payment can be submitted."); return; }
    submit.mutate({orderId,data:{currency,network,transactionHash:hash.trim(),quoteToken:quote.quoteToken} satisfies PaymentSubmissionInput},{onSuccess:()=>{void qc.invalidateQueries({queryKey:getGetOrderPaymentQueryKey(orderId)});setNotice("Transaction submitted for manual review.");},onError:()=>setNotice("We could not submit this transaction hash. Check it and try again.")});
  }
  if (!orderId) return <SiteFrame><div className="payment-state bt-wrap"><div className="state-icon"><CircleHelp size={19}/></div><h1>Order not found</h1><p>Open the payment link from your order confirmation, or start a new evaluation.</p><Link href="/checkout" className="bt-button">Choose an evaluation <ArrowRight size={14}/></Link></div></SiteFrame>;
  return <SiteFrame><main className="payment-page bt-wrap">
    <div className="payment-title"><p className="bt-kicker">Secure payment / Order {orderId.slice(0,8)}</p><h1>One last step.</h1><p>Use the payment details shown for this order, then submit your transaction hash for manual review.</p></div>
    {isLoading ? <Skeleton rows={3}/> : isError || !payment ? <ErrorNotice onRetry={()=>void refetch()} message="This order could not be found or its payment details are unavailable."/> :
      <div className="payment-layout"><section className="payment-main">
        <div className="payment-orderline"><span><small>Evaluation</small><b>{payment.challengeName}</b></span><span><small>Simulated account</small><b>{payment.accountSize}</b></span><span><small>Evaluation fee</small><b>${payment.price.toLocaleString()}</b></span></div>
        {payment.paymentStatus !== "PENDING" && <div className="payment-status"><Clock3 size={17}/><div><b>Status: {payment.paymentStatus.replaceAll("_"," ")}</b><p>{payment.paymentStatus==="PAYMENT_SUBMITTED"||payment.paymentStatus==="UNDER_REVIEW"?"Your transaction details have been submitted for manual review.":"This order is no longer awaiting an initial payment."}</p></div></div>}
        <div className="payment-section-head"><span className="step-num">01</span><div><h2>Select a payment method</h2><p>Only enabled methods available to this order are shown.</p></div></div>
        {options.length===0 ? <div className="empty-panel"><CreditCard size={18}/><span>No server-quoted payment options are available for this order. Please contact support before sending funds.</span></div> : <div className="method-list">{options.map(option=><button type="button" key={option.paymentMethodId} className={`method-option ${quote?.paymentMethodId===option.paymentMethodId?"selected":""}`} onClick={()=>setMethodId(option.paymentMethodId)}><span className="method-radio"/><span><b>{option.currency} · {option.network}</b><small>Server quote updated {new Date(option.quoteUpdatedAt).toLocaleString()}</small></span><strong className="quoted-amount">{String(option.amount)} {option.currency}</strong><ChevronRight size={16}/></button>)}</div>}
        <div className="public-method-note"><span className="bt-kicker">Enabled payment methods</span>{methodsQuery.isLoading?<span>Loading available networks…</span>:methodsQuery.isError?<span>Network directory unavailable; this order’s server quotes remain authoritative.</span>:methods.filter(m=>m.enabled).length?<span>{methods.filter(m=>m.enabled).map(m=>`${m.currency} · ${m.network}`).join(" / ")}</span>:<span>No other public payment methods are currently listed.</span>}</div>
        <div className="payment-section-head"><span className="step-num">02</span><div><h2>Send the exact evaluation fee</h2><p>Confirm network and address before sending. Transfers may not be reversible.</p></div></div>
        <div className="wallet-card"><div className="wallet-meta"><span className="bt-kicker">Receiving wallet</span><span>{currency || "Currency not set"} · {network || "Network not set"}</span></div>
          <div className="wallet-qr"><div className="qr-unavailable">{qrImage?<img className="wallet-qr-image" src={qrImage} alt={`Scan ${currency} ${network} receiving address`} />:<><QrCode size={27}/><b>QR unavailable</b><span>{address?"The wallet address QR could not be generated. Copy the address below.":"No wallet address is configured. Contact support before sending funds."}</span></>}</div><div className="wallet-amount"><small>Server-quoted payment amount</small><strong>{quote ? `${String(quote.amount)} ${quote.currency}` : `$${payment.price.toLocaleString()}`}</strong><span>{quote ? `Quote source: ${quote.quoteSource}` : "Evaluation fee · wallet quote unavailable"}</span></div></div>
        <p className="payment-quote-note">Crypto amounts are estimates, and network fees are not included. The server quote is bound to your order; the transaction is still checked manually before payment is approved.</p>
          <label className="bt-field address-label">Wallet address<div className="address-copy"><input readOnly value={address || "Wallet address not available"} aria-label="Receiving wallet address"/><button type="button" disabled={!address} onClick={()=>void copyAddress()} className="copy-button" data-testid="button-copy-address">{copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Copied":"Copy"}</button></div></label>
          {(quote?.instructions || payment.instructions) && <p className="payment-instructions">{quote?.instructions || payment.instructions}</p>}
        </div>
        <form className="hash-form" onSubmit={submitHash}><div className="payment-section-head"><span className="step-num">03</span><div><h2>Submit transaction hash</h2><p>Your payment is reviewed by a person. Submitting a hash does not mean the order is approved.</p></div></div>
          <label className="bt-field">Transaction hash<input required minLength={8} maxLength={200} value={hash} onChange={e=>setHash(e.target.value)} placeholder="Paste the transaction ID from your wallet" data-testid="input-transaction-hash"/></label>
          {notice && <p className={notice.startsWith("Transaction submitted")?"form-success":"form-error"} role="status">{notice}</p>}
          <button className="bt-button" type="submit" disabled={!quote||!address||!currency||!network||submit.isPending||!["PENDING","REJECTED"].includes(payment.paymentStatus)} data-testid="button-submit-payment">{submit.isPending?"Submitting…":"Submit for review"}<ArrowRight size={15}/></button>
        </form>
      </section><aside className="payment-aside"><span className="bt-kicker">Before you send</span><div className="checklist"><p><CheckCircle2 size={16}/> Match the network exactly</p><p><CheckCircle2 size={16}/> Verify the full wallet address</p><p><CheckCircle2 size={16}/> Send only the displayed amount</p><p><CheckCircle2 size={16}/> Save the transaction hash</p></div><div className="payment-disclaimer"><ShieldCheck size={17}/><p>BLACK Trading does not ask for seed phrases or private keys. All evaluation trading is simulated. Never send funds until you have verified the wallet details on this page.</p></div></aside></div>}
  </main></SiteFrame>;
}

const adminTabs = [
  ["overview","Overview"],["orders","Orders"],["challenges","Challenges"],["payments","Payment methods"],
  ["faq","FAQ"],["testimonials","Testimonials"],["media","Media"],["statistics","Statistics"],["settings","Site settings"],
] as const;
type AdminTab = typeof adminTabs[number][0];

function AdminEntry() {
  return <><Show when="signed-in"><AdminAccessGate /></Show><Show when="signed-out"><AdminSignInEntry /></Show></>;
}
function AdminAccessGate() {
  const {data,isLoading,isError,refetch}=useGetAdminDashboard({query:{queryKey:getGetAdminDashboardQueryKey(),retry:false}});
  const {signOut}=useClerk();
  if(isLoading)return <div className="admin-access-loading bt-wrap"><Skeleton rows={5}/></div>;
  if(isError||!data)return <main className="admin-auth"><div className="admin-auth-card"><Logo/><span className="bt-kicker">ACCESS RESTRICTED</span><h1>Admin access<br/><em>required.</em></h1><p>This signed-in account is not on the BLACK Trading administrator allowlist. No admin controls are available.</p><button className="bt-button secondary" type="button" onClick={()=>void refetch()}>Check access again <RefreshCw size={14}/></button><button className="admin-home-link" type="button" onClick={()=>void signOut({redirectUrl:basePath||"/"})}>Sign out</button><Link className="admin-home-link" href="/">Return to public site</Link></div><div className="admin-auth-visual"><div className="admin-seal"><span>BT</span><small>PRIVATE<br/>OPERATIONS</small></div><p>Administrative routes are protected by server-side authorization.</p></div></main>;
  return <AdminDashboardPage/>;
}
function AdminSignInEntry() {
  return <main className="admin-auth"><div className="admin-auth-card"><Logo/><span className="bt-kicker">Administrative access</span><h1>Operations,<br/><em>with clarity.</em></h1><p>Sign in with your authorized Clerk account to manage BLACK Trading orders and published content.</p><Link href="/sign-in" className="bt-button">Continue to sign in <ArrowRight size={15}/></Link><Link className="admin-home-link" href="/">Return to public site</Link></div><div className="admin-auth-visual"><div className="admin-seal"><span>BT</span><small>PRIVATE<br/>OPERATIONS</small></div><p>Access is restricted to authorized operators. API permissions remain in force after sign-in.</p></div></main>;
}

function AdminDashboardPage() {
  const [tab,setTab]=useState<AdminTab>("overview"); const {signOut}=useClerk(); const {user}=useUser();
  const menu = <aside className="admin-sidebar"><Link href="/" className="admin-logo"><Logo small/><span className="admin-tag">ADMIN</span></Link><div className="admin-side-label">WORKSPACE</div><nav>{adminTabs.map(([id,label],i)=><button type="button" key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><span className="side-index">0{i+1}</span>{label}{tab===id&&<ChevronRight size={14}/>}</button>)}</nav><div className="admin-side-bottom"><div className="admin-user"><span>{user?.firstName?.[0] ?? "A"}</span><div><b>{user?.fullName || "Administrator"}</b><small>{user?.primaryEmailAddress?.emailAddress || "Authorized account"}</small></div></div><button className="signout-button" type="button" onClick={()=>signOut({redirectUrl:basePath||"/"})}><LogOut size={15}/> Sign out</button><Link href="/" className="view-site"><ExternalLink size={14}/> View public site</Link></div></aside>;
  return <div className="admin-shell">{menu}<main className="admin-content"><div className="admin-mobile-head"><Link href="/"><Logo small/></Link><button type="button" onClick={()=>void signOut({redirectUrl:basePath||"/"})}><LogOut size={15}/> Sign out</button></div><header className="admin-page-head"><div><p className="bt-kicker">BLACK Trading / Operations</p><h1>{adminTabs.find(t=>t[0]===tab)?.[1]}</h1></div><div className="admin-live"><span/>PRIVATE WORKSPACE</div></header>
    {tab==="overview"&&<AdminOverview/>}
    {tab==="orders"&&<AdminOrders/>}
    {tab!=="overview"&&tab!=="orders"&&<AdminResource tab={tab}/>}
  </main></div>;
}

function AdminOverview() {
  const {data:dashboard,isLoading,isError,refetch}=useGetAdminDashboard();
  if(isLoading) return <Skeleton rows={5}/>;
  if(isError||!dashboard) return <AuthError onRetry={()=>void refetch()}/>;
  const items=[["Orders",dashboard.totalOrders,"All time"],["Pending payment",dashboard.pendingPayments,"Awaiting review"],["Paid",dashboard.paidOrders,"Orders"],["Rejected",dashboard.rejectedOrders,"Orders"]];
  return <div className="overview-body"><div className="admin-metrics">{items.map(([label,value,caption],i)=><div className="metric-card" key={label}><span className="metric-index">0{i+1}</span><small>{label}</small><strong>{value}</strong><span>{caption}</span></div>)}<div className="metric-card revenue"><span className="metric-index">05</span><small>Recorded revenue</small><strong>${Number(dashboard.revenue).toLocaleString()}</strong><span>From paid orders</span></div></div>
    <section className="admin-table-card"><div className="admin-table-head"><div><span className="bt-kicker">Recent activity</span><h2>Latest orders</h2></div><span className="table-count">{dashboard.recentOrders.length} RECORDS</span></div><OrdersTable orders={dashboard.recentOrders} compact/></section>
    <div className="admin-note"><ShieldCheck size={17}/><span>Public-facing statistics are managed separately. Only verified values are shown on the public site.</span></div></div>;
}
function AuthError({onRetry}:{onRetry:()=>void}) {
  return <div className="auth-error"><div className="state-icon"><LockKeyhole size={18}/></div><p className="bt-kicker">ACCESS CHECK</p><h2>Dashboard unavailable</h2><p>Your account may not have the required permissions, or the session may have expired. The API remains the source of access control.</p><button type="button" className="bt-button secondary" onClick={onRetry}>Retry request <RefreshCw size={14}/></button><Link href="/sign-in">Sign in with another account <ArrowRight size={14}/></Link></div>;
}
function OrdersTable({orders,compact=false}:{orders:Order[];compact?:boolean}) {
  const qc=useQueryClient(); const update=useUpdateAdminOrder({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminOrdersQueryKey()});void qc.invalidateQueries({queryKey:getGetAdminDashboardQueryKey()});}}});
  if(!orders.length) return <div className="admin-empty"><Activity size={18}/><b>No orders yet</b><span>New customer orders will appear here.</span></div>;
  return <div className="table-scroll"><table className="admin-table"><thead><tr><th>Customer</th><th>Evaluation</th><th>Amount</th><th>Transaction hash</th><th>Status</th><th>Created</th><th>Review</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><b>{o.fullName}</b><small>{o.email}</small></td><td>{o.challengeName}<small>{o.accountSize} simulated</small></td><td>${o.price.toLocaleString()}<small>{o.cryptoAmount !== null && o.currency ? `${String(o.cryptoAmount)} ${o.currency}${o.network ? ` · ${o.network}` : ""}` : "Evaluation fee"}</small></td><td><code className="order-hash">{o.transactionHash||"Not submitted"}</code></td><td><span className={`status-pill ${o.paymentStatus.toLowerCase()}`}>{o.paymentStatus.replaceAll("_"," ")}</span></td><td>{new Date(o.createdAt).toLocaleDateString()}</td><td><select aria-label={`Update order status for ${o.fullName}`} disabled={update.isPending} value={o.paymentStatus} onChange={e=>{const paymentStatus=e.target.value as Order["paymentStatus"];if(paymentStatus==="PAID"&&!window.confirm("Mark this order PAID only after manually verifying the on-chain transaction, amount, and network?")){e.target.value=o.paymentStatus;return;}update.mutate({orderId:o.id,data:{paymentStatus}});}}>{["PENDING","PAYMENT_SUBMITTED","UNDER_REVIEW","PAID","REJECTED","REFUNDED","CANCELLED"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></td></tr>)}</tbody></table>{compact&&orders.length>8&&<div className="table-foot">Showing the latest {orders.length} orders.</div>}</div>;
}
function AdminOrders() {
  const {data:orders,isLoading,isError,refetch}=useListAdminOrders();
  if(isLoading)return <Skeleton rows={5}/>;
  if(isError||!orders)return <AuthError onRetry={()=>void refetch()}/>;
  return <section className="admin-table-card"><div className="admin-table-head"><div><span className="bt-kicker">ORDER REVIEW / MANUAL</span><h2>Customer orders</h2></div><span className="table-count">{orders.length} RECORDS</span></div><OrdersTable orders={orders}/></section>;
}
type ResourceId = "challenges"|"payments"|"faq"|"testimonials"|"media"|"statistics"|"settings";
const resourceInfo:Record<ResourceId,{title:string;description:string;empty:string}> = {
  challenges:{title:"Evaluation catalogue",description:"Control public evaluation offers and their ordering.",empty:"No evaluations have been configured."},
  payments:{title:"Payment methods",description:"Maintain supported networks and receiving wallet instructions.",empty:"No payment methods have been configured."},
  faq:{title:"Frequently asked questions",description:"Publish clear answers for prospective customers.",empty:"No FAQ items have been configured."},
  testimonials:{title:"Customer stories",description:"Unverified comments are never presented as factual proof. Demo examples stay visibly labelled.",empty:"No customer stories have been configured."},
  media:{title:"Media library",description:"Manage announcements, stories, screenshots, or video references.",empty:"No media items have been configured."},
  statistics:{title:"Public statistics",description:"Only values marked both visible and verified appear publicly.",empty:"No statistics have been configured."},
  settings:{title:"Site identity & legal copy",description:"Update site details and legal placeholder content.",empty:"Site settings are not available."},
};
function AdminResource({tab}:{tab:Exclude<AdminTab,"overview"|"orders">}) {
  const qc=useQueryClient(); const resource=tab as ResourceId;
  const challenges=useListAdminChallenges();const methods=useListAdminPaymentMethods();const faqs=useListAdminFaqs();const testimonials=useListAdminTestimonials();const media=useListAdminMedia();const stats=useListAdminStatistics();const settings=useGetAdminSettings();
  const refreshPublic=()=>void qc.invalidateQueries({queryKey:getGetPublicSiteQueryKey()});
  const createChallenge=useCreateChallenge({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminChallengesQueryKey()});refreshPublic();}}});
  const updateChallenge=useUpdateChallenge({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminChallengesQueryKey()});refreshPublic();}}});
  const deleteChallenge=useDeleteChallenge({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminChallengesQueryKey()});refreshPublic();}}});
  const createMethod=useCreatePaymentMethod({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminPaymentMethodsQueryKey()});void qc.invalidateQueries({queryKey:getListPublicPaymentMethodsQueryKey()});}}});
  const updateMethod=useUpdatePaymentMethod({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminPaymentMethodsQueryKey()});void qc.invalidateQueries({queryKey:getListPublicPaymentMethodsQueryKey()});}}});
  const deleteMethod=useDeletePaymentMethod({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminPaymentMethodsQueryKey()});void qc.invalidateQueries({queryKey:getListPublicPaymentMethodsQueryKey()});}}});
  const createFaq=useCreateFaq({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminFaqsQueryKey()});refreshPublic();}}});
  const updateFaq=useUpdateFaq({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminFaqsQueryKey()});refreshPublic();}}});
  const deleteFaq=useDeleteFaq({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminFaqsQueryKey()});refreshPublic();}}});
  const createTestimonial=useCreateTestimonial({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminTestimonialsQueryKey()});refreshPublic();}}});
  const updateTestimonial=useUpdateTestimonial({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminTestimonialsQueryKey()});refreshPublic();}}});
  const deleteTestimonial=useDeleteTestimonial({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminTestimonialsQueryKey()});refreshPublic();}}});
  const createMedia=useCreateMedia({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminMediaQueryKey()});refreshPublic();}}});
  const updateMedia=useUpdateMedia({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminMediaQueryKey()});refreshPublic();}}});
  const deleteMedia=useDeleteMedia({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminMediaQueryKey()});refreshPublic();}}});
  const replaceStats=useReplaceAdminStatistics({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListAdminStatisticsQueryKey()});refreshPublic();}}});
  const updateSettings=useUpdateAdminSettings({mutation:{onSuccess:()=>{void qc.invalidateQueries({queryKey:getGetAdminSettingsQueryKey()});void qc.invalidateQueries({queryKey:getGetPublicSiteQueryKey()});}}});
  const queryMap:any={challenges, payments:methods, faq:faqs, testimonials, media, statistics:stats, settings};
  const query=queryMap[resource];
  const rows:any=resource==="challenges"?challenges.data:resource==="payments"?methods.data:resource==="faq"?faqs.data:resource==="testimonials"?testimonials.data:resource==="media"?media.data:resource==="statistics"?stats.data:settings.data;
  const [editing,setEditing]=useState<any>(null);const [json,setJson]=useState("");const [error,setError]=useState("");
  function edit(entry:any){setError("");setEditing(entry);setJson(JSON.stringify(entry,null,2));}
  function blank(){
    const defaults:any={
      challenges:{displayName:"",accountSize:"",price:0,description:"",rulesSummary:"",enabled:true,launchOffer:false,sortOrder:0},
      payments:{currency:"",network:"",walletAddress:"",enabled:true,instructions:""},
      faq:{question:"",answer:"",sortOrder:0,published:false},
      testimonials:{customerName:"",quote:"",verified:false,published:false,demo:true},
      media:{title:"",kind:"announcement",caption:"",assetUrl:null,published:false,demo:true,sortOrder:0},
      statistics:{label:"",value:"",verified:false,visible:false,sortOrder:0},
      settings:{companyName:"BLACK Trading",logoText:"BLACK",supportEmail:"",socialLinks:[],termsContent:"",privacyContent:""},
    };
    if(resource==="statistics") { setEditing({__bulk:true}); setJson(JSON.stringify((stats.data??[]).map(({id,...rest}:SiteStatistic)=>rest),null,2)); }
    else edit(defaults[resource]);
  }
  function save(){
    setError("");let parsed:any;
    try{parsed=JSON.parse(json);}catch{setError("This is not valid JSON. Fix the syntax before saving.");return;}
    if(resource==="statistics"&&!window.confirm("Replace all existing public statistics with this list? This removes the current rows."))return;
    const handlers={onSuccess:()=>setEditing(null),onError:()=>setError("The API could not save this record. Review the required fields and try again.")};
    if(resource==="challenges") {const body=parsed as ChallengeInput; if(editing.id) updateChallenge.mutate({id:editing.id,data:body},handlers);else createChallenge.mutate({data:body},handlers);}
    if(resource==="payments") {const body=parsed as PaymentMethodInput;if(editing.id)updateMethod.mutate({id:editing.id,data:body},handlers);else createMethod.mutate({data:body},handlers);}
    if(resource==="faq") {const body=parsed as FaqInput;if(editing.id)updateFaq.mutate({id:editing.id,data:body},handlers);else createFaq.mutate({data:body},handlers);}
    if(resource==="testimonials") {const body=parsed as TestimonialInput;if(editing.id)updateTestimonial.mutate({id:editing.id,data:body},handlers);else createTestimonial.mutate({data:body},handlers);}
    if(resource==="media") {const body=parsed as MediaInput;if(editing.id)updateMedia.mutate({id:editing.id,data:body},handlers);else createMedia.mutate({data:body},handlers);}
    if(resource==="statistics") {const items=Array.isArray(parsed)?parsed:parsed.statistics;replaceStats.mutate({data:{statistics:items} as StatisticsInput},handlers);}
    if(resource==="settings") updateSettings.mutate({data:parsed as SiteSettingsInput},handlers);
  }
  function remove(entry:any){
    if(!window.confirm(`Delete this ${resourceInfo[resource].title.toLowerCase()} item? This action cannot be undone.`))return;
    const callbacks={onError:()=>{edit(entry);setError("The API could not delete this item. It may be in use or your permissions may have changed.")}};
    if(resource==="challenges")deleteChallenge.mutate({id:entry.id},callbacks);
    if(resource==="payments")deleteMethod.mutate({id:entry.id},callbacks);
    if(resource==="faq")deleteFaq.mutate({id:entry.id},callbacks);
    if(resource==="testimonials")deleteTestimonial.mutate({id:entry.id},callbacks);
    if(resource==="media")deleteMedia.mutate({id:entry.id},callbacks);
  }
  const loading=query.isLoading;const failed=query.isError;const list=Array.isArray(rows)?rows:[];
  const busy=[createChallenge,updateChallenge,createMethod,updateMethod,createFaq,updateFaq,createTestimonial,updateTestimonial,createMedia,updateMedia,replaceStats,updateSettings].some(m=>m.isPending);
  return <section className="resource-section">
    <div className="resource-head"><div><span className="bt-kicker">{resource.toUpperCase()} / CONTENT CONTROL</span><h2>{resourceInfo[resource].title}</h2><p>{resourceInfo[resource].description}</p></div>{resource!=="settings"&&<button type="button" className="bt-button" onClick={blank}><Plus size={15}/>{resource==="statistics"?"Replace statistics":"Add item"}</button>}</div>
    {failed?<AuthError onRetry={()=>void query.refetch()}/>:loading?<Skeleton rows={4}/>:resource==="settings"?
      <div className="settings-card"><div className="settings-intro"><Globe2 size={19}/><div><h3>Site configuration</h3><p>Save the complete settings object returned by the API.</p></div></div><ResourceEntry item={rows} resource={resource} onEdit={()=>edit(rows)} onDelete={()=>{}} showDelete={false}/></div>:
      list.length===0?<div className="admin-empty"><CircleHelp size={19}/><b>{resourceInfo[resource].empty}</b><span>Create the first item when you’re ready.</span></div>:
      <div className="resource-list">{list.map((item:any)=><ResourceEntry key={item.id} item={item} resource={resource} onEdit={()=>edit(item)} onDelete={()=>remove(item)}/>)}</div>}
    {editing&&<div className="editor-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEditing(null);}}><section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-heading"><div className="editor-head"><div><span className="bt-kicker">EDIT / {resource.toUpperCase()}</span><h2 id="editor-heading">{editing.id?"Update item":editing.__bulk?"Replace statistics":"Create item"}</h2></div><button type="button" onClick={()=>setEditing(null)} aria-label="Close editor"><X size={18}/></button></div><p className="editor-hint">Edit the API-shaped record below. Keep required fields and value types intact.</p><textarea className="editor-json" spellCheck={false} value={json} onChange={e=>setJson(e.target.value)} aria-label={`${resource} JSON record`}/>{error&&<p className="form-error">{error}</p>}<div className="editor-actions"><button type="button" className="bt-button secondary" onClick={()=>setEditing(null)}>Cancel</button><button type="button" className="bt-button" disabled={busy} onClick={save}>{busy?"Saving…":"Save changes"}<Check size={15}/></button></div></section></div>}
  </section>;
}
function ResourceEntry({item,resource,onEdit,onDelete,showDelete=true}:{item:any;resource:ResourceId;onEdit:()=>void;onDelete:()=>void;showDelete?:boolean}) {
  if(!item) return <div className="admin-empty">No settings record returned.</div>;
  const title=resource==="challenges"?item.displayName:resource==="payments"?`${item.currency} · ${item.network}`:resource==="faq"?item.question:resource==="testimonials"?item.customerName:resource==="media"?item.title:resource==="statistics"?item.label:item.companyName;
  const summary=resource==="challenges"?`${item.accountSize} simulated · $${Number(item.price).toLocaleString()} · ${item.rulesSummary}`:resource==="payments"?item.walletAddress:resource==="faq"?item.answer:resource==="testimonials"?item.quote:resource==="media"?item.caption:resource==="statistics"?`Value: ${item.value}`:`Support: ${item.supportEmail}`;
  const published=resource==="challenges"?item.enabled:resource==="payments"?item.enabled:resource==="faq"||resource==="testimonials"||resource==="media"?item.published:resource==="statistics"?item.visible:true;
  return <article className="resource-entry"><div className="resource-entry-main"><div className="resource-entry-top"><h3>{title||"Untitled"}</h3><span className={`status-pill ${published?"paid":"pending"}`}>{published?"ACTIVE":"HIDDEN"}</span></div><p>{summary||"No additional details."}</p><div className="resource-tags">{resource==="challenges"&&item.launchOffer&&<span>LAUNCH OFFER</span>}{resource==="statistics"&&<span>{item.verified?"VERIFIED":"UNVERIFIED"}</span>}{resource==="testimonials"&&<><span>{item.verified?"VERIFIED":"UNVERIFIED"}</span>{item.demo&&<span>DEMO EXAMPLE</span>}</>}{resource==="media"&&<><span>{String(item.kind).toUpperCase()}</span>{item.demo&&<span>DEMO</span>}</>}</div></div><div className="resource-actions"><button type="button" onClick={onEdit} aria-label={`Edit ${title}`}>Edit</button>{showDelete&&<button type="button" className="delete-action" onClick={onDelete} aria-label={`Delete ${title}`}>Delete</button>}</div></article>;
}

function SignInPage(){return <div className="auth-page"><div className="auth-brand"><Link href="/"><Logo/></Link><div><span className="bt-kicker">BLACK TRADING / SECURE ACCESS</span><p>Return to your workspace with a clear view of what comes next.</p></div><Link href="/" className="auth-back"><ArrowRight size={14}/> Back to public site</Link></div><div className="auth-form"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}/></div></div>;}
function SignUpPage(){return <div className="auth-page"><div className="auth-brand"><Link href="/"><Logo/></Link><div><span className="bt-kicker">BLACK TRADING / GET STARTED</span><p>Create an account to continue with an evaluation.</p></div><Link href="/" className="auth-back"><ArrowRight size={14}/> Back to public site</Link></div><div className="auth-form"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`}/></div></div>;}

function HomeRedirect(){
  const {isLoaded,isSignedIn}=useUser();
  const {data,isLoading}=useGetAdminDashboard({query:{queryKey:getGetAdminDashboardQueryKey(),enabled:isLoaded&&isSignedIn===true,retry:false}});
  if(!isLoaded||!isSignedIn||(!isLoading&&!data))return <HomePage/>;
  if(isLoading)return <div className="home-access-check bt-wrap"><Skeleton rows={5}/></div>;
  return <Redirect to="/admin"/>;
}
function ClerkCacheInvalidator(){const {addListener}=useClerk();const qc=useQueryClient();const prev=useRef<string|null|undefined>(undefined);useEffect(()=>{const unsub=addListener(({user})=>{const id=user?.id??null;if(prev.current!==undefined&&prev.current!==id)qc.clear();prev.current=id;});return unsub;},[addListener,qc]);return null;}
function AppRoutes(){
  const [,setLocation]=useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{signIn:{start:{title:"Welcome back",subtitle:"Sign in to continue with BLACK Trading"}},signUp:{start:{title:"Create your account",subtitle:"A clearer process starts here"}}}}
    routerPush={to=>setLocation(stripBase(to))} routerReplace={to=>setLocation(stripBase(to),{replace:true})}>
    <QueryClientProvider client={queryClient}><ClerkCacheInvalidator/><Switch>
      <Route path="/" component={HomeRedirect}/><Route path="/checkout" component={CheckoutPage}/><Route path="/payment" component={PaymentPage}/>
      <Route path="/terms" component={TermsPage}/><Route path="/admin" component={AdminEntry}/>
      <Route path="/sign-in/*?" component={SignInPage}/><Route path="/sign-up/*?" component={SignUpPage}/>
      <Route component={()=><SiteFrame><div className="not-found bt-wrap"><span className="bt-kicker">404 / NOT FOUND</span><h1>That page<br/><em>isn’t here.</em></h1><Link href="/" className="bt-button">Return home <ArrowRight size={15}/></Link></div></SiteFrame>}/>
    </Switch></QueryClientProvider>
  </ClerkProvider>;
}
function App(){return <WouterRouter base={basePath}><AppRoutes/></WouterRouter>;}

export default App;
