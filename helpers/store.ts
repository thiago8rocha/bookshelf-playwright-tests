/**
 * Helpers for the second-hand bookstore scenarios: catalog books and listings are created through the
 * API so each test drives only the screens it is about.
 */

import type { APIRequestContext } from '@playwright/test'
import { registerWithRoles, type Session } from './accounts'

const API_URL = process.env.API_URL || 'http://localhost:3000'

export const auth = (session: Session) => ({ Authorization: `Bearer ${session.token}` })

/** A random ISBN-13 with a valid check digit (the API validates it). */
export function generateIsbn(): string {
  const twelve = `978${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`
  const sum = twelve.split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  return `${twelve}${(10 - (sum % 10)) % 10}`
}

/** A book in the shared catalog (shelved by a throwaway reader); returns its catalog id. */
export async function createCatalogBook(request: APIRequestContext, title: string): Promise<string> {
  const reader = await registerWithRoles(request, ['reader'])
  const response = await request.post(`${API_URL}/api/books`, {
    data: { title, author: 'Autora do Sebo', isbn: generateIsbn() },
    headers: auth(reader),
  })
  if (!response.ok()) throw new Error(`Failed to shelve: ${response.status()} ${await response.text()}`)
  return (await response.json()).book.catalogBookId as string
}

export interface ListingOptions {
  title?: string
  priceCents?: number
  quantity?: number
  shippingFeeCents?: number
  pickupAvailable?: boolean
}

/** Puts a fresh catalog book up for sale as `seller`; returns the listing id and its title. */
export async function createListing(request: APIRequestContext, seller: Session, options: ListingOptions = {}) {
  const title = options.title ?? `Sebo ${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const catalogBookId = await createCatalogBook(request, title)
  const response = await request.post(`${API_URL}/api/marketplace/listings`, {
    data: {
      catalogBookId,
      priceCents: options.priceCents ?? 2500,
      condition: 'good',
      quantity: options.quantity ?? 3,
      shippingFeeCents: options.shippingFeeCents ?? 1200,
      pickupAvailable: options.pickupAvailable ?? true,
    },
    headers: auth(seller),
  })
  if (!response.ok()) throw new Error(`Failed to list: ${response.status()} ${await response.text()}`)
  return { id: (await response.json()).listing.id as string, title }
}

export async function placeOrderViaApi(request: APIRequestContext, buyer: Session, listingId: string, quantity = 1) {
  const response = await request.post(`${API_URL}/api/marketplace/orders`, {
    data: { items: [{ listingId, quantity }], shippingMethod: 'pickup' },
    headers: auth(buyer),
  })
  return { status: response.status(), body: await response.json() }
}

export const TEST_CARDS = {
  approved: '4242 4242 4242 4242',
  declined: '4000 0000 0000 0002',
  noFunds: '4000 0000 0000 9995',
  real: '4111 1111 1111 1111',
} as const
