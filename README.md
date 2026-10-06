# BLACK Trading

Phase 1 of BLACK Trading is a responsive website and API for publishing simulated evaluation offers, collecting customer orders, accepting cryptocurrency transaction hashes for manual review, and managing orders and website content.

This is not a live trading terminal. Buying an evaluation does not provide customer cash, a live brokerage account, guaranteed funding, profits, or payouts. The displayed account sizes are simulated notional amounts.

## Phase 1 features

- Public landing page with evaluation offers, FAQs, legal-information links, and clearly labelled example media or testimonials.
- Checkout that takes its price and offer details from PostgreSQL on the server.
- Payment page with server-generated cryptocurrency quotes, configurable receiving addresses, QR codes, and transaction-hash submission.
- Manual order review. Submitting a transaction hash records `PAYMENT_SUBMITTED`; it never marks an order `PAID`.
- Clerk sign-in and an administrator-only console for orders, challenges, payment methods, FAQs, testimonials, media, statistics, and site settings.
- Server-side audit records for administrator changes.
- Lawyer-review placeholders for Terms of Service and the privacy notice.

The trading terminal, automated blockchain verification, payment settlement, and customer cash or payout handling are outside this phase.

## Technology

- pnpm workspace monorepo, TypeScript, Node.js 24
- React 19, Vite, Wouter, TanStack Query
- Express 5 API with Clerk sessions, request validation, rate limits, same-origin write checks, and security headers
- PostgreSQL with Prisma 6
- OpenAPI source contract, Orval-generated React Query hooks, and generated Zod schemas

## Repository map

| Path | Purpose |
| --- | --- |
| `artifacts/black-trading/` | BLACK Trading React/Vite application |
| `artifacts/api-server/` | Express API, Clerk middleware, public and admin routes |
| `lib/api-spec/openapi.yaml` | Source of truth for API request and response contracts |
| `lib/api-client-react/` | Generated React Query client; do not edit generated files directly |
| `lib/api-zod/` | Generated request and response validators; do not edit generated files directly |
| `lib/db/prisma/schema.prisma` | PostgreSQL schema |
| `lib/db/prisma/seed.mjs` | Idempotent demo content and evaluation seed |

## Run in Replit

The workspace is configured with these managed workflows:

- `artifacts/api-server: API Server`
- `artifacts/black-trading: web`

Start or restart those workflows from the Replit workspace. The API binds to the injected `PORT`. The web artifact is served at the root preview path.

## Local commands

Run commands from the workspace root:

```sh
# Install workspace dependencies
pnpm install

# Regenerate the API client and validators after editing OpenAPI
pnpm --filter @workspace/api-spec run codegen

# Generate Prisma Client, apply the development schema, and load the starter content
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed

# Run the managed workspace services
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/black-trading run dev

# Validate packages
pnpm run typecheck
PORT=5000 BASE_PATH=/ pnpm run build
```

`db push` changes the configured development database to match the Prisma schema. Review schema changes before running it; do not use a force reset against a database that contains data.
The Vite build reads `PORT` and `BASE_PATH`; replace `/` with the web artifact's preview prefix when building it under a different path.

## Environment and authentication

Replit provides the PostgreSQL connection and Clerk credentials through the workspace environment. Do not commit credentials or add private keys or seed phrases to this repository.

The API also uses:

- `SESSION_SECRET` to sign payment quotes so a customer cannot change the server-provided amount, receiving address, or selected method.
- `ADMIN_EMAILS` as a comma-separated allowlist of Clerk email addresses authorized to use admin API routes.
- `PORT`, injected by the API workflow.

Set `ADMIN_EMAILS` in Replit's environment-variable settings. It is not a secret. If it is unset, signed-in users are denied administrator access. A Clerk account must exist for an allowlisted email before that person can sign in. Development and production Clerk user stores are separate, so test the appropriate account in each environment.

The frontend and API use Clerk's session cookie. The browser does not send bearer tokens. The production Clerk Frontend API proxy is mounted at `/api/__clerk`; Replit configures its production routing.

## Database and starter content

The Prisma schema includes:

- `User` and `Admin` records for Clerk identities authorized by the server allowlist.
- `Challenge` offers and order snapshots.
- `Order` customer and manual-payment-review records.
- `PaymentMethod` addresses, network names, enabled state, and instructions.
- `Faq`, `Testimonial`, `MediaItem`, and `SiteStatistic` public content.
- `SiteSetting` identity and legal-page copy.
- `AuditLog` administrator actions.

The seed script inserts challenges priced at $36, $56, $74, and $108, plus the $100K / $25 Limited Launch Evaluation Offer. That offer is the fee for a simulated evaluation; it is not $100,000 in cash.

Seeded testimonials, media, and statistics are marked as examples or unverified. Unverified statistics are not returned by the public API. Example testimonials and demo media are visibly labelled. The seed does not configure receiving wallet addresses; an administrator must add and verify real addresses before enabling a payment method.

## Orders and cryptocurrency payments

1. The customer selects an enabled evaluation. The API looks up its price in PostgreSQL; it ignores any client-supplied price.
2. The customer submits their details and receives a pending order.
3. The payment page requests enabled methods and quotes from the API. BTC and ETH estimates use the Coinbase spot-price endpoint. USDT and USDC use a clearly identified 1:1 USD parity estimate.
4. The API signs each quote with `SESSION_SECRET`. The customer submits the signed quote, currency, network, and transaction hash.
5. The API stores the quote snapshot, receiving address, currency, network, and hash, and changes the status to `PAYMENT_SUBMITTED`.
6. An administrator checks the transaction and updates the order status manually.

The spot quote is an estimate, not payment confirmation. The exchange rate may move and network fees are not included. Administrators must verify the actual transaction, correct network, receiving address, and amount before marking an order `PAID`. The API never treats a submitted hash or a valid signed quote as proof of settlement.

## Admin console

Open `/admin` and sign in with an allowlisted Clerk account. The API enforces authorization independently of the frontend. Signed-in users not on `ADMIN_EMAILS` do not see admin controls and cannot access admin APIs.

The admin content editor accepts JSON matching the displayed API records. Keep required fields and types intact. Statistics replacement removes the previous rows after explicit confirmation. Challenge offers with existing orders cannot be deleted; disable them instead.

## API overview

All API routes are under `/api`:

- `GET /healthz`
- `GET /public/site`
- `GET /public/payment-methods`
- `POST /orders`
- `GET /orders/{orderId}/payment`
- `POST /orders/{orderId}/payment`
- Admin routes under `/admin`: dashboard, orders, challenges, payment methods, FAQs, testimonials, media, statistics, and settings.

Edit `lib/api-spec/openapi.yaml`, then run the code-generation command above before changing API consumers or handlers.

## Launch checklist

- Set and verify `ADMIN_EMAILS` for the intended Clerk environment.
- Configure the real company support address and social links.
- Add and independently verify every receiving wallet address and its exact network.
- Confirm live evaluation rules, eligibility restrictions, payment handling, and all commercial claims.
- Replace the legal placeholders only after review by a qualified lawyer in relevant jurisdictions. The current Terms and privacy content is a draft, not legal advice or launch-ready legal text.
- Replace or remove every demo testimonial, media item, and unverified statistic. Do not publish unsupported customer counts, trading results, payout claims, cash claims, or regulatory claims.
- Test order creation, payment submission, manual status review, and admin authorization in the intended environment before accepting customer payments.

## Important limitations

- No wallet connection, private-key handling, automatic on-chain transaction lookup, or automatic payment approval is implemented.
- There are no customer trading accounts or trading-terminal features in Phase 1.
- Legal, eligibility, refund, evaluation-rule, and payout terms require business decisions and qualified review before launch.
