import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { adminSession, openAs, registerWithRoles, type Session } from '../../helpers/accounts'

const API_URL = process.env.API_URL || 'http://localhost:3000'

/** A random ISBN-13 with a valid check digit (the API validates it). */
function generateIsbn(): string {
  const twelve = `978${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`
  const sum = twelve.split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  return `${twelve}${(10 - (sum % 10)) % 10}`
}

const auth = (session: Session) => ({ Authorization: `Bearer ${session.token}` })

async function shelve(request: APIRequestContext, session: Session, data: Record<string, unknown>) {
  const response = await request.post(`${API_URL}/api/books`, { data, headers: auth(session) })
  return { status: response.status(), body: await response.json() }
}

async function confirmAsAdmin(request: APIRequestContext, admin: Session, catalogBookId: string) {
  const response = await request.post(`${API_URL}/api/admin/catalog/books/${catalogBookId}/review`, {
    headers: auth(admin),
  })
  expect(response.ok()).toBeTruthy()
}

test.describe('Catalog — one book, many shelves', () => {
  test('two readers adding the same ISBN share one catalog book and see its data', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const bia = await registerWithRoles(request, ['reader'])
    const isbn = generateIsbn()
    const title = `Catalogo ${Date.now()}`

    const first = await shelve(request, ana, { title, author: 'Autora Original', isbn })
    const second = await shelve(request, bia, { title: 'Outro título digitado', author: 'Outro', isbn })

    expect(second.status).toBe(201)
    expect(second.body.book.catalogBookId).toBe(first.body.book.catalogBookId)

    await openAs(page, bia, '/dashboard')
    await expect(page.getByTestId(`book-item-${second.body.book.id}`)).toContainText(title)
  })

  test('the same reader cannot shelve the same ISBN twice', async ({ request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const isbn = generateIsbn()
    await shelve(request, ana, { title: 'Um', author: 'A', isbn })

    const again = await shelve(request, ana, { title: 'Um', author: 'A', isbn })

    expect(again.status).toBe(409)
    expect(again.body.code).toBe('ISBN_ALREADY_REGISTERED')
  })

  test('an invalid ISBN is rejected', async ({ request }) => {
    const ana = await registerWithRoles(request, ['reader'])

    const response = await shelve(request, ana, { title: 'X', author: 'Y', isbn: '9781234567890' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('INVALID_ISBN')
  })
})

test.describe('Catalog — moderation', () => {
  test('an admin confirms a new registration from the review queue', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    const title = `Novo ${Date.now()}`
    const created = await shelve(request, ana, { title, author: 'A', isbn: generateIsbn() })
    const catalogId = created.body.book.catalogBookId as string

    await openAs(page, admin, '/admin/catalog')
    // Every test book waits in the queue, so narrow it to this one.
    await page.getByTestId('catalog-search').fill(title)
    await expect(page.getByTestId(`catalog-book-${catalogId}`)).toBeVisible()
    await page.getByTestId(`catalog-confirm-${catalogId}`).click()

    await expect(page.getByTestId(`catalog-book-${catalogId}`)).toHaveCount(0)
  })

  test('an edit to a reviewed book waits for approval, and approving it updates the title', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    const oldTitle = `Antigo ${Date.now()}`
    const newTitle = `Novo titulo ${Date.now()}`
    const created = await shelve(request, ana, { title: oldTitle, author: 'A', isbn: generateIsbn() })
    const bookId = created.body.book.id as string
    await confirmAsAdmin(request, admin, created.body.book.catalogBookId)

    // The reader edits the title in the UI: it does not change yet.
    await openAs(page, ana, '/dashboard')
    await page.getByTestId(`edit-book-${bookId}`).click()
    await page.locator('#title').fill(newTitle)
    await page.getByTestId('save-book-button').click()
    await expect(page.getByTestId('edit-pending-notice')).toBeVisible()
    await expect(page.getByTestId(`book-pending-${bookId}`)).toBeVisible()
    await expect(page.getByTestId(`book-item-${bookId}`)).toContainText(oldTitle)

    // The admin approves it in the moderation page.
    await openAs(page, admin, '/admin/catalog')
    await page.getByTestId('catalog-tab-revisions').click()
    const revision = page.getByTestId('catalog-revisions-list').getByRole('listitem').filter({ hasText: oldTitle })
    await expect(revision).toContainText(newTitle)
    await revision.getByRole('button', { name: 'Aprovar' }).click()
    await expect(page.getByText(newTitle)).toHaveCount(0)

    await openAs(page, ana, '/dashboard')
    await expect(page.getByTestId(`book-item-${bookId}`)).toContainText(newTitle)
    await expect(page.getByTestId(`book-pending-${bookId}`)).toHaveCount(0)
  })

  test('rejecting a proposed edit keeps the title and clears the marker', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    const title = `Mantido ${Date.now()}`
    const created = await shelve(request, ana, { title, author: 'A', isbn: generateIsbn() })
    const bookId = created.body.book.id as string
    await confirmAsAdmin(request, admin, created.body.book.catalogBookId)
    const proposed = await request.put(`${API_URL}/api/books/${bookId}`, {
      data: { title: 'Titulo indevido' },
      headers: auth(ana),
    })
    const revisionId = (await proposed.json()).book.pendingRevision.id as string

    await openAs(page, admin, '/admin/catalog')
    await page.getByTestId('catalog-tab-revisions').click()
    await page.getByTestId(`catalog-reject-${revisionId}`).click()
    await expect(page.getByTestId(`catalog-revision-${revisionId}`)).toHaveCount(0)

    await openAs(page, ana, '/dashboard')
    await expect(page.getByTestId(`book-item-${bookId}`)).toContainText(title)
    await expect(page.getByTestId(`book-pending-${bookId}`)).toHaveCount(0)
  })

  test('the creator can still fix a fresh registration directly', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const created = await shelve(request, ana, { title: 'Titulo com erro', author: 'A' })
    const bookId = created.body.book.id as string

    await openAs(page, ana, '/dashboard')
    await page.getByTestId(`edit-book-${bookId}`).click()
    await page.locator('#title').fill('Titulo corrigido')
    await page.getByTestId('save-book-button').click()

    await expect(page.getByTestId(`book-item-${bookId}`)).toContainText('Titulo corrigido')
    await expect(page.getByTestId('edit-pending-notice')).toHaveCount(0)
  })

  test('hiding a book blocks new registrations of it', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['reader'])
    const bia = await registerWithRoles(request, ['reader'])
    const admin = await adminSession(request)
    const isbn = generateIsbn()
    const title = `Ocultar ${Date.now()}`
    const created = await shelve(request, ana, { title, author: 'A', isbn })
    const catalogId = created.body.book.catalogBookId as string

    await openAs(page, admin, '/admin/catalog')
    await page.getByTestId('catalog-search').fill(title)
    await page.getByTestId(`catalog-hide-${catalogId}`).click()
    await expect(page.getByTestId(`catalog-book-${catalogId}`)).toHaveCount(0)

    const blocked = await shelve(request, bia, { title: 'Qualquer', author: 'B', isbn })
    expect(blocked.status).toBe(409)
    expect(blocked.body.code).toBe('CATALOG_BOOK_HIDDEN')
  })

  test('only admins can open the catalog moderation page', async ({ page, request }) => {
    const reader = await registerWithRoles(request, ['reader'])

    await openAs(page, reader, '/admin/catalog')

    await expect(page).toHaveURL(/\/account/)
  })
})
