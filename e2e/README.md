# yProHub UI — End-to-End Tests

Playwright test suite covering the yProHub Angular app. Self-contained project —
its dependencies are separate from the Angular app's.

## One-time setup

```powershell
cd prohub-ui/e2e
npm install
npx playwright install chromium
```

## Running tests

**Prerequisite:** the backend must be running on https://localhost:7042 (default launch profile):

```powershell
cd ProHubAPI/ServiceProviderAPI
dotnet watch run
```

The Angular dev server is started automatically (or reused if `npm start` is
already running). Then:

```powershell
cd prohub-ui/e2e
npm test              # headless run
npm run test:headed   # watch the browser
npm run test:ui       # Playwright UI mode (best for development)
npm run report        # open the HTML report of the last run
```

Run a single file or test:

```powershell
npx playwright test tests/settings/payment-methods.spec.ts
npx playwright test -g "add a UPI method"
```

## How auth works

`tests/auth.setup.ts` runs before everything else:

1. Creates the e2e accounts (`e2e.user@yprohub.test`, `e2e.pro@yprohub.test`,
   `e2e.admin@yprohub.test`) via the backend registration API — idempotent,
   skipped if they exist. The admin account is registered as a regular user
   and promoted to the Admin role via SQL (admin invites are email-only).
2. Logs in through the real login page once per role.
3. Saves browser storage to `.auth/user.json` / `.auth/pro.json` /
   `.auth/admin.json`.

Every test then starts pre-authenticated by declaring which state it wants:

```ts
test.use({ storageState: USER_STORAGE_STATE });  // or PRO_STORAGE_STATE
```

Tests that need a logged-out browser (e.g. login tests) use:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

## Project structure

```
e2e/
  playwright.config.ts   — config, webServer, projects
  fixtures/
    test-users.ts        — e2e account credentials + test address
    api.ts               — backend API helpers (accounts, login, jobs, bids, phases)
    db.ts                — LocalDB staging via sqlcmd (email-verify accounts,
                           force job statuses that normally require payment)
  pages/                 — Page Object Model: selectors + interactions per page
  tests/
    auth.setup.ts        — auth bootstrap (runs first)
    auth/                — login specs
    settings/            — settings page + payment methods specs
    jobs/                — post-job wizard, job lifecycle (bid/reject/accept/
                           phases), bid journeys, withdrawal, completion+review
    messages/            — user↔pro messaging specs
    payments/            — checkout dialog with method selection (Razorpay
                           script stubbed; create-order mocked)
    admin/               — dispute resolution (admin role)
```

## Conventions when adding tests

- **One page object per page** (`pages/foo.page.ts`). Tests never use raw
  selectors — when the UI changes, update the page object only.
- **Test data through the API**, not the UI: use `apiLogin()` from
  `fixtures/api.ts` to get a JWT, then create jobs/bids/etc. with `request`
  calls in a `beforeEach`. Reserve UI interaction for what the test verifies.
- **Make tests state-independent**: the database persists between runs, so
  either reset relevant state in `beforeEach` (see payment-methods specs) or
  use unique values per run.
- The test address (Thiruvananthapuram, Kerala) is inside the seeded service
  area — keep using it for anything that passes service-area validation.

## Known limitations

- The auth rate limits are relaxed when the backend runs in the Development
  environment (see `Program.cs`). Running the suite against a backend in
  Production mode will hit the strict limits (5 logins/min) and fail.
- `fixtures/db.ts` shells out to `sqlcmd` against `(localdb)\mssqllocaldb` to
  stage state that has no API path (email verification flags, job statuses
  that normally require a real Razorpay payment). The suite therefore only
  runs against the local LocalDB backend.

- The Razorpay modal is a third-party iframe; checkout tests should stop at
  verifying our dialog (methods listed, totals, prefill) rather than
  completing a payment.
- Post-job step 2 uses Nominatim address autocomplete via the backend proxy —
  full job-submission flow needs a network mock before it can run reliably.
