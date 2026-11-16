# StockTrack Inventory & Order Management API

StockTrack is a JavaScript CommonJS REST API built with Express 4, PostgreSQL, and Prisma. It demonstrates inventory management, order processing, JWT authentication, role authorization, and real integration of the sibling ExpressGuard middleware package. It has no frontend.

## Requirements

- Node.js 22 or newer
- PostgreSQL 14 or newer
- npm
- The sibling ExpressGuard checkout at `../npm_package/ExpressGuard-` (package `@ayush_rajput/expressguard-toolkit`)

The ExpressGuard package was inspected at `../npm_package/ExpressGuard-`: it has CommonJS and ESM exports, supports Express `>=4.18 <6`, and requires Node 22+. Its six exports are used directly: `requestId`, `requestLogger`, `rateLimit`, `apiKeyAuth`, `errorHandler`, and `asyncHandler`.

## Setup

1. Install PostgreSQL and create a database named `stocktrack`. Make sure the database server is running.
2. Create your private local environment file from the template:

   ```sh
   cp .env.example .env
   ```

   Edit `.env` with your PostgreSQL username and password. Replace the example JWT secret and integration API key with random values; the JWT secret must be at least 32 characters and the API key at least 16 characters. Set a unique admin seed password of at least 12 characters. For example, generate a 32-byte random value with `openssl rand -hex 32` and use a separate generated value for each secret. Keep `.env` private: it is ignored by Git. `.env.example` contains placeholders only and should not contain real credentials.

   `CORS_ORIGIN` should be the origin of a frontend that will call this API (for example, `http://localhost:5173` for a local Vite app). This project currently has no frontend; the value can be changed when you add one.

3. Install dependencies and prepare the database:

   ```sh
   npm ci
   npm run db:generate
   npm run db:migrate -- --name init
   npm run db:seed
   npm run dev
   ```

   `npm ci` requires the sibling ExpressGuard checkout at `../npm_package/ExpressGuard-` because it is referenced as a local dependency.

The local dependency is recorded as `file:../npm_package/ExpressGuard-`. If ExpressGuard is published and you want to use that release instead, change that dependency in `package.json` to `@ayush_rajput/expressguard-toolkit@<verified-version>` and run `npm install`.

## ExpressGuard wiring

`src/app.js` installs request IDs, structured request logging, and a general rate limit before the API routes. The authentication prefix has a stricter limiter. The integration receipt endpoint uses `apiKeyAuth({ apiKeys })` with comma-separated secrets from `INTEGRATION_API_KEYS`. Async routes use ExpressGuard's `asyncHandler`. The final error middleware uses ExpressGuard's `errorHandler`; known Prisma unique, relation, and missing-record errors are translated first. The limiter uses ExpressGuard's documented in-memory, per-process store, so a multi-instance deployment would need a shared limiter store in a future package release.

## API overview

All application routes are under `/api/v1`; health check is `GET /health`. Protected user routes require `Authorization: Bearer <JWT>`. Public registration always creates STAFF accounts. Admin-only endpoints use role authorization.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Users (admin) | `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `PATCH /users/:id/status` |
| Categories | `GET/POST /categories`, `GET/PATCH/DELETE /categories/:id` |
| Suppliers | `GET/POST /suppliers`, `GET/PATCH/DELETE /suppliers/:id` |
| Products | `GET/POST /products`, `GET/PATCH/DELETE /products/:id` |
| Inventory | `GET /inventory`, `GET /inventory/low-stock`, `POST /products/:id/adjustments`, `GET /products/:id/movements` |
| Orders | `GET/POST /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/cancel` |
| Integration | `POST /integrations/stock-receipts` (requires `X-API-Key`) |
| Reports | `GET /reports/summary`, `/reports/low-stock`, `/reports/top-products`, `/reports/sales` |

Product listing supports `page`, `limit`, `search`, `categoryId`, `supplierId`, `lowStock=true`, `sort=name|sellingPrice|createdAt`, and `order=asc|desc`. Orders support `page`, `limit`, `search`, and `status`. Reports accept optional ISO `startDate` and `endDate`; sales additionally accepts `status`.

### Example calls

Register a staff user:

```sh
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Sample Staff","email":"staff@example.com","password":"a-long-password"}'
```

Log in and pass the returned token as a bearer token for protected calls. Stock is deducted and reserved when an order is created. Cancellation of PENDING or CONFIRMED orders restores stock atomically. Payment processing is out of scope. JWT logout is client-side: discard the token; this stateless API does not claim to revoke tokens.

An integration receipt body takes a supplier ID, product IDs, positive quantities, and a reference. Product supplier associations must match the supplied supplier. The API key is supplied only in the `X-API-Key` header and is never returned.

## Data integrity

Product money fields and order price snapshots use PostgreSQL Decimal columns and serialize as two-decimal strings. Every stock-changing code path goes through `src/services/inventory.js`, which makes a conditional stock update and writes its movement within the same Serializable interactive Prisma transaction. Order creation consolidates repeated product IDs, uses database prices, records historical name/SKU/price snapshots, and retries bounded Prisma serialization conflicts. If any movement or order write fails, the entire transaction rolls back. Products are deactivated rather than deleted; categories in use cannot be deleted; supplier deletion is implemented as deactivation.

## Notes

The pasted project prompt ended at the start of its database section, without specifying further schema or submission requirements. This implementation covers the complete preceding functional requirements. Rate limiting is process-local as specified by ExpressGuard, and therefore does not coordinate across multiple API instances.
