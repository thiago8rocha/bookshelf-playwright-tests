import { test, expect } from '@playwright/test'
import {
  adminSession,
  createCompanyViaApi,
  generateCnpj,
  openAs,
  registerWithRoles,
} from '../../helpers/accounts'
import type { Page } from '@playwright/test'

async function fillCompanyForm(page: Page, cnpj: string, legalName: string) {
  await page.getByTestId('company-cnpj-input').fill(cnpj)
  await page.getByTestId('company-legalName-input').fill(legalName)
  await page.getByTestId('company-tradeName-input').fill('Sebo E2E')
  await page.getByTestId('company-email-input').fill('contato@sebo-e2e.test')
  await page.getByTestId('company-street-input').fill('Rua dos Livros')
  await page.getByTestId('company-number-input').fill('100')
  await page.getByTestId('company-district-input').fill('Centro')
  await page.getByTestId('company-city-input').fill('Recife')
  await page.getByTestId('company-state-input').selectOption('PE')
  await page.getByTestId('company-zip-input').fill('50000-000')
}

test.describe('Companies — registration', () => {
  test('a seller registers a company and sees it awaiting verification', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['reader', 'seller'])
    await openAs(page, seller, '/account')
    await page.getByTestId('add-company-link').click()
    await expect(page.getByTestId('company-form-page')).toBeVisible()

    const legalName = `Sebo E2E ${Date.now()} LTDA`
    await fillCompanyForm(page, generateCnpj(), legalName)
    await page.getByTestId('company-submit-button').click()

    await expect(page).toHaveURL(/\/account/)
    const list = page.getByTestId('companies-list')
    await expect(list).toContainText('Sebo E2E')
    await expect(list).toContainText('Aguardando verificação')
  })

  test('an invalid CNPJ is rejected with a message and the form stays open', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    await openAs(page, seller, '/companies/new')

    await fillCompanyForm(page, '11.222.333/0001-82', 'Sebo Inválido LTDA')
    await page.getByTestId('company-submit-button').click()

    await expect(page.getByTestId('company-form-error')).toContainText('CNPJ is invalid')
    await expect(page).toHaveURL(/\/companies\/new/)
  })

  test('a CNPJ that is already registered is rejected', async ({ page, request }) => {
    const first = await registerWithRoles(request, ['seller'])
    const cnpj = generateCnpj()
    await createCompanyViaApi(request, first, { cnpj })
    const second = await registerWithRoles(request, ['seller'])
    await openAs(page, second, '/companies/new')

    await fillCompanyForm(page, cnpj, 'Duplicada LTDA')
    await page.getByTestId('company-submit-button').click()

    await expect(page.getByTestId('company-form-error')).toContainText('Já existe uma empresa com este CNPJ.')
  })

  test('every member of the account only sees their own companies', async ({ page, request }) => {
    const owner = await registerWithRoles(request, ['seller'])
    const company = await createCompanyViaApi(request, owner)
    const stranger = await registerWithRoles(request, ['seller'])

    await openAs(page, stranger, '/account')

    await expect(page.getByTestId('companies-empty')).toBeVisible()
    await expect(page.getByTestId(`company-${company.id}`)).toHaveCount(0)
  })
})

test.describe('Companies — admin verification', () => {
  test('an admin verifies a company and its owner sees it verified', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const company = await createCompanyViaApi(request, seller)
    const admin = await adminSession(request)

    await openAs(page, admin, '/admin/companies')
    await expect(page.getByTestId(`admin-company-${company.id}`)).toBeVisible()
    await page.getByTestId(`verify-company-${company.id}`).click()

    // Verified companies leave the (default) pending list.
    await expect(page.getByTestId(`admin-company-${company.id}`)).toHaveCount(0)

    await openAs(page, seller, '/account')
    await expect(page.getByTestId(`company-status-${company.id}`)).toContainText('Verificada')
  })

  test('an admin can revoke a verification', async ({ page, request }) => {
    const seller = await registerWithRoles(request, ['seller'])
    const company = await createCompanyViaApi(request, seller)
    const admin = await adminSession(request)
    await openAs(page, admin, '/admin/companies')
    await page.getByTestId(`verify-company-${company.id}`).click()
    await expect(page.getByTestId(`admin-company-${company.id}`)).toHaveCount(0)

    await page.getByTestId('admin-filter-verified').click()
    await expect(page.getByTestId(`verify-company-${company.id}`)).toContainText('Revogar')
    await page.getByTestId(`verify-company-${company.id}`).click()

    await expect(page.getByTestId(`admin-company-${company.id}`)).toHaveCount(0)
    await page.getByTestId('admin-filter-pending').click()
    await expect(page.getByTestId(`admin-company-${company.id}`)).toBeVisible()
  })

  test('the account page links admins to the verification page', async ({ page, request }) => {
    const admin = await adminSession(request)

    await openAs(page, admin, '/account')
    await page.getByTestId('admin-companies-link').click()

    await expect(page).toHaveURL(/\/admin\/companies/)
  })
})
