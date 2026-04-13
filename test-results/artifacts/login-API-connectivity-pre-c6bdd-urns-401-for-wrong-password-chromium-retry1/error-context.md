# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> API connectivity pre-checks >> login endpoint returns 401 for wrong password
- Location: tests/login.spec.ts:51:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 401
Received: 404
```

# Test source

```ts
  1   | import { test, expect, request } from '@playwright/test';
  2   | import * as fs from 'fs';
  3   | import * as path from 'path';
  4   | import { LoginPage } from '../pages/LoginPage';
  5   | 
  6   | // ---------------------------------------------------------------------------
  7   | // Constants
  8   | // ---------------------------------------------------------------------------
  9   | const BASE_URL = 'http://localhost:5174';
  10  | const API_URL = 'http://localhost:3000/api';
  11  | const VALID_EMAIL = 'admin@example.com';
  12  | const VALID_PASSWORD = 'admin_password_change_me';
  13  | const ARTIFACTS_DIR = path.join(__dirname, '../../test-results/artifacts');
  14  | 
  15  | // Ensure artifacts directory exists
  16  | if (!fs.existsSync(ARTIFACTS_DIR)) {
  17  |   fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  18  | }
  19  | 
  20  | // ---------------------------------------------------------------------------
  21  | // Helpers
  22  | // ---------------------------------------------------------------------------
  23  | async function captureScreenshot(page: import('@playwright/test').Page, name: string) {
  24  |   const filePath = path.join(ARTIFACTS_DIR, `${name}-${Date.now()}.png`);
  25  |   await page.screenshot({ path: filePath, fullPage: true });
  26  |   console.log(`Screenshot saved: ${filePath}`);
  27  |   return filePath;
  28  | }
  29  | 
  30  | // ---------------------------------------------------------------------------
  31  | // Suite: API Health Checks (no browser needed)
  32  | // ---------------------------------------------------------------------------
  33  | test.describe('API connectivity pre-checks', () => {
  34  |   test('backend health endpoint is reachable', async () => {
  35  |     const ctx = await request.newContext({ baseURL: API_URL });
  36  |     const response = await ctx.get('/health');
  37  |     expect(response.status()).toBe(200);
  38  |     const body = await response.json();
  39  |     expect(body).toHaveProperty('status');
  40  |     await ctx.dispose();
  41  |   });
  42  | 
  43  |   test('login endpoint returns 400 for empty body', async () => {
  44  |     const ctx = await request.newContext({ baseURL: API_URL });
  45  |     const response = await ctx.post('/auth/login', { data: {} });
  46  |     // Joi validation returns 400 for missing required fields
  47  |     expect(response.status()).toBe(400);
  48  |     await ctx.dispose();
  49  |   });
  50  | 
  51  |   test('login endpoint returns 401 for wrong password', async () => {
  52  |     const ctx = await request.newContext({ baseURL: API_URL });
  53  |     const response = await ctx.post('/auth/login', {
  54  |       data: { email: VALID_EMAIL, password: 'totally_wrong_password' },
  55  |     });
> 56  |     expect(response.status()).toBe(401);
      |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  57  |     const body = await response.json();
  58  |     // Server returns { success: false, error: 'Invalid email or password' }
  59  |     expect(body.error ?? body.message).toMatch(/invalid email or password/i);
  60  |     await ctx.dispose();
  61  |   });
  62  | 
  63  |   test('login endpoint returns 401 for non-existent user', async () => {
  64  |     const ctx = await request.newContext({ baseURL: API_URL });
  65  |     const response = await ctx.post('/auth/login', {
  66  |       data: { email: 'no_such_user@example.com', password: 'SomePassword1!' },
  67  |     });
  68  |     expect(response.status()).toBe(401);
  69  |     await ctx.dispose();
  70  |   });
  71  | 
  72  |   test('login endpoint accepts valid credentials and returns JWT', async () => {
  73  |     const ctx = await request.newContext({ baseURL: API_URL });
  74  |     const response = await ctx.post('/auth/login', {
  75  |       data: { email: VALID_EMAIL, password: VALID_PASSWORD },
  76  |     });
  77  |     expect(response.status()).toBe(200);
  78  |     const body = await response.json();
  79  |     expect(body).toHaveProperty('data');
  80  |     expect(body.data).toHaveProperty('token');
  81  |     expect(body.data).toHaveProperty('user');
  82  |     expect(body.data.user.email).toBe(VALID_EMAIL);
  83  |     expect(body.data.user.role).toBe('admin');
  84  |     // Password must NOT be present in response
  85  |     expect(body.data.user).not.toHaveProperty('password');
  86  |     await ctx.dispose();
  87  |   });
  88  | });
  89  | 
  90  | // ---------------------------------------------------------------------------
  91  | // Suite: UI Login Flow (browser)
  92  | // ---------------------------------------------------------------------------
  93  | test.describe('Login page - happy path', () => {
  94  |   test('page loads at /login', async ({ page }) => {
  95  |     const loginPage = new LoginPage(page);
  96  |     await loginPage.goto();
  97  | 
  98  |     await captureScreenshot(page, 'login-page-load');
  99  |     await expect(loginPage.emailInput).toBeVisible();
  100 |     await expect(loginPage.passwordInput).toBeVisible();
  101 |     await expect(loginPage.submitButton).toBeVisible();
  102 |   });
  103 | 
  104 |   test('valid credentials log in and redirect away from /login', async ({ page }) => {
  105 |     const loginPage = new LoginPage(page);
  106 |     await loginPage.goto();
  107 | 
  108 |     // Intercept the API call to observe real request/response
  109 |     const [loginResponse] = await Promise.all([
  110 |       page.waitForResponse(
  111 |         (res) =>
  112 |           res.url().includes('/api/auth/login') && res.request().method() === 'POST',
  113 |         { timeout: 15_000 },
  114 |       ),
  115 |       loginPage.login(VALID_EMAIL, VALID_PASSWORD),
  116 |     ]);
  117 | 
  118 |     // Verify network response is successful
  119 |     expect(loginResponse.status()).toBe(200);
  120 |     const responseBody = await loginResponse.json();
  121 |     expect(responseBody.data?.token).toBeTruthy();
  122 | 
  123 |     // Verify redirect happened
  124 |     await loginPage.waitForSuccessfulRedirect();
  125 |     expect(page.url()).not.toContain('/login');
  126 | 
  127 |     await captureScreenshot(page, 'after-successful-login');
  128 |   });
  129 | 
  130 |   test('user info is displayed on dashboard after login', async ({ page }) => {
  131 |     const loginPage = new LoginPage(page);
  132 |     await loginPage.goto();
  133 |     await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
  134 |     await loginPage.waitForSuccessfulRedirect();
  135 | 
  136 |     // Look for any display of the admin email or name anywhere on the page
  137 |     const emailPattern = new RegExp(VALID_EMAIL.replace('@', '\\@'), 'i');
  138 |     const namePattern = /admin/i;
  139 | 
  140 |     const hasEmail = await page
  141 |       .getByText(emailPattern)
  142 |       .first()
  143 |       .isVisible()
  144 |       .catch(() => false);
  145 | 
  146 |     const hasName = await page
  147 |       .getByText(namePattern)
  148 |       .first()
  149 |       .isVisible()
  150 |       .catch(() => false);
  151 | 
  152 |     await captureScreenshot(page, 'dashboard-after-login');
  153 | 
  154 |     expect(hasEmail || hasName).toBe(true);
  155 |   });
  156 | });
```