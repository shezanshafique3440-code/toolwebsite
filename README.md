# ProductPilot AI

AI-powered e-commerce product research. Enter a product name, URL or description and get a
structured research report — demand, competition, profitability and viral potential scored
consistently, with the reasoning behind every number, unit economics you can model, competitor
positioning, and the SEO and ad copy needed to test the product.

Built for Shopify sellers, dropshippers, Amazon sellers and agencies.

---

## What it does

| Area | What you get |
| --- | --- |
| **Product research** | 0–100 overall score from four weighted sub-scores, overview, audience, pain point, pricing estimates, saturation, seasonality, trend direction, full SWOT, marketing channels, and a verdict (Strong / Potential / Risky / Avoid) that explains itself |
| **Competitor analysis** | Positioning, selling points, target customer, strengths, weaknesses, marketing angle, offer structure and CTA per competitor, plus a comparison table and the gaps nobody is covering |
| **Profit calculator** | Revenue, total costs, profit per order, total profit, margin, ROAS, break-even ROAS and break-even selling price — recalculated on every keystroke, no AI involved |
| **SEO keywords** | Primary, secondary, long-tail, buyer-intent, problem and question keywords with intent classification, copy-to-clipboard and CSV export |
| **Listing generator** | Title, short and long descriptions, bullets, benefits, features, FAQ, meta tags and image alt text — each section copyable on its own |
| **Ad generator** | Multiple angles per platform for Facebook, Instagram, TikTok and Google, each with hook, primary text, headline, CTA, and short and long versions |
| **Audience builder** | Demographics, interests, motivations, objections and a persona card you can write ads against |
| **Reports** | Immutable snapshots of an analysis, exportable as a formatted multi-page PDF |
| **Admin panel** | Users, activity, AI usage and estimated cost, subscription mix, error counts, system logs; suspend users, change plans, adjust credits, grant admin |

### On honesty about data

This is the constraint the product is designed around: **no figure is presented as measured market
data unless it actually is.**

- Every model-produced number is labelled **AI estimate** in the UI and in the exported PDF.
- The app is not connected to Google Trends, Amazon, AliExpress, TikTok or Meta. Where a section
  would normally show live data it says **Live data unavailable** and explains why.
- Competitor pages are **not fetched** — analysis reasons from the URLs and context you supply, and
  says so.
- Keyword search volume and difficulty are deliberately omitted rather than invented.
- `src/lib/data-providers/` defines `TrendDataProvider`, `CompetitorDataProvider` and
  `MarketDataProvider`. Implementing one and returning it from the corresponding factory is all
  that is needed to light up live data — no UI or API changes.

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a token-based design system (light and dark)
- **PostgreSQL** + **Prisma 6**
- **Zod** for every input and every AI response
- **jose** (JWT sessions in httpOnly cookies) + **bcryptjs**
- **Recharts** for charts, **Radix UI** primitives for accessible components
- Anthropic and OpenAI official SDKs behind a provider abstraction
- Dependency-free PDF generation (no headless browser, no native modules)

---

## Getting started

### Requirements

- Node.js 20+
- PostgreSQL 14+

### Setup

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev        # create the schema
npm run db:seed               # optional: demo workspace with sample products
npm run dev
```

Open <http://localhost:3000>.

Generate a session secret with:

```bash
openssl rand -base64 48
```

### Seeded accounts

`npm run db:seed` creates a demo workspace. Change or remove these before deploying anywhere public.

| Account | Email | Password |
| --- | --- | --- |
| Seller (Pro) | `demo@productpilot.ai` | `demo-password-1` |
| Admin (Business) | `admin@productpilot.ai` | `admin-password-1` |

Seeded content is flagged `isDemo` in the database and labelled as sample data everywhere it
appears.

### Demo mode

With no `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` set, the app runs against an offline demo provider so
every screen is explorable. Results are schema-valid but clearly marked "Sample output" and stored
with `isDemo = true`. Set either key to switch to real analysis — no other change required.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Node's test runner) |
| `npm run prisma:migrate` | Create and apply a migration in development |
| `npm run prisma:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Seed the demo workspace |

---

## Architecture

```
prisma/
  schema.prisma            PostgreSQL models, indexes, relations
  migrations/              Versioned SQL migrations
  seed.ts                  Demo workspace

src/
  app/
    page.tsx               Landing page
    (auth)/                Sign up, sign in, forgot/reset password, verify email
    dashboard/             Protected app: research, tools, library, settings, billing
    admin/                 Role-protected admin panel
    api/                   REST API (auth, products, tools, reports, billing, admin, health)
    sitemap.ts robots.ts opengraph-image.tsx

  components/
    ui/                    Design system primitives (button, card, table, dialog, toast, …)
    marketing/             Landing page sections
    dashboard/             App shell and feature components
    admin/                 Admin components

  lib/
    ai/                    Provider abstraction, Zod response schemas, prompts, orchestration
      providers/           AnthropicProvider, OpenAIProvider, DemoProvider
    auth/                  Sessions, password hashing, tokens, current-user resolution
    billing/               Plan entitlements, quota accounting, billing provider abstraction
    data-providers/        Trend / competitor / market data interfaces
    pdf/                   PDF writer and report layout
    services/              Business logic (products, tools, reports, admin, auth)
    validation/            Zod schemas for API input
    api.ts errors.ts logger.ts rate-limit.ts plans.ts profit.ts scoring.ts

  middleware.ts            Edge route guard (first line of defence only)
```

### AI provider abstraction

```
AIProvider
├── AnthropicProvider   (Messages API, JSON-schema structured output)
├── OpenAIProvider      (Chat Completions, strict json_schema)
└── DemoProvider        (offline, clearly labelled sample output)
```

`generateStructured()` in `src/lib/ai/index.ts` is the only entry point application code uses. It:

1. Converts the Zod schema to a strict JSON Schema and constrains the model's output to it.
2. Validates the response against the same schema.
3. On failure, retries once with a structured repair prompt containing the exact violations.
4. On a second failure, raises a typed error and shows a useful message — never a raw provider error.
5. Records every attempt in `AiRequestLog` for the admin usage and cost dashboard.

Overall product scores are recomputed server-side from the sub-scores, so a model can never report a
headline number that contradicts its own breakdown.

### API

All routes return `{ data }` or `{ error: { code, message, details? } }`.

```
POST   /api/auth/signup                POST   /api/products/analyze
POST   /api/auth/login                 GET    /api/products
POST   /api/auth/logout                POST   /api/products
POST   /api/auth/forgot-password       GET    /api/products/:id
POST   /api/auth/reset-password        PATCH  /api/products/:id
POST   /api/auth/verify-email          DELETE /api/products/:id
POST   /api/auth/resend-verification   POST   /api/competitors/analyze
POST   /api/auth/change-password       POST   /api/keywords/generate
GET    /api/auth/me                    POST   /api/listing/generate
PATCH  /api/auth/me                    POST   /api/ads/generate
                                       POST   /api/audience/generate
GET    /api/reports                    POST   /api/profit/calculate
POST   /api/reports                    GET    /api/usage
GET    /api/reports/:id                GET    /api/billing
DELETE /api/reports/:id                POST   /api/billing/checkout
GET    /api/reports/:id/export         POST   /api/billing/cancel

GET    /api/admin/stats                GET    /api/health
GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
GET    /api/admin/logs
```

---

## Security

- Passwords hashed with bcrypt (cost 12); login timing equalised for unknown accounts.
- Sessions are HS256 JWTs in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies.
- A `sessionVersion` counter on each user invalidates every issued token at once — used on password
  reset, password change, suspension and role change.
- **Every** query for user-owned data is scoped by `userId`. No row is ever fetched by id alone.
- Authorisation is enforced server-side in API routes and server components. Middleware is only a
  first line of defence, never the boundary.
- Plan feature gating (`PLAN_FEATURES`) is enforced server-side; the UI merely reflects it.
- CSRF: `SameSite=Lax` cookies plus an Origin check on every state-changing request.
- Rate limiting on auth, password reset and all AI endpoints, per IP and per account.
- Every input validated with Zod. Product URLs restricted to `http(s)` so `javascript:` and `data:`
  can never reach a rendered anchor.
- Prisma parameterises all queries; React escapes all rendered output.
- Security headers including a CSP, HSTS, `X-Frame-Options: DENY` and `nosniff`.
- Secrets are read server-side only and never reach the browser. Logs redact anything matching
  password/token/secret/authorization/api-key/cookie.
- Errors surfaced to users are mapped, human-readable messages — never stack traces or provider
  errors.

---

## Billing

Plan changes go through a `BillingProvider` interface. The bundled `InternalBillingProvider` applies
changes directly and takes no payment; the billing page states this plainly rather than pretending a
processor is connected. Adding Stripe means implementing the interface and returning it from
`getBillingProvider()`.

The billing period is deliberately preserved across a plan change, so quota cannot be reset by
switching plans back and forth.

| Plan | Price | Analyses / month | AI credits | Includes |
| --- | --- | --- | --- | --- |
| Free | $0 | 5 | 15 | Scores, basic insights, keywords, unlimited calculator |
| Pro | $19/mo (or $182/yr) | 100 | 400 | Everything: competitors, listings, ads, audience, saved reports, PDF export |
| Business | $49/mo (or $470/yr) | 500 | 2000 | Everything in Pro, team seats, priority processing, API access (coming soon) |

---

## Deployment

### Environment variables

See `.env.example`. Required in production: `DATABASE_URL`, `JWT_SECRET` (32+ characters),
`APP_URL`, `NEXT_PUBLIC_APP_URL`. Optional: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (without one the
app runs in demo mode), `AI_PROVIDER`, model overrides, `STRIPE_SECRET_KEY`, `ALLOWED_ORIGINS`.

### Database migrations

```bash
npx prisma migrate deploy
```

Run this on every deploy, before the new version starts serving traffic.

### Vercel / Render

1. Connect the repository.
2. Build command: `npm run build`. Start command: `npm start`.
3. Set the environment variables above.
4. Run `npx prisma migrate deploy` as a release/pre-deploy step.

### Docker

```bash
export JWT_SECRET="$(openssl rand -base64 48)"
docker compose up --build
```

Brings up PostgreSQL and the app, applies migrations on start, and serves on port 3000. The image
uses Next.js standalone output and runs as a non-root user. `GET /api/health` reports database
reachability for orchestrator health checks.

### VPS

```bash
npm ci
npm run build
npx prisma migrate deploy
npm start          # behind nginx/caddy with TLS, or under a process manager
```

---

## Testing

```bash
npm test
```

Covers the profit model (including break-even identities), scoring and verdict bands, JSON
extraction and repair paths, strict-JSON-Schema conversion for every AI contract, demo-provider
output validating against every schema, input validation rules, and PDF generation end to end
(text metrics, wrapping, and a well-formed multi-page document).

---

## Licence

Proprietary. All rights reserved.
