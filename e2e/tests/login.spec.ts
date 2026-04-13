import { test, expect, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:3000/api';
const VALID_EMAIL = 'admin@example.com';
const VALID_PASSWORD = 'admin_password_change_me';
const ARTIFACTS_DIR = path.join(__dirname, '../../test-results/artifacts');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function captureScreenshot(page: import('@playwright/test').Page, name: string) {
  const filePath = path.join(ARTIFACTS_DIR, `${name}-${Date.now()}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Screenshot saved: ${filePath}`);
  return filePath;
}

// ---------------------------------------------------------------------------
// Suite: API Health Checks (no browser needed)
// ---------------------------------------------------------------------------
test.describe('API connectivity pre-checks', () => {
  test('backend health endpoint is reachable', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.get('/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
    await ctx.dispose();
  });

  test('login endpoint returns 400 for empty body', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.post('/auth/login', { data: {} });
    // Joi validation returns 400 for missing required fields
    expect(response.status()).toBe(400);
    await ctx.dispose();
  });

  test('login endpoint returns 401 for wrong password', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.post('/auth/login', {
      data: { email: VALID_EMAIL, password: 'totally_wrong_password' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    // Server returns { success: false, error: 'Invalid email or password' }
    expect(body.error ?? body.message).toMatch(/invalid email or password/i);
    await ctx.dispose();
  });

  test('login endpoint returns 401 for non-existent user', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.post('/auth/login', {
      data: { email: 'no_such_user@example.com', password: 'SomePassword1!' },
    });
    expect(response.status()).toBe(401);
    await ctx.dispose();
  });

  test('login endpoint accepts valid credentials and returns JWT', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.post('/auth/login', {
      data: { email: VALID_EMAIL, password: VALID_PASSWORD },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('token');
    expect(body.data).toHaveProperty('user');
    expect(body.data.user.email).toBe(VALID_EMAIL);
    expect(body.data.user.role).toBe('admin');
    // Password must NOT be present in response
    expect(body.data.user).not.toHaveProperty('password');
    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// Suite: UI Login Flow (browser)
// ---------------------------------------------------------------------------
test.describe('Login page - happy path', () => {
  test('page loads at /login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await captureScreenshot(page, 'login-page-load');
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('valid credentials log in and redirect away from /login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Intercept the API call to observe real request/response
    const [loginResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/login') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      loginPage.login(VALID_EMAIL, VALID_PASSWORD),
    ]);

    // Verify network response is successful
    expect(loginResponse.status()).toBe(200);
    const responseBody = await loginResponse.json();
    expect(responseBody.data?.token).toBeTruthy();

    // Verify redirect happened
    await loginPage.waitForSuccessfulRedirect();
    expect(page.url()).not.toContain('/login');

    await captureScreenshot(page, 'after-successful-login');
  });

  test('user info is displayed on dashboard after login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
    await loginPage.waitForSuccessfulRedirect();

    // Look for any display of the admin email or name anywhere on the page
    const emailPattern = new RegExp(VALID_EMAIL.replace('@', '\\@'), 'i');
    const namePattern = /admin/i;

    const hasEmail = await page
      .getByText(emailPattern)
      .first()
      .isVisible()
      .catch(() => false);

    const hasName = await page
      .getByText(namePattern)
      .first()
      .isVisible()
      .catch(() => false);

    await captureScreenshot(page, 'dashboard-after-login');

    expect(hasEmail || hasName).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Suite: UI Login Flow - edge cases
// ---------------------------------------------------------------------------
test.describe('Login page - invalid email format', () => {
  test('shows error for malformed email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail('not-an-email');
    await loginPage.fillPassword(VALID_PASSWORD);
    await loginPage.submit();

    // Either browser native validation or app-level error should fire
    // Check for HTML5 validation state first
    const emailInputHandle = await loginPage.emailInput.elementHandle();
    const isValid = await page.evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
      emailInputHandle,
    );

    if (!isValid) {
      // Native browser validation caught it — pass
      console.log('Native HTML5 email validation fired as expected');
      await captureScreenshot(page, 'invalid-email-native-validation');
    } else {
      // App-level validation should show an error message
      const errorText = await loginPage.getErrorText();
      console.log('App validation error text:', errorText);
      expect(errorText.length).toBeGreaterThan(0);
      await captureScreenshot(page, 'invalid-email-app-validation');
    }
  });

  test('shows error for email without domain', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail('missingdomain@');
    await loginPage.fillPassword(VALID_PASSWORD);
    await loginPage.submit();

    const emailInputHandle = await loginPage.emailInput.elementHandle();
    const isValid = await page.evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
      emailInputHandle,
    );

    if (!isValid) {
      console.log('Native HTML5 validation caught missing domain');
    } else {
      const errorText = await loginPage.getErrorText();
      expect(errorText.length).toBeGreaterThan(0);
    }
    await captureScreenshot(page, 'email-missing-domain');
  });
});

test.describe('Login page - missing password', () => {
  test('shows error when password field is empty', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail(VALID_EMAIL);
    // Leave password blank
    await loginPage.submit();

    // Check HTML5 required constraint on password input
    const passwordInputHandle = await loginPage.passwordInput.elementHandle();
    const isValid = await page.evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
      passwordInputHandle,
    );

    if (!isValid) {
      console.log('Native HTML5 required constraint fired on empty password');
    } else {
      // App may still try and should show an error
      const errorText = await loginPage.getErrorText();
      expect(errorText.length).toBeGreaterThan(0);
    }
    await captureScreenshot(page, 'missing-password');
  });
});

test.describe('Login page - wrong credentials', () => {
  test('shows error for wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const [loginResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/login') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      loginPage.login(VALID_EMAIL, 'WrongPassword123!'),
    ]);

    expect(loginResponse.status()).toBe(401);

    const errorText = await loginPage.getErrorText();
    console.log('Wrong password error text:', errorText);
    expect(errorText).toMatch(/invalid|incorrect|wrong|password|credential/i);

    // Must stay on login page
    expect(page.url()).toContain('/login');
    await captureScreenshot(page, 'wrong-password-error');
  });

  test('shows error for non-existent user', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const [loginResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/login') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      loginPage.login('nobody@notreal.xyz', 'SomePassword1!'),
    ]);

    expect(loginResponse.status()).toBe(401);

    const errorText = await loginPage.getErrorText();
    console.log('Non-existent user error text:', errorText);
    expect(errorText).toMatch(/invalid|not found|no account|credential/i);

    expect(page.url()).toContain('/login');
    await captureScreenshot(page, 'nonexistent-user-error');
  });

  test('does not expose whether email exists (same error for both cases)', async ({ page }) => {
    // Security check: wrong-password and unknown-email should produce identical
    // UI error text to prevent user enumeration
    const loginPage = new LoginPage(page);

    // Test 1: known email, wrong password
    await loginPage.goto();
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      loginPage.login(VALID_EMAIL, 'WrongPassword!'),
    ]);
    const errorForKnownEmail = await loginPage.getErrorText();

    // Test 2: unknown email
    await loginPage.goto();
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      loginPage.login('unknown@nowhere.xyz', 'WrongPassword!'),
    ]);
    const errorForUnknownEmail = await loginPage.getErrorText();

    console.log('Known email error  :', errorForKnownEmail);
    console.log('Unknown email error:', errorForUnknownEmail);

    // Both errors should be the same generic message
    expect(errorForKnownEmail.toLowerCase()).toBe(errorForUnknownEmail.toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// Suite: Network error handling
// ---------------------------------------------------------------------------
test.describe('Login page - network / server errors', () => {
  test('handles network failure gracefully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Abort the login API request to simulate network failure
    await page.route('**/api/auth/login', (route) => route.abort('failed'));

    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);

    // App should show some kind of error rather than hang silently
    // Give the UI up to 8 seconds to display it
    try {
      const errorText = await loginPage.getErrorText();
      console.log('Network error text:', errorText);
      expect(errorText.length).toBeGreaterThan(0);
    } catch {
      // If no explicit error message, at minimum the user should not have
      // been redirected to the dashboard
      expect(page.url()).toContain('/login');
    }
    await captureScreenshot(page, 'network-failure');
  });

  test('handles 500 server error gracefully', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mock a 500 response
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      }),
    );

    await loginPage.login(VALID_EMAIL, VALID_PASSWORD);

    try {
      const errorText = await loginPage.getErrorText();
      console.log('500 error text:', errorText);
      expect(errorText.length).toBeGreaterThan(0);
    } catch {
      expect(page.url()).toContain('/login');
    }
    await captureScreenshot(page, 'server-500-error');
  });
});

// ---------------------------------------------------------------------------
// Suite: Security / token checks
// ---------------------------------------------------------------------------
test.describe('Authentication token security', () => {
  test('JWT token returned by API is a valid three-part token', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.post('/auth/login', {
      data: { email: VALID_EMAIL, password: VALID_PASSWORD },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const token: string = body.data?.token ?? '';
    // JWT structure: header.payload.signature
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    await ctx.dispose();
  });

  test('protected admin endpoint returns 401 without token', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const response = await ctx.get('/admin/dashboard');
    expect(response.status()).toBe(401);
    await ctx.dispose();
  });

  test('protected admin endpoint returns 200 with valid admin token', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });

    // First login to get token
    const loginRes = await ctx.post('/auth/login', {
      data: { email: VALID_EMAIL, password: VALID_PASSWORD },
    });
    expect(loginRes.status()).toBe(200);
    const { data } = await loginRes.json();
    const token: string = data.token;

    // Use token on admin endpoint
    const dashRes = await ctx.get('/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dashRes.status()).toBe(200);
    const dashBody = await dashRes.json();
    expect(dashBody.data).toHaveProperty('stats');

    await ctx.dispose();
  });

  test('non-admin user token is rejected by admin endpoint with 403', async () => {
    // The test user has role "user", not "admin"
    const ctx = await request.newContext({ baseURL: API_URL });

    const loginRes = await ctx.post('/auth/login', {
      data: { email: 'test@example.com', password: 'password123' },
    });

    if (loginRes.status() !== 200) {
      test.skip();
      return;
    }

    const { data } = await loginRes.json();
    const token: string = data.token;

    const dashRes = await ctx.get('/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dashRes.status()).toBe(403);

    await ctx.dispose();
  });
});
