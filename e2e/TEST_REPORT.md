# Login Flow E2E Test Report

## Test Environment

| Item | Value |
|------|-------|
| Dashboard URL | http://localhost:5174 |
| Backend API | http://localhost:3000/api |
| Admin email | admin@example.com |
| Admin password | admin_password_change_me |
| Test framework | Playwright 1.44+ |
| Browser | Chromium (headless) |

---

## Test Suites

### Suite 1: API Connectivity Pre-Checks (no browser)

These tests call the backend directly with `@playwright/test`'s `request` context,
independent of the frontend UI.

| Test | Expected | Notes |
|------|----------|-------|
| Backend health endpoint reachable | HTTP 200, body has `status` key | Confirms server is running |
| Empty body POST to /auth/login | HTTP 400 | Joi validation rejects missing fields |
| Wrong password | HTTP 401, `error` matches "Invalid email or password" | Generic message prevents enumeration |
| Non-existent user | HTTP 401 | Same message as wrong password |
| Valid credentials | HTTP 200, body has `data.token` and `data.user.email`, no `password` key | Full happy path |

### Suite 2: UI Login Flow — Happy Path

| Test | Expected |
|------|----------|
| Page loads at /login | Email input, password input, and submit button all visible |
| Valid credentials submit | API returns 200, JWT token present, URL changes away from /login |
| User info displayed after login | Admin email or name visible somewhere on the dashboard page |

### Suite 3: UI Login Flow — Invalid Email Format

| Test | Expected |
|------|----------|
| "not-an-email" as email value | Either HTML5 native validity fails OR app shows error message |
| "missingdomain@" as email | Either HTML5 native validity fails OR app shows error message |

### Suite 4: UI Login Flow — Missing Password

| Test | Expected |
|------|----------|
| Empty password field, submit | Either HTML5 required constraint fires OR app shows error |

### Suite 5: UI Login Flow — Wrong Credentials

| Test | Expected |
|------|----------|
| Valid email + wrong password | API returns 401, error text matches invalid/incorrect/credential pattern, stays on /login |
| Non-existent email | API returns 401, error text shown, stays on /login |
| Enumeration check | Error text for known-email/wrong-password EQUALS error for unknown-email (prevents account probing) |

### Suite 6: Network / Server Error Handling

| Test | Expected |
|------|----------|
| Network request aborted | App shows an error OR stays on /login — does not silently fail |
| Server returns 500 | App shows an error OR stays on /login |

### Suite 7: Authentication Token Security

| Test | Expected |
|------|----------|
| JWT structure | Token has three dot-separated parts (header.payload.signature) |
| Admin endpoint without token | HTTP 401 |
| Admin endpoint with valid admin token | HTTP 200, body has `data.stats` |
| Admin endpoint with non-admin user token | HTTP 403 |

---

## How to Run

```bash
# 1. Install dependencies (first time only)
cd e2e
npm install
npm run install:browsers

# 2. Ensure both servers are running:
#    - Backend:   cd relay-server-nodejs && npm start   (port 3000)
#    - Frontend:  cd admin-dashboard && npm run dev     (port 5174)

# 3. Run all tests
npm test

# 4. Run only the API tests (no browser needed)
npm run test:api-only

# 5. Run with visible browser window
npm run test:headed

# 6. Open HTML report after run
npm run report
```

---

## Artifacts

All artifacts are saved to `../test-results/`:

| Artifact | Location |
|----------|----------|
| PNG screenshots | `test-results/artifacts/*.png` |
| HTML report | `test-results/playwright-report/index.html` |
| JUnit XML | `test-results/junit.xml` |
| Trace files (on retry) | `test-results/artifacts/` |
| Videos (on retry) | `test-results/artifacts/` |

---

## Known Limitations / Assumptions

1. **Selector strategy**: The LoginPage POM tries `data-testid` attributes first, then
   falls back to `input[type="email"]`, `input[type="password"]`, `button[type="submit"]`,
   and ARIA roles. If the frontend uses none of these patterns, selectors need updating
   after running once with `--headed` to inspect the real DOM.

2. **Error message selectors**: Tests look for `[role="alert"]`, `.error`, `[class*="error"]`.
   If the frontend uses a different class/structure, update `LoginPage.errorMessage`.

3. **Redirect target**: After successful login the test only verifies the URL no longer
   contains `/login`. It does not assume a specific dashboard path.

4. **Test user availability**: Suite 7's last test (`non-admin user rejected by admin endpoint`)
   depends on `test@example.com` being seeded. If the seed has not been run, the test is
   skipped automatically.

5. **Rate limiting**: The backend limits to 100 requests per 15-minute window per IP.
   Running the full suite uses ~20 API calls, well within the limit.
