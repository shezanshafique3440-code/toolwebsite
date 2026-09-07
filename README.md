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

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
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

- Node.js 22.6+ — the seed script and tests run TypeScript directly through Node's built-in type
  stripping, which landed in 22.6. Node 22 LTS is the safe choice.
- PostgreSQL 14+

### Run it on localhost

```bash
git clone https://github.com/shezanshafique3440-code/toolwebsite.git
cd toolwebsite
git checkout claude/productpilot-ai-saas-aqefe6

npm install
cp .env.example .env          # then set DATABASE_URL and JWT_SECRET
npx prisma migrate deploy     # create the schema
npm run db:seed               # optional: demo workspace with sample products
npm run dev
```

Open <http://localhost:3000>.

No API key is needed to try it — without one the app runs in demo mode and every generated result is
labelled as sample output.

If you don't have PostgreSQL locally, start one with Docker and point `DATABASE_URL` at it:

```bash
docker run --name productpilot-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=productpilot -p 5432:5432 -d postgres:16-alpine
```

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/productpilot?schema=public"
```

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
POST   /api/admin/users/:id/grant      (audited complimentary plan)
DELETE /api/admin/users/:id/grant      (revoke a grant)
GET    /api/admin/logs

Billing:

POST   /api/billing/checkout           (creates a Paddle transaction; grants nothing)
POST   /api/billing/portal             (Paddle customer portal links)
POST   /api/billing/cancel             (cancel at period end, via Paddle)
POST   /api/webhooks/paddle            (signature-verified; the only path that
                                        can change a subscription)
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

**Payments**

- Card details never reach this server. Paddle hosts the checkout and is the merchant of record.
- A subscription is granted only by a webhook whose Paddle signature verifies against
  `PADDLE_WEBHOOK_SECRET`. A completed checkout in the browser is treated as *pending*, never as paid.
- `Subscription.plan` has exactly one writer, `applySubscriptionState()`, reachable only from the
  verified webhook and the audited admin grant.
- Every webhook is recorded with a unique `eventId`, so a redelivery cannot be applied twice.
- An event carrying an unconfigured price never grants a plan.
- Administrators can grant a complimentary plan, but it is stored as a manual grant with the issuing
  admin and a mandatory reason — it can never be mistaken for, or counted as, a payment.

---

## Plans and what each unlocks

Enforced server-side in `src/lib/plans.ts` (`PLAN_FEATURES`) and applied by
`requirePlan()` / `requireFeature()`. A Free user calling a Pro endpoint directly gets
HTTP 403 `PRO_PLAN_REQUIRED`, regardless of what the browser shows.

| Capability | Free | Pro | Business |
| --- | --- | --- | --- |
| Product analyses per month | 5 | 100 | 500 |
| AI credits per month | 15 | 400 | 2000 |
| Product research report | ✓ | ✓ | ✓ |
| Profit calculator | ✓ (unlimited) | ✓ | ✓ |
| SEO keyword research | ✓ | ✓ | ✓ |
| Competitor analysis | — | ✓ | ✓ |
| Listing generator | — | ✓ | ✓ |
| Ad copy generator | — | ✓ | ✓ |
| Audience builder | — | ✓ | ✓ |
| Saved reports | — | ✓ | ✓ |
| PDF export | — | ✓ | ✓ |
| Team members | — | — | ✓ |
| API access | — | — | ✓ (architecture in place, not yet exposed) |


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

Brings up PostgreSQL and the app, applies migrations on start, and serves on
<http://localhost:3000>. The image uses Next.js standalone output and runs as a non-root user.
`GET /api/health` reports database reachability for orchestrator health checks.

The runtime image contains only the built app, so the seed script is run from the host against the
database the compose file exposes on port 5432:

```bash
DATABASE_URL="postgresql://productpilot:productpilot@localhost:5432/productpilot?schema=public" \
  npm run db:seed
```

### VPS

```bash
npm ci
npm run build
npx prisma migrate deploy
npm start          # behind nginx/caddy with TLS, or under a process manager
```

---

## Dependency security

`npm audit` is expected to be clean of moderate-and-above advisories. Two low-severity advisories
remain in the ESLint toolchain; they affect linting only and never ship in the application.

`package.json` pins an override for `deepmerge-ts` so the Prisma CLI picks up the patched release
without forcing a Prisma major upgrade. Re-check with:

```bash
npm audit
```

## Billing with Paddle

Payments run on **Paddle Billing**. Paddle is the merchant of record: it hosts the
checkout, holds the card details, handles tax, and pays out to the account owner's
verified Paddle payout settings. This application never sees a card number.

### The rule that shapes the design

> A plan becomes paid **only** when a signature-verified Paddle webhook says so.

There is exactly one function in the codebase that writes `Subscription.plan` —
`applySubscriptionState()` in `src/lib/billing/subscription-state.ts`. It is called
from two places: the verified webhook handler, and the audited admin grant. No API
route, no request body and no browser state can reach it. `POST /api/billing/checkout`
creates a Paddle transaction and returns an id to open the checkout with; it grants
nothing.

### 1. Create the Paddle account

1. Sign up at <https://www.paddle.com>. You get a **sandbox** account at
   <https://sandbox-vendors.paddle.com> and a live account at
   <https://vendors.paddle.com>. They are separate: separate credentials, separate
   price IDs. Build against sandbox first.
2. For live payments, complete Paddle's seller verification and enter your payout
   details in **Paddle → Business account → Payout details**. That is where the money
   arrives — it is configured by you inside Paddle, never in this application.

### 2. Create the products and prices

In **Paddle → Catalog → Products**:

1. **New product** — name it `ProductPilot AI Pro`.
   Add a price: **$19.00 USD**, billing period **monthly**. Copy the price ID
   (`pri_...`) → this is `PADDLE_PRO_PRICE_ID`.
2. **New product** — name it `ProductPilot AI Business`.
   Add a price: **$49.00 USD**, billing period **monthly**. Copy the price ID
   → this is `PADDLE_BUSINESS_PRICE_ID`.

The amounts must match `src/lib/plans.ts`, which is what the pricing page displays.
If they disagree, the page advertises one price and Paddle charges another.

### 3. Get the API credentials

In **Paddle → Developer tools → Authentication**:

| Value | Where | Variable | Secret? |
| --- | --- | --- | --- |
| API key (`pdl_...`) | *API keys* → New API key | `PADDLE_API_KEY` | **Yes** — server only |
| Client-side token | *Client-side tokens* → New token | `PADDLE_CLIENT_TOKEN` | No — published to the browser to open the checkout |

### 4. Configure the webhook

In **Paddle → Developer tools → Notifications → New destination**:

- **URL**: `https://YOUR-DOMAIN.com/api/webhooks/paddle`
  (Render gives you `https://productpilot-ai.onrender.com/api/webhooks/paddle`.)
- **Notification type**: Webhook
- Copy the **secret key** shown once on creation (`pdl_ntfset_...`) →
  `PADDLE_WEBHOOK_SECRET`.

Enable these events — they are the ones the handler acts on:

| Event | What it does here |
| --- | --- |
| `subscription.created` | Records the subscription against the account |
| `subscription.activated` | **Grants the paid plan** |
| `subscription.updated` | Syncs plan, price, period and a scheduled cancellation |
| `subscription.resumed` | Restores access after a pause |
| `subscription.trialing` | Grants access during a trial |
| `subscription.past_due` | Marks the account overdue — access continues while Paddle retries |
| `subscription.paused` | Suspends paid access |
| `subscription.canceled` | Ends access, or schedules it for the end of the paid period |
| `transaction.completed` | Payment confirmation hook |
| `transaction.payment_failed` | Records the failed attempt for support |

Any other event is accepted, recorded and ignored.

### 5. Environment variables

```
PADDLE_ENVIRONMENT=sandbox          # or "production"
PADDLE_API_KEY=pdl_...              # secret, server only
PADDLE_CLIENT_TOKEN=test_...        # public, sent to the browser
PADDLE_WEBHOOK_SECRET=pdl_ntfset_...# secret, server only
PADDLE_PRO_PRICE_ID=pri_...
PADDLE_BUSINESS_PRICE_ID=pri_...
APP_URL=https://your-domain.com
```

With any of them missing, the billing page says payments are unavailable and
checkout returns `BILLING_UNAVAILABLE`. It never falls back to granting a plan.

### 6. Local sandbox testing

Paddle cannot reach `localhost`, so expose it with a tunnel:

```bash
npx untun@latest tunnel http://localhost:3000
# or: ngrok http 3000
```

Put the public URL in the Paddle notification destination
(`https://<tunnel>/api/webhooks/paddle`) and in `APP_URL`, then:

```bash
npm run dev
```

Walk the flow:

| # | Step | Expected |
| --- | --- | --- |
| 1 | Sign up | Free plan, 5 analyses |
| 2 | Billing → **Upgrade to Pro** | "Opening secure checkout…", Paddle overlay opens |
| 3 | Pay with Paddle's test card `4242 4242 4242 4242`, any future expiry and CVC | Checkout completes |
| 4 | Watch the page | "Confirming your payment…" while it polls the backend |
| 5 | Webhook arrives | Plan flips to Pro, "Subscription activated." |
| 6 | Admin → Billing | The delivery is listed as *Applied* |
| 7 | Call a Pro endpoint | Works |
| 8 | Check limits | 100 analyses, 400 credits |
| 9 | **Cancel subscription** | "Cancels at period end", access retained |
| 10 | Paddle → cancel immediately | Account returns to Free with 5 analyses |

Verify the guard directly while signed in as a Free user:

```bash
curl -X POST http://localhost:3000/api/competitors/analyze \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  -b cookies.txt -d '{"productName":"Test","competitorUrls":[]}'
# → HTTP 403 {"error":{"code":"PRO_PLAN_REQUIRED", ...}}
```

### 7. Render configuration

**Render dashboard → your service → Environment → Add environment variable.**
Add these six (the blueprint declares them as `sync: false`, so Render prompts for
the values and nothing is stored in the repository):

```
PADDLE_API_KEY
PADDLE_CLIENT_TOKEN
PADDLE_WEBHOOK_SECRET
PADDLE_ENVIRONMENT
PADDLE_PRO_PRICE_ID
PADDLE_BUSINESS_PRICE_ID
```

`APP_URL` is optional — the app falls back to Render's `RENDER_EXTERNAL_URL`. Set it
explicitly once a custom domain is attached. Render restarts the service after
environment changes; no rebuild is needed.

Then set the Paddle webhook URL to
`https://<your-render-domain>/api/webhooks/paddle`.

### 8. Going live

1. Repeat the product, price, API key, client token and webhook setup in the **live**
   Paddle dashboard — none of the sandbox values work in production.
2. Complete Paddle's seller verification and payout details.
3. In Render set `PADDLE_ENVIRONMENT=production` and replace the other five values
   with the live ones.
4. Run one real low-value transaction end to end before announcing it.

### 9. How activation and cancellation work

**Activation.** Checkout completes → Paddle sends `subscription.activated` →
signature verified → recorded in `PaymentEvent` (unique `eventId`, so a redelivery is
ignored) → `applySubscriptionState()` writes the plan and period → the browser, which
has been polling `/api/billing`, shows "Subscription activated." If the webhook is
slow the UI says the payment was received and is being confirmed; it never claims
success on its own.

**Cancellation.** "Cancel subscription" calls Paddle with
`effective_from: next_billing_period`. Paddle replies with `subscription.updated`
carrying a scheduled change, which sets `cancelAtPeriodEnd`. **Access is not withdrawn
then** — the customer paid for the period. When the period ends Paddle sends
`subscription.canceled` and the account returns to Free.

**Failed payment.** `subscription.past_due` sets the status and shows a billing
warning. Access continues while Paddle retries, and no data is deleted.

### 10. Troubleshooting webhooks

| Symptom | Cause and fix |
| --- | --- |
| Checkout completes, plan never changes | The webhook is not arriving. Check **Paddle → Notifications → your destination → Logs** for delivery attempts and the response code. |
| Deliveries return `400 Invalid signature` | `PADDLE_WEBHOOK_SECRET` does not match the destination. It is shown once at creation — regenerate it and update the environment. |
| Deliveries return `503 Billing is not configured` | One of the `PADDLE_*` variables is missing on the server. |
| Events show as **Ignored** in Admin → Billing | The event type is not one the handler acts on. Harmless. |
| Events show as **Failed** | The error is stored on the row and shown in the admin table. Fix the cause and replay the delivery from Paddle. |
| Log says `billing.webhook_unmapped` | The event could not be matched to an account — its `custom_data.userId`, subscription id and customer id are all unknown. Usually a subscription created directly in Paddle rather than through checkout. |
| Log says `billing.webhook_unknown_price` | The price ID in the event is not `PADDLE_PRO_PRICE_ID` or `PADDLE_BUSINESS_PRICE_ID`. The plan is deliberately left unchanged rather than guessed. |
| Log says `billing.webhook_unparseable` | The signature was valid but the payload shape is unknown to this SDK version — update `@paddle/paddle-node-sdk`. |

Every delivery is visible in **Admin → Billing**, and the raw rows are in the
`PaymentEvent` table.

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
