import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logo from "@/assets/rsf-logo.png.asset.json";
import {
  Sparkles, FileText, LayoutTemplate, Upload, Eye, DollarSign, Database, Package,
  Calculator, ScrollText, Users, History, Download, UsersRound, Cloud, GitBranch,
  Lightbulb, Check, X, Star, Menu, ArrowRight, Play, Shield, Zap, Award,
  Linkedin, Youtube, Facebook, Mail, Phone,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Proposal & Quotation Generator | Smart Template Manager | Enterprise Proposal Software" },
      { name: "description", content: "Generate professional quotations, proposals, and technical documents in minutes using AI. Import PDF, Word, or image templates and create pixel-perfect proposals automatically." },
      { name: "keywords", content: "AI Proposal Generator, AI Quotation Software, Quotation Generator, Proposal Generator, Template Manager, PDF Proposal Software, Business Proposal Software, CPQ Software, Sales Proposal Software, Quotation Management System, Enterprise Proposal Software" },
      { property: "og:title", content: "AI Proposal & Quotation Generator" },
      { property: "og:description", content: "Create pixel-perfect quotations and proposals in minutes with AI-powered templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const NAV = [
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
  { label: "Demo", href: "#demo" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const FEATURES = [
  { icon: Sparkles, title: "AI Proposal Generator", desc: "Generate complete technical proposals in seconds with context-aware AI." },
  { icon: FileText, title: "AI Quotation Generator", desc: "Auto-build itemized commercial quotations with tax, freight and terms." },
  { icon: LayoutTemplate, title: "Template Manager", desc: "Save, version and reuse a library of branded master templates." },
  { icon: Upload, title: "PDF Template Import", desc: "Upload any existing PDF quotation and turn it into a live editable template." },
  { icon: Upload, title: "Word Template Import", desc: "Bring your DOCX quotations directly into the system — coming soon." },
  { icon: Upload, title: "Image Template Import", desc: "OCR-powered import of scanned quotations and legacy paper documents." },
  { icon: Eye, title: "Live Proposal Preview", desc: "Pixel-perfect real-time PDF preview as you type." },
  { icon: DollarSign, title: "Dynamic Pricing", desc: "Formula-driven pricing with margin, discount and multi-currency support." },
  { icon: Database, title: "Machine Database", desc: "Central library of machines, capacities and specifications." },
  { icon: Package, title: "Product Manager", desc: "Manage products, variants, MOC and BOM with one click." },
  { icon: Calculator, title: "Utility Calculator", desc: "Instant utility, power and steam calculations for every plant." },
  { icon: ScrollText, title: "Terms & Conditions", desc: "Reusable T&C blocks for domestic and export quotations." },
  { icon: Users, title: "Customer CRM", desc: "Track leads, contacts, industries and proposal history per customer." },
  { icon: History, title: "Proposal History", desc: "Complete audit trail of every proposal, revision and approval." },
  { icon: Download, title: "Export PDF", desc: "One-click export to enterprise-grade PDF, ready to send." },
  { icon: UsersRound, title: "Multi-user Support", desc: "Invite your sales team with role-based access control." },
  { icon: Cloud, title: "Cloud Storage", desc: "Secure encrypted cloud storage with automatic backups." },
  { icon: GitBranch, title: "Version History", desc: "Rollback to any previous version of a proposal in one click." },
  { icon: Lightbulb, title: "AI Smart Suggestions", desc: "Contextual suggestions for scope, pricing and technical clauses." },
];

const STEPS = [
  { n: "01", title: "Import your quotation template", desc: "Drag & drop your existing PDF, Word or image quotation." },
  { n: "02", title: "AI analyzes your format", desc: "Our AI extracts layout, fields, tables and branding automatically." },
  { n: "03", title: "Save as Master Template", desc: "Approve the parsed template and store it in your library." },
  { n: "04", title: "Create New Proposal", desc: "Start a new proposal with customer, product and pricing details." },
  { n: "05", title: "Select Template", desc: "Pick any master template — the layout adapts instantly." },
  { n: "06", title: "Generate Professional PDF", desc: "Export a pixel-perfect PDF, ready to email to your customer." },
];

const PRICING = [
  {
    name: "Starter", price: "₹999", period: "/month", cta: "Start Free Trial", to: "/auth",
    highlight: false,
    features: ["1 User", "100 Proposals / month", "Basic Templates", "Email Support", "7-Day Free Trial"],
  },
  {
    name: "Professional", price: "₹2,999", period: "/month", cta: "Start Free Trial", to: "/auth",
    highlight: true, badge: "Most Popular",
    features: ["5 Users", "Unlimited Proposals", "Unlimited Templates", "AI Proposal Generator", "Template Manager", "PDF Import", "Priority Support"],
  },
  {
    name: "Enterprise", price: "Custom", period: "", cta: "Contact Sales", to: "/auth",
    highlight: false,
    features: ["Unlimited Users", "Unlimited Proposals", "Dedicated Support", "Custom Branding", "API Access", "Custom Features", "Training & Onboarding"],
  },
];

const TESTIMONIALS = [
  { name: "Rajesh Mehta", company: "Aurora Chemicals", country: "India", rating: 5,
    text: "We cut proposal turnaround from 2 days to 15 minutes. The AI understands our technical scope like a senior engineer." },
  { name: "Ahmed Khalil", company: "Nile Detergents", country: "Egypt", rating: 5,
    text: "The PDF import feature is magical. It picked up our existing quotation format perfectly on the first try." },
  { name: "Priya Nair", company: "SunSoap Industries", country: "UAE", rating: 5,
    text: "Enterprise-grade software at a startup price. Our sales team closes deals 3x faster now." },
  { name: "Marcus Chen", company: "PacRim Process Ltd", country: "Singapore", rating: 5,
    text: "Version history and multi-user access changed how our export team collaborates. Highly recommended." },
];

const FAQS = [
  { q: "How does the AI Template Manager work?", a: "Upload any existing quotation as PDF, Word or image. Our AI extracts your layout, fields, tables and branding and saves it as a reusable master template that stays pixel-perfect on every proposal." },
  { q: "Can I upload my existing quotation?", a: "Yes. Drag and drop any PDF, DOCX or scanned image — the AI parses it into an editable master template within seconds." },
  { q: "Does it support PDF?", a: "Absolutely. PDF import, live PDF preview and one-click PDF export are all first-class features." },
  { q: "Can I import Word files?", a: "Word (DOCX) import is on our short-term roadmap. Today you can convert Word to PDF and import that — the result is identical." },
  { q: "Can I customize templates?", a: "Yes. Every template supports custom fonts, colors, logos, headers, footers, tables and content blocks." },
  { q: "Can I use my company logo?", a: "Yes — upload your logo once and it flows into every template and proposal automatically." },
  { q: "Can I export PDF?", a: "Yes. Export enterprise-grade PDFs with a single click, ready to email your customer." },
  { q: "Is my data secure?", a: "Your data is stored on encrypted cloud infrastructure with automatic backups, row-level security and role-based access control." },
];

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-50 w-full transition-all ${scrolled ? "border-b border-border/60 bg-background/80 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="RSF" className="h-8 w-8 rounded-md object-contain" />
          <span className="text-sm font-bold tracking-tight">Rameshwar Steel Fab</span>
        </Link>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/auth"><Button variant="ghost" size="sm">Login</Button></Link>
          <Link to="/auth"><Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant">Start Free Trial</Button></Link>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{n.label}</a>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border/60 pt-3">
              <Link to="/auth" className="flex-1"><Button variant="outline" className="w-full" size="sm">Login</Button></Link>
              <Link to="/auth" className="flex-1"><Button className="w-full gradient-primary text-primary-foreground" size="sm">Start Free Trial</Button></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-accent/15 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-powered proposal automation
          </Badge>
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Generate Professional{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Quotations & Proposals</span>{" "}
            in Minutes with AI
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Create pixel-perfect quotations, proposals, and technical documents using AI-powered templates. Save time, reduce manual work, and impress your customers with enterprise-quality documents.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="h-12 gradient-primary px-6 text-primary-foreground shadow-elegant">
                Start 7-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="outline" className="h-12 px-6">
                <Play className="mr-2 h-4 w-4" /> Watch Demo
              </Button>
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {["No Credit Card Required", "7-Day Free Trial", "Secure Cloud Platform", "AI Powered", "Enterprise Ready"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />{b}</span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl">
          <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/20 via-accent/10 to-transparent blur-2xl" />
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elegant">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div className="grid grid-cols-12 gap-0">
      {/* Sidebar */}
      <div className="col-span-3 hidden flex-col gap-1 border-r border-border bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-sidebar-primary" />
          <div className="text-sm font-semibold">RSF Suite</div>
        </div>
        {["Dashboard", "Proposals", "Templates", "Customers", "Products", "Pricing", "Settings"].map((s, i) => (
          <div key={s} className={`rounded-md px-3 py-2 text-xs font-medium ${i === 1 ? "bg-sidebar-accent" : "opacity-70"}`}>{s}</div>
        ))}
      </div>
      {/* Main */}
      <div className="col-span-12 md:col-span-9">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="text-xs font-medium text-muted-foreground">Proposals / New</div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 rounded-md bg-muted" />
            <div className="h-6 w-20 rounded-md gradient-primary" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4 p-5">
          <div className="col-span-12 lg:col-span-5">
            <div className="rounded-lg border border-border p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Proposal</div>
              <div className="mt-1 text-sm font-semibold">PRO-2026-0148</div>
              <div className="mt-3 space-y-2">
                {["Customer: Aurora Chemicals", "Product: Detergent Powder Plant", "Capacity: 5 TPD", "MOC: SS 316"].map((t) => (
                  <div key={t} className="rounded-md bg-muted px-3 py-2 text-xs">{t}</div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
                <Sparkles className="h-3.5 w-3.5" /> AI drafting scope of supply…
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="text-[10px] text-muted-foreground">Total Value</div>
                <div className="text-sm font-bold">₹ 82,50,000</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-[10px] text-muted-foreground">Margin</div>
                <div className="text-sm font-bold text-success">+28.4%</div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <div className="rounded-lg border border-border bg-background p-5 shadow-elegant">
              <div className="mx-auto max-w-sm">
                <div className="h-2 w-24 rounded bg-primary" />
                <div className="mt-3 h-3 w-3/4 rounded bg-foreground/80" />
                <div className="mt-2 h-2 w-1/2 rounded bg-muted-foreground/40" />
                <div className="mt-4 space-y-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-1.5 w-full rounded bg-muted" style={{ width: `${90 - i * 6}%` }} />
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1 text-[8px]">
                  {["Item", "Qty", "Rate", "Amt"].map((h) => <div key={h} className="rounded-sm bg-muted px-1 py-0.5 font-semibold">{h}</div>)}
                  {Array.from({ length: 12 }).map((_, i) => <div key={i} className="rounded-sm bg-muted/60 px-1 py-0.5">···</div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoStrip() {
  const brands = ["ACME CORP", "NORTHWIND", "CONTOSO", "GLOBEX", "INITECH", "SOYLENT"];
  return (
    <div className="border-y border-border/60 bg-muted/30 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Trusted by manufacturing leaders across 20+ countries</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
          {brands.map((b) => <span key={b} className="text-sm font-black tracking-widest text-muted-foreground">{b}</span>)}
        </div>
      </div>
    </div>
  );
}

function Section({ id, eyebrow, title, subtitle, children }: { id?: string; eyebrow?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        {eyebrow && <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</div>}
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">{title}</h2>
        {subtitle && <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>}
      </div>
      <div className="mt-14">{children}</div>
    </section>
  );
}

function Features() {
  return (
    <Section id="features" eyebrow="Features" title="Everything you need to close deals faster" subtitle="A complete proposal automation suite built for industrial manufacturers, EPC firms and B2B sales teams.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="group rounded-2xl border border-border/70 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-elegant">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-elegant">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function HowItWorks() {
  return (
    <Section id="templates" eyebrow="How it works" title="From messy PDF to pixel-perfect proposal in 6 steps" subtitle="No IT team required. Import once, generate forever.">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
            <div className="text-5xl font-black text-primary/10">{s.n}</div>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function WhyChoose() {
  const bad = ["Manual Formatting", "Repetitive Work", "Slow Proposal Creation", "High Error Rate", "Inconsistent Design"];
  const good = ["AI Generated Content", "Pixel Perfect Layout", "Enterprise Templates", "Professional PDFs", "Save 90% Time"];
  return (
    <Section eyebrow="Why choose us" title="Retire the copy-paste era of quotations" subtitle="See how your sales team goes from hours to minutes.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
          <div className="mb-4 flex items-center gap-2 text-destructive">
            <X className="h-5 w-5" /><h3 className="text-lg font-bold">Traditional Method</h3>
          </div>
          <ul className="space-y-3">
            {bad.map((b) => <li key={b} className="flex items-center gap-3 text-sm"><X className="h-4 w-4 text-destructive" /><span className="text-muted-foreground line-through">{b}</span></li>)}
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-accent/40 bg-card p-8 shadow-elegant">
          <div className="mb-4 flex items-center gap-2 text-accent">
            <Sparkles className="h-5 w-5" /><h3 className="text-lg font-bold">Our AI Platform</h3>
          </div>
          <ul className="space-y-3">
            {good.map((g) => <li key={g} className="flex items-center gap-3 text-sm font-medium"><Check className="h-4 w-4 text-success" />{g}</li>)}
          </ul>
        </div>
      </div>
    </Section>
  );
}

function Screenshots() {
  const shots = ["Dashboard", "Proposal Generator", "Quotation Generator", "Template Manager", "PDF Preview", "Product Manager", "Pricing Manager", "Customer CRM"];
  return (
    <Section id="demo" eyebrow="Product Tour" title="A closer look at the platform" subtitle="Every module designed with enterprise polish and startup speed.">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {shots.map((s, i) => (
          <div key={s} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted to-background p-4">
            <div className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-50" style={{ background: "linear-gradient(135deg, oklch(0.58 0.18 258 / 0.15), transparent 60%)" }} />
            <div className="flex h-full flex-col justify-between">
              <div className="h-2 w-1/3 rounded bg-primary/60" />
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded bg-foreground/10" />
                <div className="h-1.5 w-3/4 rounded bg-foreground/10" />
                <div className="h-1.5 w-1/2 rounded bg-foreground/10" />
              </div>
              <div className="text-[11px] font-semibold text-foreground">{s}</div>
            </div>
            <div className="absolute right-3 top-3 text-[10px] font-mono text-muted-foreground">0{i + 1}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Pricing() {
  return (
    <Section id="pricing" eyebrow="Pricing" title="Simple, transparent pricing" subtitle="Start free for 7 days. No credit card required. Upgrade when you're ready.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PRICING.map((p) => (
          <div key={p.name} className={`relative rounded-2xl border p-8 ${p.highlight ? "border-accent bg-card shadow-elegant lg:-my-4 lg:py-12" : "border-border bg-card/60"}`}>
            {p.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">{p.badge}</div>}
            <div className="text-sm font-semibold text-accent">{p.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold">{p.price}</span>
              <span className="text-sm text-muted-foreground">{p.period}</span>
            </div>
            <Link to={p.to} className="mt-6 block">
              <Button className={`w-full ${p.highlight ? "gradient-primary text-primary-foreground shadow-elegant" : ""}`} variant={p.highlight ? "default" : "outline"} size="lg">{p.cta}</Button>
            </Link>
            <ul className="mt-6 space-y-3">
              {p.features.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-sidebar p-10 text-sidebar-foreground sm:p-16">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-primary/40 blur-3xl" />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Start Your Free 7-Day Trial Today</h2>
          <p className="mt-4 text-base opacity-80 sm:text-lg">No Credit Card Required · Instant Access · Cancel Anytime</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth"><Button size="lg" className="h-12 bg-white px-6 text-sidebar hover:bg-white/90">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <a href="#contact"><Button size="lg" variant="outline" className="h-12 border-white/30 bg-transparent px-6 text-white hover:bg-white/10">Talk to Sales</Button></a>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs opacity-70">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> SOC-ready infra</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Setup in 2 minutes</span>
            <span className="inline-flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> Enterprise grade</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <Section eyebrow="Testimonials" title="Loved by sales & engineering teams" subtitle="Real stories from customers shipping proposals faster than ever.">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-elegant/50">
            <div className="flex items-center gap-1 text-warning">
              {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">"{t.text}"</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                {t.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">{t.company} · {t.country}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FAQ() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Frequently asked questions" subtitle="Everything you need to know before starting your free trial.">
      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`i-${i}`} className="rounded-xl border border-border bg-card px-5 mb-3">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  );
}

function Footer() {
  const cols = [
    { title: "Product", links: ["Features", "Pricing", "Templates", "Demo"] },
    { title: "Company", links: ["About", "Contact", "Careers", "Blog"] },
    { title: "Resources", links: ["Help Center", "Documentation", "API", "Changelog"] },
    { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Security", "DPA"] },
  ];
  return (
    <footer id="contact" className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <img src={logo.url} alt="RSF" className="h-9 w-9 rounded-md object-contain" />
              <span className="text-sm font-bold">Rameshwar Steel Fab</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI-powered proposal & quotation platform for industrial manufacturers and EPC teams worldwide.
            </p>
            <div className="mt-5 flex gap-3">
              {[Linkedin, Youtube, Facebook].map((I, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"><I className="h-4 w-4" /></a>
              ))}
            </div>
            <div className="mt-5 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> sales@rameshwarsteelfab.com</div>
              <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> +91 98250 00000</div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-bold uppercase tracking-widest text-foreground">{c.title}</div>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => <li key={l}><a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Rameshwar Steel Fab. All rights reserved.</div>
          <div className="text-xs text-muted-foreground">Made with care for manufacturing teams worldwide.</div>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <HowItWorks />
        <WhyChoose />
        <Screenshots />
        <Pricing />
        <CTA />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
