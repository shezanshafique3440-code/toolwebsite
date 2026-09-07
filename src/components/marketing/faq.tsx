import { ChevronDown } from 'lucide-react';

export const FAQ_ITEMS = [
  {
    question: 'Where do the scores come from?',
    answer:
      'Scores are produced by a language model reasoning about the product information you provide. They are opinions expressed as numbers, not measurements. ProductPilot AI does not connect to Google Trends, Amazon, AliExpress, TikTok or Meta, and it will never present a figure as though it came from one of those sources.',
  },
  {
    question: 'Can it tell me a product will definitely sell?',
    answer:
      'No, and any tool that claims otherwise is guessing too. What it does is structure the assessment: demand signals, competitive crowding, unit economics and content potential, scored consistently so you can compare candidates and spot the obvious misses before you spend money.',
  },
  {
    question: 'Does it fetch competitor pages?',
    answer:
      'Not currently. When you paste competitor URLs, the analysis reasons from the URL, the domain and the context you supply, and it says so in the report. The architecture has a CompetitorDataProvider interface ready for a real page-fetching integration.',
  },
  {
    question: 'What counts as an analysis?',
    answer:
      'One full product research report counts as one analysis against your monthly limit. The other generators (keywords, listings, ads, audience, competitors) consume AI credits from the same monthly allowance. The profit calculator is unlimited on every plan, including Free.',
  },
  {
    question: 'Can I export my reports?',
    answer:
      'Yes. Pro and Business plans can save a report and export it as a formatted PDF containing the product information, score, market analysis, competition, profitability, SEO and marketing recommendations.',
  },
  {
    question: 'Is my research private?',
    answer:
      'Yes. Every product, analysis and report is scoped to your account and queried by owner on the server. No other user can read your data, and authorisation is enforced server-side on every request rather than in the browser.',
  },
  {
    question: 'Can I cancel any time?',
    answer:
      'Yes. Cancelling keeps your plan active until the end of the current period, then moves you to Free. Your saved products and reports stay in your account.',
  },
];

export function Faq() {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-card bg-surface hairline">
      {FAQ_ITEMS.map((item) => (
        <details key={item.question} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[15px] font-medium text-fg marker:hidden">
            {item.question}
            <ChevronDown
              className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
