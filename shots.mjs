import { chromium } from '@playwright/test'

const mkBook = (i, extra = {}) => ({
  id: `id-${i}`,
  title: `Livro de exemplo ${i}`,
  author: `Autor ${i}`,
  status: ['to_read', 'reading', 'read'][i % 3],
  description: i % 2 ? 'Uma descrição curta do livro para o teste visual.' : undefined,
  rating: i % 3 === 0 ? 4 : undefined,
  notes: i % 4 === 0 ? 'Anotação pessoal sobre o livro.' : undefined,
  isbn: `978-000000${i}`,
  publishedYear: 2000 + i,
  userId: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...extra,
})
const all = Array.from({ length: 12 }, (_, i) => mkBook(i + 1))

const browser = await chromium.launch()
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 }, colorScheme: scheme, locale: 'pt-BR' })
  await ctx.addInitScript(() => {
    localStorage.setItem('token', 't')
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Ana', email: 'ana@x.com' }))
  })
  const page = await ctx.newPage()
  await page.route('**/api/books**', async (route) => {
    const url = new URL(route.request().url())
    const p = Number(url.searchParams.get('page') || 1)
    const limit = Number(url.searchParams.get('limit') || 9)
    const search = (url.searchParams.get('search') || '').toLowerCase()
    let list = all.filter((b) => !search || b.title.toLowerCase().includes(search))
    const total = list.length
    list = list.slice((p - 1) * limit, p * limit)
    await route.fulfill({
      json: { books: list, pagination: { page: p, limit, total, totalPages: Math.ceil(total / limit) } },
    })
  })
  await page.route('**/api/stats**', (route) =>
    route.fulfill({
      json: { stats: { total: 12, byStatus: { toRead: 4, reading: 4, read: 4 }, averageRating: 4, totalPages: 0, booksWithRating: 4 } },
    }),
  )
  await page.goto('http://localhost:5173/dashboard')
  await page.waitForSelector('[data-testid="book-item-id-1"]')
  await page.screenshot({ path: `dashboard-${scheme}.png`, fullPage: true })

  await page.click('[data-testid="add-book-button"]')
  await page.waitForSelector('[data-testid="book-modal"]')
  await page.screenshot({ path: `modal-${scheme}.png` })
  await ctx.close()
}
await browser.close()
console.log('done')
