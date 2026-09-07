import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Calculator,
  ClipboardList,
  Compass,
  FileText,
  Gauge,
  Layers,
  Megaphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MarketingNav } from '@/components/marketing/nav';
import { MarketingFooter } from '@/components/marketing/footer';
import { DashboardPreview } from '@/components/marketing/dashboard-preview';
import { PricingTable } from '@/components/marketing/pricing';
import { Faq, FAQ_ITEMS } from '@/components/marketing/faq';
import { Reveal } from '@/components/marketing/reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreBar } from '@/components/ui/score-ring';
import { getCurrentUser } from '@/lib/auth/current-user';
import { APP_DESCRIPTION, APP_NAME, appUrl } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'AI Product Research Tool for E-commerce Sellers',
  description: APP_DESCRIPTION,
  alternates: { canonical: '/' },
};

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: 'Add the product',
    body: 'Paste a product name, a marketplace URL, or your own notes. Nothing to install and no store connection required.',
  },
  {
    icon: Gauge,
    title: 'Get a structured assessment',
    body: 'Demand, competition, profitability and viral potential are scored consistently, with the reasoning behind each number.',
  },
  {
    icon: ClipboardList,
    title: 'Act on it',
    body: 'Model the unit economics, review competitor positioning, generate the listing and ad copy, then export the report.',
  },
];

const FEATURES = [
  {
    icon: Gauge,
    title: 'Product scoring',
    body: 'One 0-100 score built from four weighted sub-scores, so two products can actually be compared.',
  },
  {
    icon: Compass,
    title: 'Competitor analysis',
    body: 'Positioning, offer structure, angle and CTA for each competitor, plus a side-by-side comparison table.',
  },
  {
    icon: Calculator,
    title: 'Profit calculator',
    body: 'Margin, ROAS, break-even ROAS and break-even price, recalculated as you type.',
  },
  {
    icon: Search,
    title: 'SEO keywords',
    body: 'Primary, long-tail, buyer-intent, problem and question keywords in one table. Copy or export as CSV.',
  },
  {
    icon: FileText,
    title: 'Listing generator',
    body: 'Title, descriptions, bullets, FAQ, meta tags and image alt text — each section copyable on its own.',
  },
  {
    icon: Megaphone,
    title: 'Ad copy generator',
    body: 'Hooks, primary text, headlines and CTAs for Facebook, Instagram, TikTok and Google, in multiple angles.',
  },
  {
    icon: Users,
    title: 'Audience and persona',
    body: 'Age, interests, motivations and objections, distilled into a persona card you can write ads against.',
  },
  {
    icon: FileText,
    title: 'Reports and export',
    body: 'Save a snapshot of any analysis and export a formatted PDF for your team or your client.',
  },
];

const TOOL_CARDS = [
  {
    icon: Search,
    label: 'SEO keywords',
    body: 'Six keyword groups with intent classification, copy-to-clipboard and CSV export.',
    href: '/dashboard/keywords',
  },
  {
    icon: FileText,
    label: 'Listing generator',
    body: 'Conversion-focused copy with meta tags and alt text, regenerable section by section.',
    href: '/dashboard/listings',
  },
  {
    icon: Megaphone,
    label: 'Ad generator',
    body: 'Platform-native variations for Meta, TikTok and Google with short and long versions.',
    href: '/dashboard/ads',
  },
  {
    icon: Users,
    label: 'Audience builder',
    body: 'A persona card covering motivations, objections and the channels they actually use.',
    href: '/dashboard/audience',
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser().catch(() => null);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: APP_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: APP_DESCRIPTION,
        url: appUrl(),
        offers: [
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Pro', price: '19', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Business', price: '49', priceCurrency: 'USD' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav signedIn={Boolean(user)} />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden />
          <div className="container-page pb-16 pt-14 sm:pt-20 lg:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <Badge variant="outline" className="mx-auto">
                  <Sparkles className="size-3" aria-hidden />
                  AI-powered opportunity assessment
                </Badge>
              </Reveal>

              <Reveal delay={60}>
                <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                  Find winning products before you spend money.
                </h1>
              </Reveal>

              <Reveal delay={120}>
                <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">
                  {APP_DESCRIPTION}
                </p>
              </Reveal>

              <Reveal delay={180}>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href={user ? '/dashboard/research' : '/signup'}>
                      Analyze a product
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                    <Link href="#how-it-works">See how it works</Link>
                  </Button>
                </div>
                <p className="mt-4 text-xs text-fg-subtle">
                  5 free analyses every month · No card required · Cancel any time
                </p>
              </Reveal>
            </div>

            <Reveal delay={240}>
              <div className="mx-auto mt-14 max-w-4xl">
                <DashboardPreview />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Problem statement */}
        <section className="border-y border-line bg-surface">
          <div className="container-page py-16 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <Reveal>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">The real cost of guessing</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Most product research is a browser with forty tabs open.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-fg-muted">
                    A spreadsheet here, a competitor store there, a margin worked out on the back of an envelope. By
                    the time you have an answer you have either lost the week or ordered the inventory anyway.
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-fg-muted">
                    ProductPilot AI runs the same assessment every time, in one place, and shows its reasoning — so the
                    decision is yours but the homework is done.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Layers, title: 'One consistent framework', body: 'Every product judged on the same four dimensions.' },
                    { icon: Calculator, title: 'Economics up front', body: 'Know the break-even ROAS before you launch, not after.' },
                    { icon: Target, title: 'Positioning, not just data', body: 'What competitors say, and where the gap is.' },
                    { icon: ShieldCheck, title: 'Honest about limits', body: 'Estimates are labelled as estimates. Always.' },
                  ].map((item) => (
                    <li key={item.title} className="rounded-card bg-canvas p-5 hairline">
                      <item.icon className="size-5 text-fg-subtle" aria-hidden />
                      <p className="mt-3 text-sm font-medium text-fg">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-fg-muted">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">How it works</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  From product name to decision in about a minute.
                </h2>
              </div>
            </Reveal>

            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <Reveal as="li" key={step.title} delay={index * 90}>
                  <div className="h-full rounded-card bg-surface p-6 hairline shadow-subtle">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-fg">
                        {index + 1}
                      </span>
                      <step.icon className="size-5 text-fg-subtle" aria-hidden />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Everything in one place</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  The whole research workflow, not just a chat box.
                </h2>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delay={(index % 4) * 70}>
                  <div className="h-full rounded-card bg-canvas p-5 hairline">
                    <feature.icon className="size-5 text-fg-subtle" aria-hidden />
                    <h3 className="mt-3.5 text-sm font-semibold">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{feature.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Product scoring */}
        <section id="product-scoring" className="scroll-mt-20">
          <div className="container-page py-16 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Product scoring</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    A score you can actually interrogate.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-fg-muted">
                    The headline number is recomputed on the server from the four sub-scores, so it can never
                    contradict the breakdown beneath it. Each sub-score carries the reasoning that produced it.
                  </p>
                  <dl className="mt-6 space-y-3">
                    {[
                      ['Demand', 'How much genuine buyer interest the concept attracts.'],
                      ['Competition', 'How favourable the landscape is — higher means less crowding.'],
                      ['Profit potential', 'Headroom between realistic sourcing cost and retail price.'],
                      ['Viral potential', 'How well it demonstrates in short-form video.'],
                    ].map(([term, description]) => (
                      <div key={term} className="flex gap-3">
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-score-strong" aria-hidden />
                        <div>
                          <dt className="text-sm font-medium text-fg">{term}</dt>
                          <dd className="text-sm text-fg-muted">{description}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="rounded-card bg-surface p-6 shadow-subtle hairline">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Example product score</p>
                    <Badge variant="brand">
                      <Sparkles className="size-3" aria-hidden />
                      AI estimate
                    </Badge>
                  </div>
                  <p className="mt-4 text-6xl font-semibold tracking-tight tabular-nums text-score-strong">
                    87<span className="text-2xl text-fg-subtle">/100</span>
                  </p>
                  <div className="mt-6 space-y-4">
                    <ScoreBar label="Demand" score={91} />
                    <ScoreBar label="Competition" score={63} />
                    <ScoreBar label="Profit potential" score={88} />
                    <ScoreBar label="Viral potential" score={94} />
                  </div>
                  <p className="mt-6 text-xs leading-relaxed text-fg-subtle">
                    Illustrative figures. In the product every number is generated from the information you provide and
                    labelled as an AI estimate — never presented as measured market data.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Competitor analysis */}
        <section className="border-y border-line bg-surface">
          <div className="container-page py-16 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <div className="order-2 overflow-hidden rounded-card bg-canvas hairline lg:order-1">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Example competitor comparison</caption>
                    <thead>
                      <tr className="border-b border-line">
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                          Competitor
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                          Price
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-fg-subtle">
                          Angle
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Store A', '$39.99', 'Problem / solution demo'],
                        ['Store B', '$44.00', 'Social proof and reviews'],
                        ['Store C', '$29.95', 'Price anchoring vs retail'],
                      ].map((row) => (
                        <tr key={row[0]} className="border-b border-line last:border-0">
                          <td className="px-4 py-3 font-medium text-fg">{row[0]}</td>
                          <td className="px-4 py-3 tabular-nums text-fg-muted">{row[1]}</td>
                          <td className="px-4 py-3 text-fg-muted">{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="border-t border-line px-4 py-3 text-xs text-fg-subtle">
                    Example layout. Competitor pages are not fetched — the analysis reasons from the URLs and context
                    you supply, and says so in the report.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={100}>
                <div className="order-1 lg:order-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Competitor analysis</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    See the offer, not just the price.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-fg-muted">
                    Price is the easy part. What decides whether you can enter a category is how competitors are
                    positioning, what they bundle, which angle they lead with, and what nobody is saying yet.
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {[
                      'Positioning, selling points and target customer for each competitor',
                      'Offer structure and call to action, side by side',
                      'The angles everyone is using — and the gaps left over',
                      'A recommended position for your own store',
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-fg-muted">
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-score-strong" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Profit calculator */}
        <section id="calculator" className="scroll-mt-20">
          <div className="container-page py-16 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Profit calculator</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Know your break-even before you launch.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-fg-muted">
                    Enter cost, shipping, fees, ad spend and expected orders. Revenue, margin, ROAS, break-even ROAS and
                    break-even price update instantly — no AI involved, just arithmetic you can check.
                  </p>
                  <Button asChild className="mt-7">
                    <Link href="/dashboard/calculator">
                      Open the calculator
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="rounded-card bg-surface p-6 shadow-subtle hairline">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ['Revenue', '$9,997'],
                      ['Total profit', '$2,531'],
                      ['Profit margin', '25.3%'],
                      ['Break-even ROAS', '1.42'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-surface-muted p-4">
                        <p className="text-xs uppercase tracking-wide text-fg-subtle">{label}</p>
                        <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-fg-subtle">
                    <TrendingUp className="size-3.5" aria-hidden />
                    Example figures based on 250 orders at $39.99.
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* AI marketing tools */}
        <section className="border-y border-line bg-surface">
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">AI marketing tools</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Research is only useful if you can act on it.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Once a product passes the assessment, the same context feeds the copy you need to test it.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TOOL_CARDS.map((tool, index) => (
                <Reveal key={tool.label} delay={index * 70}>
                  <Link
                    href={tool.href}
                    className="group flex h-full flex-col rounded-card bg-canvas p-5 transition-colors hairline hover:border-line-strong"
                  >
                    <tool.icon className="size-5 text-fg-subtle" aria-hidden />
                    <h3 className="mt-3.5 text-sm font-semibold">{tool.label}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">{tool.body}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fg">
                      Open
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section>
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Your workspace</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Every product you have looked at, in one dashboard.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  Track what you have analysed, how it scored, and what you decided — with search, sorting and filters
                  by verdict.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="mx-auto mt-12 max-w-4xl">
                <DashboardPreview />
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: BarChart3, label: 'Portfolio view', body: 'Average score, verdict mix and recent activity at a glance.' },
                  { icon: FileText, label: 'Saved reports', body: 'Snapshots that never change under you, exportable as PDF.' },
                  { icon: ShieldCheck, label: 'Private by default', body: 'Ownership enforced server-side on every single request.' },
                ].map((item) => (
                  <div key={item.label} className="rounded-card bg-surface p-5 hairline">
                    <item.icon className="size-5 text-fg-subtle" aria-hidden />
                    <p className="mt-3 text-sm font-semibold">{item.label}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{item.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="mx-auto mb-10 max-w-2xl text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Pricing</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Start free. Upgrade when it pays for itself.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">
                  One bad inventory order costs more than a year of Pro.
                </p>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <PricingTable currentPlan={user?.plan} />
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="mx-auto mb-10 max-w-2xl text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">FAQ</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Questions worth asking.</h2>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-line">
          <div className="container-page py-16 lg:py-24">
            <Reveal>
              <div className="rounded-2xl bg-ink-950 px-6 py-14 text-center sm:px-12">
                <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Stop guessing which product to test next.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-300">
                  Run your first five analyses free. No card, no store connection, no setup.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                    <Link href={user ? '/dashboard/research' : '/signup'}>
                      Analyze a product
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="w-full text-ink-200 hover:bg-white/10 hover:text-white sm:w-auto">
                    <Link href="#how-it-works">See how it works</Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
