import 'server-only';
import type { AIProvider, CompletionRequest, CompletionResponse } from '@/lib/ai/provider';
import { AppError } from '@/lib/errors';
import { safeHostname } from '@/lib/utils';

/**
 * Offline provider used when no AI API key is configured.
 *
 * It exists so the product is fully explorable without credentials — every row
 * it produces is flagged `isDemo` in the database and rendered behind a "Sample
 * output" banner in the UI. It is never used when a real provider is available,
 * and it never claims to have consulted any external data source.
 */
export class DemoProvider implements AIProvider {
  readonly id = 'demo';
  readonly model = 'demo-heuristic-v1';
  readonly isDemo = true;

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const context = request.context ?? {};
    const seedSource = String(context.productName ?? request.prompt).toLowerCase();
    const rng = makeRng(seedSource);

    const output = build(request.operation, context, rng);
    if (!output) {
      throw new AppError('AI_UNAVAILABLE', 'Demo mode does not support this operation yet.');
    }

    // A short delay keeps the multi-step progress UI honest rather than
    // flashing results instantly in a way real inference never would.
    await new Promise((resolve) => setTimeout(resolve, 250));

    const raw = JSON.stringify(output);
    return { output, raw, model: this.model, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  estimateCost() {
    return 0;
  }
}

type Rng = () => number;

function makeRng(seed: string): Rng {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function between(rng: Rng, min: number, max: number) {
  return Math.round(min + rng() * (max - min));
}

function pick<T>(rng: Rng, options: readonly T[]): T {
  return options[Math.floor(rng() * options.length) % options.length] as T;
}

function build(operation: string, context: Record<string, unknown>, rng: Rng): unknown {
  const name = String(context.productName ?? 'Sample product').slice(0, 90);
  switch (operation) {
    case 'product_analysis':
      return productAnalysis(name, context, rng);
    case 'competitor_analysis':
      return competitorAnalysis(name, context, rng);
    case 'keyword_research':
      return keywordResearch(name, rng);
    case 'listing_generation':
      return listingGeneration(name, rng);
    case 'ad_generation':
      return adGeneration(name, context, rng);
    case 'audience_analysis':
      return audienceAnalysis(name, rng);
    default:
      return null;
  }
}

function productAnalysis(name: string, context: Record<string, unknown>, rng: Rng) {
  const demand = between(rng, 55, 93);
  const competition = between(rng, 38, 84);
  const profit = between(rng, 45, 90);
  const viral = between(rng, 40, 95);
  const overall = Math.round(demand * 0.32 + competition * 0.22 + profit * 0.28 + viral * 0.18);
  const verdict = overall >= 75 ? 'STRONG' : overall >= 60 ? 'POTENTIAL' : overall >= 45 ? 'RISKY' : 'AVOID';
  const sourcingMin = Number((4 + rng() * 9).toFixed(2));
  const sourcingMax = Number((sourcingMin * (1.3 + rng() * 0.4)).toFixed(2));
  const priceMin = Number((sourcingMax * (2.4 + rng() * 0.6)).toFixed(2));
  const priceMax = Number((priceMin * 1.35).toFixed(2));
  const margin = Number((((priceMin - sourcingMax) / priceMin) * 100).toFixed(1));

  return {
    productName: name,
    category: String(context.category ?? pick(rng, ['Home & kitchen', 'Consumer electronics', 'Pet supplies', 'Health & wellness', 'Car accessories'])),
    overview: `${name} is a compact consumer product sold mainly through direct-to-consumer stores and marketplaces. Demonstration-friendly products in this space usually sell on a clear before/after transformation rather than on specifications. This is sample output generated in demo mode.`,
    targetAudience: 'Convenience-driven shoppers aged 25-44 who buy from short-form video, value time savings, and are comfortable ordering unfamiliar brands online.',
    painPoint: 'A recurring everyday annoyance that existing solutions handle awkwardly — bulky, slow, or expensive alternatives leave an opening for a simpler product.',
    scores: { demand, competition, profit, viral },
    scoreReasoning: {
      demand: 'Steady evergreen interest with a recognisable use case that does not need explaining.',
      competition: 'A crowded but undifferentiated field — most listings compete on price rather than positioning.',
      profit: `A ${margin.toFixed(0)}% gross margin at the recommended price leaves room for paid acquisition.`,
      viral: 'The product demonstrates well in under 10 seconds, which suits short-form video.',
    },
    verdict,
    verdictReasoning: `Weighting demand and profitability most heavily gives an overall score of ${overall}. The opportunity depends on differentiating the offer rather than the product itself, since the hardware is widely available.`,
    pricing: {
      currency: 'USD',
      sourcingPriceMin: sourcingMin,
      sourcingPriceMax: sourcingMax,
      recommendedPriceMin: priceMin,
      recommendedPriceMax: priceMax,
      estimatedMarginPercent: margin,
      rationale: 'Priced to sustain a 3x+ markup over landed cost, which is the usual floor for products acquired through paid social.',
    },
    marketSaturation: {
      level: competition > 70 ? 'LOW' : competition > 55 ? 'MODERATE' : 'HIGH',
      explanation: 'Many sellers list near-identical units, so differentiation has to come from bundling, content and brand rather than the product itself.',
    },
    seasonality: {
      dependency: pick(rng, ['NONE', 'LOW', 'MODERATE'] as const),
      peakPeriods: ['Q4 gifting season', 'New-year resolution period'],
      explanation: 'Sales are broadly year-round with a gifting lift late in the year.',
    },
    trend: {
      direction: pick(rng, ['GROWING', 'STABLE', 'SEASONAL'] as const),
      score: between(rng, 45, 85),
      explanation: 'Directional reasoning from the product description only. No live trend data source is connected.',
    },
    swot: {
      strengths: ['Immediately understandable benefit', 'Demonstrates well on video', 'Low unit cost supports strong margins', 'Compact and cheap to ship'],
      weaknesses: ['Little technical moat', 'Easily copied by competitors', 'Quality varies between suppliers'],
      opportunities: ['Bundle with a consumable for repeat purchases', 'Own an underserved niche audience', 'Build a branded content library competitors lack'],
      risks: ['Margin erosion from price competition', 'Return rates if quality is inconsistent', 'Ad account dependency on a single channel'],
    },
    marketingChannels: [
      { channel: 'TikTok organic + Spark Ads', priority: 'HIGH', why: 'The demonstration format matches how the product proves its value.', firstStep: 'Film five 15-second before/after demos and boost the two with the best hold rate.' },
      { channel: 'Meta Advantage+ campaigns', priority: 'HIGH', why: 'Broad targeting works well for wide-appeal convenience products.', firstStep: 'Launch one campaign with three creative angles and a $30/day budget.' },
      { channel: 'Google Shopping', priority: 'MEDIUM', why: 'Captures buyers already searching for the category.', firstStep: 'Publish a product feed and bid on branded plus category terms.' },
    ],
    audienceSnapshot: {
      ageRange: '25-44',
      gender: 'Skews female (roughly 60/40)',
      interests: ['Home organisation', 'Time-saving gadgets', 'Online shopping', 'Short-form video'],
    },
    confidence: 'LOW',
    assumptions: [
      'Generated in demo mode without a connected AI provider.',
      'Pricing assumes standard overseas sourcing and light shipping.',
    ],
  };
}

function competitorAnalysis(name: string, context: Record<string, unknown>, rng: Rng) {
  const urls = Array.isArray(context.competitorUrls) ? (context.competitorUrls as string[]) : [];
  const sources = urls.length > 0 ? urls : ['', '', ''];

  const competitors = sources.slice(0, 6).map((url, index) => {
    const price = Number((18 + rng() * 45).toFixed(2));
    const label = url ? safeHostname(url) : `Sample competitor ${index + 1}`;
    return {
      name: label,
      url: url || '',
      estimatedPrice: price,
      currency: 'USD',
      positioning: pick(rng, ['Value-led challenger', 'Premium specialist', 'Mass-market generalist', 'Niche community brand']),
      sellingPoints: ['Free shipping over a threshold', 'Bundle discount on multi-packs', '30-day money-back guarantee'],
      targetCustomer: 'Price-aware online shoppers who compare two or three stores before buying.',
      strengths: ['Established review volume', 'Fast checkout experience'],
      weaknesses: ['Generic product photography', 'Thin post-purchase content'],
      marketingAngle: pick(rng, ['Problem/solution demo', 'Social proof and reviews', 'Price anchoring against retail']),
      offerStructure: 'Single unit plus a discounted 2-pack, free shipping above $35.',
      cta: pick(rng, ['Shop now', 'Get yours today', 'Claim the bundle']),
      estimatedPositioning: price > 45 ? 'Premium' : price > 28 ? 'Mid-market' : 'Value',
    };
  });

  const prices = competitors.map((entry) => entry.estimatedPrice);

  return {
    summary: `Sample competitive picture for ${name}. Competitors cluster around similar offers, which usually means positioning, not price, is where a new entrant can win. This is demo output — no competitor pages were fetched.`,
    competitors,
    comparison: {
      priceRangeMin: Number(Math.min(...prices).toFixed(2)),
      priceRangeMax: Number(Math.max(...prices).toFixed(2)),
      commonAngles: ['Convenience and time saved', 'Price versus retail alternatives', 'Reviews and social proof'],
      marketGaps: ['No competitor speaks to a specific niche', 'Post-purchase experience is neglected', 'Little educational content'],
      differentiationOpportunities: ['Lead with a named niche audience', 'Offer a starter bundle with a consumable', 'Publish comparison content that competitors avoid'],
    },
    recommendedPositioning: 'Position against the category default rather than on price: pick one audience, name it explicitly in the creative, and build the offer around their specific use case.',
    confidence: 'LOW',
  };
}

function keywordResearch(name: string, rng: Rng) {
  const base = name.toLowerCase();
  const groups = [
    { group: 'PRIMARY', items: [base], intent: 'COMMERCIAL' },
    { group: 'SECONDARY', items: [`${base} review`, `best ${base}`, `${base} price`, `buy ${base}`], intent: 'COMMERCIAL' },
    { group: 'LONG_TAIL', items: [`${base} for small apartments`, `portable ${base} for travel`, `${base} with usb charging`, `quiet ${base} for home use`], intent: 'COMMERCIAL' },
    { group: 'BUYER_INTENT', items: [`${base} free shipping`, `${base} discount code`, `order ${base} online`, `${base} bundle deal`], intent: 'TRANSACTIONAL' },
    { group: 'PROBLEM', items: [`how to avoid ${base} mess`, `${base} alternative that actually works`, `cheap way to replace ${base}`], intent: 'INFORMATIONAL' },
    { group: 'QUESTION', items: [`is ${base} worth it`, `how does ${base} work`, `what is the best ${base}`, `does ${base} last`], intent: 'INFORMATIONAL' },
  ] as const;

  const keywords = groups.flatMap((entry) =>
    entry.items.map((keyword) => ({
      keyword: keyword.slice(0, 90),
      group: entry.group,
      rationale: 'Sample keyword generated in demo mode; validate against a real keyword tool before committing budget.',
      estimatedIntent: entry.intent,
    })),
  );

  return {
    primaryKeyword: base,
    suggestedProductTitle: `${name} — Compact, Easy to Use, Built for Everyday${rng() > 0.5 ? ' Use' : ''}`.slice(0, 120),
    keywords,
    notes: 'Search volumes are deliberately omitted: this tool does not connect to a keyword data source, so any number here would be invented.',
  };
}

function listingGeneration(name: string, rng: Rng) {
  const benefit = pick(rng, ['saves you time every day', 'keeps things tidy without effort', 'works anywhere you need it']);
  return {
    title: `${name} — Compact Everyday Essential That ${benefit.charAt(0).toUpperCase()}${benefit.slice(1)}`.slice(0, 140),
    shortDescription: `${name} handles a small daily annoyance in seconds. Compact enough to keep within reach and simple enough that there is nothing to learn. Sample copy generated in demo mode.`,
    longDescription: `${name} was designed around one idea: the job should take seconds, not minutes.\n\nMost alternatives are bulkier than they need to be, which is why they end up in a cupboard instead of where you actually use them. ${name} is small enough to keep out, quiet enough to use any time, and simple enough that anyone in the household can pick it up without instructions.\n\nCharge it, keep it nearby, and use it whenever the moment comes up. A single charge covers a typical week of regular use, and the cleanup afterwards takes about as long as the job itself.\n\nThis is demonstration copy produced without a connected AI provider. Replace it with generated copy once an API key is configured.`,
    bulletPoints: [
      'Compact enough to keep exactly where you use it',
      'Rechargeable — a week of typical use per charge',
      'Quiet operation that will not disturb the room',
      'Simple one-button operation, nothing to learn',
      'Easy to rinse and dry between uses',
    ],
    benefits: ['Takes seconds instead of minutes', 'Keeps clutter out of sight', 'Works anywhere without a power outlet'],
    features: ['Rechargeable battery', 'One-button control', 'Detachable, washable parts', 'Travel-friendly size'],
    faq: [
      { question: 'How long does a charge last?', answer: 'A full charge covers roughly a week of typical daily use. Recharging takes about two hours over USB-C.' },
      { question: 'Is it noisy?', answer: 'It runs at conversation level, so it can be used at any time of day without disturbing the room.' },
      { question: 'How do I clean it?', answer: 'The removable parts rinse under warm water. Let them dry fully before reassembling.' },
      { question: 'What is in the box?', answer: 'The unit, a USB-C charging cable, and a short quick-start guide.' },
    ],
    metaTitle: `${name} | Compact Everyday Essential`.slice(0, 68),
    metaDescription: `${name} handles a daily annoyance in seconds. Rechargeable, quiet and compact enough to keep exactly where you need it. Free shipping available.`.slice(0, 175),
    imageAltTexts: [
      `${name} shown on a kitchen counter next to everyday items`,
      `Close-up of the ${name} control button and charging port`,
      `${name} disassembled to show the washable parts`,
      `Person holding ${name} to show its compact size`,
    ],
  };
}

function adGeneration(name: string, context: Record<string, unknown>, rng: Rng) {
  const requested = Array.isArray(context.platforms) ? (context.platforms as string[]) : ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE'];
  const guidance: Record<string, string> = {
    FACEBOOK: 'Longer primary text works here — lead with the problem before the product.',
    INSTAGRAM: 'Visual-first: the caption supports the creative rather than carrying it.',
    TIKTOK: 'Native, unpolished tone. The hook must land within two seconds.',
    GOOGLE: 'Search intent is already there — be specific and lead with the offer.',
  };

  return {
    platforms: requested.slice(0, 4).map((platform) => ({
      platform,
      guidance: guidance[platform] ?? 'Match the platform’s native tone.',
      variations: [
        {
          angle: 'Problem/solution',
          hook: `Still doing this the hard way?`,
          primaryText: `Most people put up with the mess because the alternatives are bulky and slow. ${name} does the same job in seconds and lives right where you need it. Sample ad copy generated in demo mode.`,
          headline: `${name}: the two-second fix`.slice(0, 110),
          cta: 'Shop now',
          shortVersion: `${name} does it in seconds. Keep it where you need it.`,
          longVersion: `You have probably tried the bulky version and given up on it. ${name} is small enough to leave out, quiet enough to use any time, and simple enough that you actually reach for it. One charge covers a normal week. If it does not fit your routine, send it back within 30 days. This is demonstration copy produced without a connected AI provider — replace it once your API key is configured.`,
        },
        {
          angle: 'Social proof',
          hook: `${between(rng, 3, 18)},000+ people made the switch`,
          primaryText: `Buyers keep saying the same thing: they use it far more than they expected because it is always within reach. ${name} is built around that one idea. Sample ad copy generated in demo mode.`,
          headline: `Why ${name} keeps selling out`.slice(0, 110),
          cta: 'Get yours',
          shortVersion: `Thousands switched to ${name}. Here is why.`,
          longVersion: `The most common piece of feedback is not about the product at all — it is about how often people end up using it. Because ${name} is compact and quiet, it stays out where it is needed instead of disappearing into a cupboard. Backed by a 30-day return window. This is demonstration copy produced without a connected AI provider.`,
        },
      ],
    })),
  };
}

function audienceAnalysis(name: string, rng: Rng) {
  const age = between(rng, 27, 41);
  return {
    ageRange: '25-44',
    gender: 'Skews female, roughly 60/40',
    location: 'Urban and suburban areas in the US, UK, Canada and Australia',
    interests: ['Home organisation', 'Time-saving gadgets', 'Short-form video', 'Online shopping', 'Practical DIY'],
    problems: ['The current method takes too long', 'Existing tools are bulky and get put away', 'Cheap alternatives break quickly'],
    buyingMotivations: ['Save time on a daily task', 'Reduce visible clutter', 'Buy something that will actually get used'],
    objections: ['“Will it last more than a few months?”', '“Is it loud?”', '“Another gadget I will forget about”'],
    desiredOutcome: 'A small daily task stops being a task at all — it takes seconds, needs no setup, and the tool stays out of the way when not in use.',
    persona: {
      name: 'Sample persona (demo mode)',
      age,
      occupation: 'Operations coordinator',
      location: 'Suburban apartment, mid-sized city',
      bio: `Buys practical things that solve a specific annoyance, usually after seeing them demonstrated rather than described. Reads two or three reviews and checks the return policy before ordering from a brand for the first time. Interested in ${name} because the problem is one they run into most days.`,
      quote: '“If it takes longer to get out than to use, I will not use it.”',
      goals: ['Spend less time on repetitive chores', 'Keep the home tidy without a system to maintain', 'Buy fewer, better things'],
      frustrations: ['Products that overpromise in the ad', 'Anything that needs assembly before every use', 'Slow or unclear returns'],
      shoppingBehaviour: 'Discovers products through short-form video, then searches the brand name plus “review” before buying. Prefers free shipping over a small discount.',
      preferredChannels: ['TikTok', 'Instagram', 'Google Search', 'Email'],
    },
  };
}
