import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { adminSession, openAs, registerWithRoles, type Session } from '../../helpers/accounts'
import { TEST_CARDS, createCatalogBook, createListing, placeOrderViaApi } from '../../helpers/store'

/** Finds one listing in the bookstore by its (unique) title and adds it to the cart. */
async function addToCart(page: Page, listingId: string, title: string) {
  await page.getByTestId('store-search').fill(title)
  await expect(page.getByTestId(`listing-card-${listingId}`)).toBeVisible()
  await page.getByTestId(`add-to-cart-${listingId}`).click()
}

async function fillAddress(page: Page, sellerId: string) {
  const values = {
    recipient: 'Bia Compradora',
    street: 'Rua das Flores',
    number: '10',
    district: 'Centro',
    city: 'Curitiba',
    state: 'PR',
    zip: '80000000',
  }
  for (const [field, value] of Object.entries(values)) {
    await page.getByTestId(`address-${field}-${sellerId}`).fill(value)
  }
}

const orderIdFrom = (page: Page) => page.url().split('/').pop() as string

async function checkout(page: Page, seller: Session, method: 'pickup' | 'ship') {
  await page.goto('/cart')
  if (method === 'pickup') await page.getByTestId(`cart-method-pickup-${seller.user.id}`).click()
  else await fillAddress(page, seller.user.id)
  await page.getByTestId(`cart-checkout-${seller.user.id}`).click()
  await expect(page.getByTestId('order-page')).toBeVisible()
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/)
  return orderIdFrom(page)
}

async function payWithCard(page: Page, number: string) {
  await page.getByTestId('payment-method-card').click()
  await page.getByTestId('card-number-input').fill(number)
  await page.getByTestId('pay-card-button').click()
}

test.describe('Bookstore — buying', () => {
  test('buy with pickup, pay with a test card and the seller hands the book over', async ({ page, request, browser }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller)

    await openAs(page, buyer, '/store')
    await addToCart(page, listing.id, listing.title)
    const orderId = await checkout(page, seller, 'pickup')

    await expect(page.getByTestId('order-status')).toHaveText('Aguardando pagamento')
    await expect(page.getByTestId('test-environment-banner')).toBeVisible()
    await payWithCard(page, TEST_CARDS.approved)
    await expect(page.getByTestId('order-status')).toHaveText('Pago')
    await expect(page.getByTestId('order-paid-note')).toContainText('visa final 4242')

    const sellerContext = await browser.newContext()
    const sellerPage = await sellerContext.newPage()
    await openAs(sellerPage, seller, `/orders/${orderId}`)
    await sellerPage.getByTestId('handover-button').click()
    await expect(sellerPage.getByTestId('order-status')).toHaveText('Entregue')
    await sellerContext.close()

    await page.reload()
    await expect(page.getByTestId('order-status')).toHaveText('Entregue')
  })

  test('ship to an address, pay with a Pix that cannot be paid at a bank, then track and confirm receipt', async ({
    page,
    request,
    browser,
  }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller, { priceCents: 3000, shippingFeeCents: 1000 })

    await openAs(page, buyer, '/store')
    await addToCart(page, listing.id, listing.title)
    await page.goto('/cart')
    await expect(page.getByTestId(`cart-total-${seller.user.id}`)).toContainText('40,00')
    const orderId = await checkout(page, seller, 'ship')
    await expect(page.getByTestId('order-total')).toContainText('40,00')
    await expect(page.getByTestId('order-address')).toContainText('Curitiba/PR')

    await page.getByTestId('generate-pix-button').click()
    const code = await page.getByTestId('pix-code').innerText()
    expect(code.startsWith('SIMULADO-NAO-PAGUE-')).toBe(true)
    expect(code.startsWith('000201')).toBe(false)
    await expect(page.getByTestId('payment-panel')).toContainText('não pode ser pago no seu banco')

    await page.getByTestId('simulate-pix-button').click()
    await expect(page.getByTestId('order-status')).toHaveText('Pago')

    const sellerContext = await browser.newContext()
    const sellerPage = await sellerContext.newPage()
    await openAs(sellerPage, seller, '/sales')
    await sellerPage.getByTestId(`order-row-${orderId}`).click()
    await sellerPage.getByTestId('tracking-input').fill('BR123456789')
    await sellerPage.getByTestId('ship-button').click()
    await expect(sellerPage.getByTestId('order-status')).toHaveText('Enviado')
    await sellerContext.close()

    await page.reload()
    await expect(page.getByTestId('order-tracking')).toContainText('BR123456789')
    await page.getByTestId('confirm-delivery-button').click()
    await expect(page.getByTestId('order-status')).toHaveText('Entregue')
  })

  test('a declined card leaves the order awaiting payment and can be retried', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller)

    await openAs(page, buyer, '/store')
    await addToCart(page, listing.id, listing.title)
    await checkout(page, seller, 'pickup')

    await payWithCard(page, TEST_CARDS.declined)
    await expect(page.getByTestId('payment-failure')).toContainText('Cartão recusado')
    await expect(page.getByTestId('order-status')).toHaveText('Aguardando pagamento')

    await page.getByTestId('card-number-input').fill(TEST_CARDS.noFunds)
    await page.getByTestId('pay-card-button').click()
    await expect(page.getByTestId('payment-failure')).toContainText('Saldo insuficiente')

    await page.getByTestId('card-number-input').fill(TEST_CARDS.approved)
    await page.getByTestId('pay-card-button').click()
    await expect(page.getByTestId('order-status')).toHaveText('Pago')
  })

  test('a real card number is refused, never accepted', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller)

    await openAs(page, buyer, '/store')
    await addToCart(page, listing.id, listing.title)
    await checkout(page, seller, 'pickup')

    await payWithCard(page, TEST_CARDS.real)

    await expect(page.getByTestId('payment-failure')).toContainText('Cartões reais não são aceitos')
    await expect(page.getByTestId('order-status')).toHaveText('Aguardando pagamento')
  })

  test('cancelling an unpaid order puts the stock back on sale', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller, { quantity: 1 })

    await openAs(page, buyer, '/store')
    await addToCart(page, listing.id, listing.title)
    await checkout(page, seller, 'pickup')
    await page.getByTestId('cancel-order-button').click()
    await expect(page.getByTestId('order-status')).toHaveText('Cancelado')

    await page.goto('/store')
    await page.getByTestId('store-search').fill(listing.title)
    await expect(page.getByTestId(`listing-card-${listing.id}`)).toBeVisible()
  })

  test('the last copy leaves the bookstore once someone reserves it', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const first = await registerWithRoles(request, ['buyer'])
    const second = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller, { quantity: 1 })

    const reserved = await placeOrderViaApi(request, first, listing.id)
    expect(reserved.status).toBe(201)

    await openAs(page, second, '/store')
    await page.getByTestId('store-search').fill(listing.title)
    await expect(page.getByTestId('store-empty')).toBeVisible()
    await expect(page.getByTestId(`listing-card-${listing.id}`)).toHaveCount(0)
  })

  test('the cart is grouped by seller and survives a reload', async ({ page, request }) => {
    const ana = await registerWithRoles(request, ['seller'])
    const bia = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const first = await createListing(request, ana)
    const second = await createListing(request, bia)

    await openAs(page, buyer, '/store')
    await addToCart(page, first.id, first.title)
    await addToCart(page, second.id, second.title)
    await page.goto('/cart')

    await expect(page.getByTestId(`cart-seller-${ana.user.id}`)).toBeVisible()
    await expect(page.getByTestId(`cart-seller-${bia.user.id}`)).toBeVisible()
    await page.reload()
    await expect(page.getByTestId(`cart-item-${first.id}`)).toBeVisible()
    await page.getByTestId(`cart-remove-${first.id}`).click()
    await expect(page.getByTestId(`cart-item-${first.id}`)).toHaveCount(0)
    await expect(page.getByTestId(`cart-item-${second.id}`)).toBeVisible()
  })
})

test.describe('Bookstore — selling and moderation', () => {
  test('a seller lists a catalog book from the sell page', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const title = `Vender ${Date.now()}`
    const catalogBookId = await createCatalogBook(request, title)

    await openAs(page, seller, '/sell')
    await page.getByTestId('catalog-search-input').fill(title)
    await page.getByTestId('catalog-search-button').click()
    await page.getByTestId(`catalog-result-${catalogBookId}`).click()
    await expect(page.getByTestId('selected-book')).toContainText(title)

    await page.getByTestId('listing-price-input').fill('19,90')
    await page.getByTestId('listing-quantity-input').fill('2')
    await page.getByTestId('publish-listing-button').click()

    await expect(page.getByTestId('sell-notice')).toContainText('Anúncio publicado')
    await expect(page.getByTestId('my-listings')).toContainText(title)
    await expect(page.getByTestId('my-listings')).toContainText('19,90')
  })

  test('a seller pauses a listing and it leaves the bookstore', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller)

    await openAs(page, seller, '/sell')
    await page.getByTestId(`toggle-listing-${listing.id}`).click()
    await expect(page.getByTestId(`my-listing-${listing.id}`)).toContainText('Pausado')

    await openAs(page, buyer, '/store')
    await page.getByTestId('store-search').fill(listing.title)
    await expect(page.getByTestId('store-empty')).toBeVisible()
  })

  test('readers without the buyer role cannot open the bookstore', async ({ page, request }) => {
    const reader = await registerWithRoles(request, ['reader'])

    await openAs(page, reader, '/store')

    await expect(page).toHaveURL(/\/dashboard$|\/account$/)
    await expect(page.getByTestId('store-page')).toHaveCount(0)
  })

  test('an admin follows an order and takes a listing down', async ({ page, request }) => {
    const admin = await adminSession(request)
    const seller = await registerWithRoles(request, ['seller'])
    const buyer = await registerWithRoles(request, ['buyer'])
    const listing = await createListing(request, seller)
    const placed = await placeOrderViaApi(request, buyer, listing.id)
    const orderId = placed.body.order.id as string

    await openAs(page, admin, '/admin/marketplace')
    await page.getByTestId('market-search').fill(orderId.slice(0, 12))
    await expect(page.getByTestId(`market-order-${orderId}`)).toContainText(listing.title)
    await expect(page.getByTestId(`market-order-${orderId}`)).toContainText('Aguardando pagamento')

    await page.getByTestId('market-tab-listings').click()
    await page.getByTestId(`market-reason-${listing.id}`).fill('Anúncio de teste')
    await page.getByTestId(`market-remove-${listing.id}`).click()
    await expect(page.getByTestId(`market-listing-status-${listing.id}`)).toHaveText('Removido')
  })
})
