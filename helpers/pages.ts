/**
 * Page Object Model helpers.
 * Thin wrappers around common UI interactions to avoid selector duplication.
 */

import { Page, Locator } from '@playwright/test'

// ─── Login Page ──────────────────────────────────────────────────────────────

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByTestId('email-input')
    this.passwordInput = page.getByTestId('password-input')
    this.loginButton = page.getByTestId('login-button')
    this.errorMessage = page.getByTestId('error-message')
  }

  async goto() {
    await this.page.goto('/login')
    await this.page.waitForSelector('[data-testid="login-page"]')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}

// ─── Register Page ────────────────────────────────────────────────────────────

export class RegisterPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly registerButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.getByTestId('name-input')
    this.emailInput = page.getByTestId('email-input')
    this.passwordInput = page.getByTestId('password-input')
    this.registerButton = page.getByTestId('register-button')
    this.errorMessage = page.getByTestId('error-message')
  }

  async goto() {
    await this.page.goto('/register')
    await this.page.waitForSelector('[data-testid="register-page"]')
  }

  async register(name: string, email: string, password: string) {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.registerButton.click()
  }
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export class DashboardPage {
  readonly page: Page
  readonly addBookButton: Locator
  readonly statsTotal: Locator
  readonly statsReading: Locator
  readonly statsRead: Locator
  readonly statsToRead: Locator

  constructor(page: Page) {
    this.page = page
    this.addBookButton = page.getByTestId('add-book-button')
    this.statsTotal = page.getByTestId('stats-total')
    this.statsReading = page.getByTestId('stats-reading')
    this.statsRead = page.getByTestId('stats-read')
    this.statsToRead = page.getByTestId('stats-to-read')
  }

  async getStatNumber(locator: Locator): Promise<number> {
    const text = await locator.textContent()
    const match = text?.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }

  async getTotalBooks(): Promise<number> {
    return this.getStatNumber(this.statsTotal)
  }

  bookItem(bookId: string): Locator {
    return this.page.getByTestId(`book-item-${bookId}`)
  }

  editButton(bookId: string): Locator {
    return this.page.getByTestId(`edit-book-${bookId}`)
  }

  deleteButton(bookId: string): Locator {
    return this.page.getByTestId(`delete-book-${bookId}`)
  }
}

// ─── Book Modal ───────────────────────────────────────────────────────────────

export class BookModal {
  readonly page: Page
  readonly modal: Locator
  readonly titleInput: Locator
  readonly authorInput: Locator
  readonly isbnInput: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator
  readonly closeButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.getByTestId('book-modal')
    this.titleInput = page.locator('#title')
    this.authorInput = page.locator('#author')
    this.isbnInput = page.locator('#isbn')
    this.saveButton = page.getByTestId('save-book-button')
    this.cancelButton = page.getByTestId('cancel-button')
    this.closeButton = page.getByTestId('modal-close-button')
    this.errorMessage = page.locator('[role="alert"]')
  }

  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible' })
  }

  async waitForClose() {
    await this.modal.waitFor({ state: 'hidden' })
  }

  async fillRequired(title: string, author: string) {
    await this.titleInput.fill(title)
    await this.authorInput.fill(author)
  }

  async submit() {
    await this.saveButton.click()
  }

  async cancel() {
    await this.cancelButton.click()
  }
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

export class DeleteModal {
  readonly page: Page
  readonly modal: Locator
  readonly confirmButton: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.modal = page.getByTestId('delete-confirm-modal')
    this.confirmButton = page.getByTestId('confirm-delete-button')
    this.cancelButton = page.getByTestId('cancel-delete-button')
  }

  async waitForOpen() {
    await this.modal.waitFor({ state: 'visible' })
  }

  async confirm() {
    await this.confirmButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async cancel() {
    await this.cancelButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }
}
