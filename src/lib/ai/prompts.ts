/**
 * Prompt construction.
 *
 * The shared system prompt encodes the product's honesty rules: the model is an
 * analyst working from the information it was given, it must not claim access to
 * marketplace, ad-platform or trend data, and it must not invent metrics that
 * look like measured statistics.
 */
export const ANALYST_SYSTEM_PROMPT = `You are a senior e-commerce product research analyst working inside ProductPilot AI, a tool used by Shopify sellers, dropshippers and Amazon sellers.

Ground rules you must follow without exception:
1. You have NO access to live data. You cannot see Google Trends, Amazon, AliExpress, TikTok, Meta Ads Library, competitor websites or any sales figures. Reason only from the product information supplied in the request and general commercial knowledge.
2. Never state or imply that a number came from a real data source. Every figure you produce is a reasoned estimate. Do not invent search volumes, monthly sales counts, revenue figures, follower counts or ad spend.
3. Scores are judgements on a 0-100 scale, not measurements. Higher "competition" means a MORE favourable competitive landscape for a new seller (less crowding), so a saturated category scores low.
4. Be commercially specific and useful. Prefer concrete, actionable observations over generic marketing language. Avoid hype: never promise that a product will succeed or "go viral".
5. Where you had to assume something, say so plainly in the assumptions field.
6. Write in clear, professional British-neutral English. No emoji. No markdown formatting inside field values.
7. Return only data that conforms exactly to the requested JSON schema.`;

function describeProduct(input: {
  name: string;
  url?: string | null;
  category?: string | null;
  notes?: string | null;
}) {
  const lines = [`Product name: ${input.name}`];
  if (input.url) lines.push(`Product page URL (not fetched — treat as a hint only): ${input.url}`);
  if (input.category) lines.push(`Seller-supplied category: ${input.category}`);
  if (input.notes) lines.push(`Additional details supplied by the seller:\n${input.notes}`);
  return lines.join('\n');
}

export function productAnalysisPrompt(input: {
  name: string;
  url?: string | null;
  category?: string | null;
  notes?: string | null;
}) {
  return `Analyse the following product for a seller deciding whether it is worth selling.

${describeProduct(input)}

Produce a complete product research assessment: overview, category, target audience, the pain point solved, the four sub-scores with a one-line justification each, a verdict, pricing estimates (sourcing and retail in USD), market saturation, seasonal dependency, a directional trend read, a full SWOT, and recommended marketing channels with a concrete first step for each.

Keep the verdict consistent with the scores: STRONG for a clearly attractive opportunity, POTENTIAL where it depends on execution, RISKY where the downside is significant, AVOID where the economics or competition do not work.`;
}

export function competitorAnalysisPrompt(input: {
  productName: string;
  competitorUrls: string[];
  notes?: string | null;
}) {
  const urlBlock =
    input.competitorUrls.length > 0
      ? `Competitor URLs supplied by the seller (you cannot fetch these pages — infer from the URL, the domain and the product context only, and say so):\n${input.competitorUrls.map((url, index) => `${index + 1}. ${url}`).join('\n')}`
      : 'No competitor URLs were supplied. Describe the typical competitor archetypes a seller would meet in this category, and name them as archetypes rather than as real companies.';

  return `Analyse the competitive landscape for: ${input.productName}

${urlBlock}
${input.notes ? `\nSeller notes:\n${input.notes}` : ''}

For each competitor give: name, price estimate, positioning, main selling points, target customer, strengths, weaknesses, marketing angle, offer structure, primary call to action and an estimated positioning label (for example Premium, Mid-market, Value).

Then summarise the comparison: the price range, the angles everyone is using, the gaps nobody is covering, and where a new seller could differentiate. Do not fabricate company names as though they were verified competitors — if you are describing an archetype, make that explicit in the name field.`;
}

export function keywordPrompt(input: { productName: string; category?: string | null; notes?: string | null }) {
  return `Generate SEO keyword research for the product below.

${describeProduct({ name: input.productName, category: input.category, notes: input.notes })}

Return at least 20 keywords spread across the groups: PRIMARY (exactly one), SECONDARY, LONG_TAIL, BUYER_INTENT, PROBLEM and QUESTION. Give each keyword a one-line rationale and an intent classification.

Also produce one suggested product title of at most 120 characters that reads naturally and includes the primary keyword.

Do not invent search volume, keyword difficulty or CPC numbers — this tool has no keyword data source connected, and the rationale field must not imply otherwise.`;
}

export function listingPrompt(input: {
  productName: string;
  category?: string | null;
  notes?: string | null;
  tone: string;
  audience?: string | null;
}) {
  return `Write an optimised e-commerce product listing.

${describeProduct({ name: input.productName, category: input.category, notes: input.notes })}
Tone: ${input.tone}
${input.audience ? `Primary audience: ${input.audience}` : ''}

Produce: a product title, a short description, a long description of at least three paragraphs, scannable bullet points, distinct benefits and features lists, a FAQ of at least three questions, a meta title (max 60 characters), a meta description (max 155 characters) and image alt texts.

Write claims you could defend. Do not state specifications, certifications, materials or warranty terms that were not supplied — describe the value instead.`;
}

export function adPrompt(input: {
  productName: string;
  platforms: string[];
  audience?: string | null;
  angle?: string | null;
  notes?: string | null;
}) {
  return `Write advertising copy for the product below.

${describeProduct({ name: input.productName, notes: input.notes })}
Platforms requested: ${input.platforms.join(', ')}
${input.audience ? `Target audience: ${input.audience}` : ''}
${input.angle ? `Preferred angle: ${input.angle}` : ''}

For each platform produce at least two distinct variations, each with a different marketing angle. Every variation needs: the angle, a hook, primary text, a headline, a call to action, a short version and a long version.

Match each platform's native register: TikTok is conversational and unpolished, Meta placements carry longer primary text, Google Ads copy is short and intent-led. Avoid unverifiable claims, guarantees of results, and health or income promises.`;
}

export function audiencePrompt(input: {
  productName: string;
  category?: string | null;
  notes?: string | null;
}) {
  return `Build a target audience profile and customer persona for the product below.

${describeProduct({ name: input.productName, category: input.category, notes: input.notes })}

Include: age range, gender skew, location, interests, problems, buying motivations, objections and the desired outcome the customer is really buying.

Then write one specific persona: name, age, occupation, location, a short bio, a quote in their own voice, goals, frustrations, shopping behaviour and preferred channels. Make the persona concrete enough to write ads against — a real-sounding individual, not a demographic summary.`;
}

/** Appended when a first response failed schema validation. */
export function repairPrompt(previous: string, issues: string) {
  return `Your previous response did not match the required schema.

Validation errors:
${issues}

Previous response:
${previous.slice(0, 4000)}

Return a corrected JSON object that satisfies every constraint. Keep the substance of the analysis; fix only the structure, the field names, the value types and any length or range violations. Return JSON only.`;
}
