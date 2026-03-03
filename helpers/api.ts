/**
 * API helpers for test setup and teardown.
 * Uses Playwright's APIRequestContext — no browser needed.
 */

import { APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL || 'http://localhost:3000'

export interface UserCredentials {
  name: string
  email: string
  password: string
  token?: string
}

export interface Book {
  id: string
  title: string
  author: string
  status: string
  isbn?: string
  publisher?: string
  publishedYear?: number
  pages?: number
  language?: string
  description?: string
}

/**
 * Generates a short unique suffix using a combination of timestamp + random
 * to avoid duplicate key collisions when tests run in parallel.
 */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Generates unique user credentials */
export function generateCredentials(): UserCredentials {
  const id = uid()
  return {
    name: `Test User ${id}`,
    email: `user-${id}@test.com`,
    password: 'Test@123456',
  }
}

/** Generates a minimal book payload */
export function generateBook(overrides: Partial<Book> = {}) {
  const id = uid()
  return {
    title: `Test Book ${id}`,
    author: `Test Author ${id}`,
    ...overrides,
  }
}

/** Creates a user via API and returns credentials + token */
export async function createUser(
  request: APIRequestContext,
  credentials?: UserCredentials
): Promise<UserCredentials> {
  const creds = credentials ?? generateCredentials()

  const resp = await request.post(`${API_URL}/api/auth/register`, {
    data: { name: creds.name, email: creds.email, password: creds.password },
  })

  if (!resp.ok()) {
    throw new Error(`Failed to create user: ${resp.status()} ${await resp.text()}`)
  }

  const body = await resp.json()
  return { ...creds, token: body.token }
}

/** Logs in a user via API and returns the token */
export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const resp = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  })

  if (!resp.ok()) {
    throw new Error(`Login failed: ${resp.status()} ${await resp.text()}`)
  }

  const body = await resp.json()
  return body.token
}

/** Creates a book via API and returns it */
export async function createBook(
  request: APIRequestContext,
  token: string,
  bookData?: Partial<Book>
): Promise<Book> {
  const book = generateBook(bookData)

  const resp = await request.post(`${API_URL}/api/books`, {
    data: book,
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!resp.ok()) {
    throw new Error(`Failed to create book: ${resp.status()} ${await resp.text()}`)
  }

  const body = await resp.json()
  return body.book
}

/** Creates N books via API and returns them */
export async function createBooks(
  request: APIRequestContext,
  token: string,
  count: number
): Promise<Book[]> {
  const books: Book[] = []
  for (let i = 0; i < count; i++) {
    books.push(await createBook(request, token))
  }
  return books
}

/** Deletes all books for a user via API */
export async function deleteAllBooks(
  request: APIRequestContext,
  token: string
): Promise<void> {
  const resp = await request.get(`${API_URL}/api/books`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!resp.ok()) return

  const { books } = await resp.json()
  for (const book of books) {
    await request.delete(`${API_URL}/api/books/${book.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }
}

/** Updates a book's status via API */
export async function updateBookStatus(
  request: APIRequestContext,
  token: string,
  bookId: string,
  status: 'to_read' | 'reading' | 'read'
): Promise<void> {
  await request.patch(`${API_URL}/api/books/${bookId}/status`, {
    data: { status },
    headers: { Authorization: `Bearer ${token}` },
  })
}
