# BLACK Trading

Phase 1 is a responsive simulated-evaluation storefront with an API and administrator console. See `README.md` for setup, commands, API overview, and launch checks.

## Run & operate

- `pnpm --filter @workspace/api-server run dev` — API server; uses the injected `PORT`.
- `pnpm --filter @workspace/black-trading run dev` — React/Vite web app.
- `pnpm run typecheck` — typecheck workspace packages.
- `pnpm run build` — typecheck and build workspace packages. The Vite build also needs `PORT` and `BASE_PATH`.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from `lib/api-spec/openapi.yaml`.
- `pnpm --filter @workspace/db run generate` — generate Prisma Client.
- `pnpm --filter @workspace/db run push` — apply Prisma schema to the configured development database.
- `pnpm --filter @workspace/db run seed` — load starter/demo content.

## Stack and source of truth

- pnpm workspace, TypeScript, React 19, Vite, Express 5.
- PostgreSQL with Prisma; the schema is `lib/db/prisma/schema.prisma`.
- OpenAPI is the API contract; generated client and validators must not be edited by hand.
- Replit-managed Clerk sessions authenticate users. `ADMIN_EMAILS` is the server-side email allowlist; do not add an admin bypass.
- `SESSION_SECRET` signs the server-issued payment quote token.

## Product constraints

- Phase 1 only. Do not add a live trading terminal, custody, wallet connection, private-key or seed-phrase handling, automated on-chain verification, or automatic payment approval.
- Evaluation account sizes are simulated notional amounts, not customer cash, live brokerage accounts, or guaranteed funding.
- Keep the requested prices: $5K/$36, $10K/$56, $25K/$74, $50K/$108, and $100K/$25. The final offer is the “Limited Launch Evaluation Offer.”
- A transaction hash only records a payment submission. An administrator must manually verify the actual transaction, amount, address, and network before setting an order to `PAID`.
- Do not publish fabricated statistics, customer claims, payout or cash claims, regulatory claims, or guarantees. Example testimonials/media and unverified data must stay clearly labelled or hidden.
- Terms and privacy copy are placeholders until reviewed by a qualified lawyer for relevant jurisdictions.
- Wallet addresses are configured server-side by an administrator. Never hardcode a receiving address in the browser or source.
