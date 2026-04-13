import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for the Admin Dashboard Login page.
 *
 * Selectors use a priority chain:
 *   1. data-testid attributes (preferred)
 *   2. ARIA roles / labels
 *   3. Common input[type] + button patterns as fallback
 *
 * This makes the POM resilient to minor HTML refactors while
 * keeping selectors readable.
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Email field — tries data-testid first, then common patterns
    this.emailInput = page
      .locator('[data-testid="email-input"]')
      .or(page.locator('input[type="email"]'))
      .or(page.locator('input[name="email"]'))
      .or(page.getByLabel(/email/i))
      .first();

    // Password field
    this.passwordInput = page
      .locator('[data-testid="password-input"]')
      .or(page.locator('input[type="password"]'))
      .or(page.locator('input[name="password"]'))
      .or(page.getByLabel(/password/i))
      .first();

    // Submit / login button
    this.submitButton = page
      .locator('[data-testid="login-button"]')
      .or(page.locator('button[type="submit"]'))
      .or(page.getByRole('button', { name: /sign in|log in|login/i }))
      .first();

    // Generic error banner (e.g. "Invalid email or password")
    this.errorMessage = page
      .locator('[data-testid="error-message"]')
      .or(page.locator('[role="alert"]'))
      .or(page.locator('.error-message, .error, .alert-error, [class*="error"]'))
      .first();

    // Inline field-level validation messages
    this.emailError = page
      .locator('[data-testid="email-error"]')
      .or(page.locator('[id*="email"][class*="error"], [id*="email-error"]'))
      .first();

    this.passwordError = page
      .locator('[data-testid="password-error"]')
      .or(page.locator('[id*="password"][class*="error"], [id*="password-error"]'))
      .first();
  }

  async goto() {
    await this.page.goto('/login');
    // Wait for the email input to confirm the page is interactive
    await this.emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async fillEmail(email: string) {
    await this.emailInput.clear();
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Waits for any visible error text on the page.
   * Returns the text content for assertions.
   */
  async getErrorText(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 8_000 });
    return (await this.errorMessage.textContent()) ?? '';
  }

  /**
   * Waits for the page URL to change away from /login,
   * confirming a successful redirect after login.
   */
  async waitForSuccessfulRedirect() {
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10_000,
    });
  }
}
