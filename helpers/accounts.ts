/**
 * Helpers for the account / roles / company scenarios.
 * Sessions are created through the API and injected into the browser, so each test
 * exercises the UI it is about instead of going through the sign-up form.
 */

import { APIRequestContext, Page } from '@playwright/test'
import { generateCredentials } from './api'

const API_URL = process.env.API_URL || 'http://localhost:3000'

/** Must match ADMIN_EMAILS of the backend under test (set in the workflow / compose file). */
export const ADMIN_EMAIL = 'admin@bookshelf.test'
const ADMIN_PASSWORD = 'Test@123456'

export type RoleName = 'reader' | 'buyer' | 'seller'

export interface Session {
  token: string
  user: { id: string; name: string; email: string; roles: string[] }
  password: string
}

export async function registerWithRoles(
  request: APIRequestContext,
  roles: RoleName[],
): Promise<Session> {
  const credentials = generateCredentials()
  const response = await request.post(`${API_URL}/api/auth/register`, {
    data: { name: credentials.name, email: credentials.email, password: credentials.password, roles },
  })
  if (!response.ok()) {
    throw new Error(`Failed to register: ${response.status()} ${await response.text()}`)
  }
  const body = await response.json()
  return { token: body.token, user: body.user, password: credentials.password }
}

/** The admin account is shared by every parallel test, so fall back to logging in. */
export async function adminSession(request: APIRequestContext): Promise<Session> {
  const register = await request.post(`${API_URL}/api/auth/register`, {
    data: { name: 'Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  const response = register.ok()
    ? register
    : await request.post(`${API_URL}/api/auth/login`, {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      })
  if (!response.ok()) {
    throw new Error(`Failed to sign in as admin: ${response.status()} ${await response.text()}`)
  }
  const body = await response.json()
  return { token: body.token, user: body.user, password: ADMIN_PASSWORD }
}

/** Opens `path` already signed in as the given session. */
export async function openAs(page: Page, session: Session, path: string) {
  await page.goto('/')
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    { token: session.token, user: session.user },
  )
  await page.goto(path)
}

/** A CNPJ with valid check digits, unique enough for parallel runs. */
export function generateCnpj(): string {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  const digit = (digits: number[], weights: number[]) => {
    const sum = digits.reduce((total, value, index) => total + value * weights[index], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const second = digit([...base, first], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return [...base, first, second].join('')
}

export function companyPayload(overrides: Record<string, unknown> = {}) {
  return {
    cnpj: generateCnpj(),
    legalName: `Sebo Teste ${Date.now()} LTDA`,
    tradeName: 'Sebo Teste',
    email: 'contato@sebo.test',
    address: {
      street: 'Rua dos Livros',
      number: '100',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zip: '01001000',
    },
    ...overrides,
  }
}

export async function createCompanyViaApi(
  request: APIRequestContext,
  session: Session,
  overrides: Record<string, unknown> = {},
) {
  const response = await request.post(`${API_URL}/api/companies`, {
    data: companyPayload(overrides),
    headers: { Authorization: `Bearer ${session.token}` },
  })
  if (!response.ok()) {
    throw new Error(`Failed to create company: ${response.status()} ${await response.text()}`)
  }
  return (await response.json()).company as { id: string; legalName: string; tradeName?: string }
}
