# Bookshelf — Playwright Test Suite

<div align="center">

![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![CI](https://img.shields.io/badge/GitHub%20Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Allure](https://img.shields.io/badge/Allure%20Report-GitHub%20Pages-orange?style=for-the-badge)

**237 testes E2E, visual regression e acessibilidade para o sistema BookShelf**

[Setup](#setup) • [Execução](#running-tests) • [Estrutura](#structure) • [CI/CD](#cicd)

📊 **[Allure Report](https://thiago8rocha.github.io/bookshelf-playwright-tests/allure-report/)**

</div>

---

## About

Suite completa de testes automatizados construída com **Playwright + TypeScript** para o sistema BookShelf (frontend React + backend Node.js). Cobre autenticação, CRUD de livros, regressão visual multiplataforma, acessibilidade WCAG 2.1 e interceptação de rede — distribuídos em 237 testes rodando em Chromium, Firefox e Mobile Chrome.

---

## Stack

- **Playwright** — browser automation (Chromium, Firefox, Mobile Chrome)
- **TypeScript** — type-safe tests
- **axe-playwright** — automated accessibility (WCAG 2.1 AA)
- **Allure** — relatórios publicados no GitHub Pages
- **GitHub Actions** — CI pipeline com disparo manual por suite

---

## Structure

```
tests/
├── auth/           # Login, register, session, logout (81 testes)
├── books/          # Create, edit, delete (48 testes)
├── dashboard/      # Stats, empty state, real-time updates (30 testes)
├── e2e/            # Full user journeys (6 testes)
├── network/        # Network interception — mock API, loading states, errors (14 testes)
└── visual/         # Screenshot regression + accessibility axe-core (58 testes)

helpers/
├── api.ts          # API helpers for test setup/teardown
└── pages.ts        # Page Object Model

fixtures/
└── index.ts        # Custom fixtures (authenticatedPage, cleanupBooks, etc.)
```

---

## Prerequisites

- Node.js 20+
- Backend running on `http://localhost:3000`
- Frontend running on `http://localhost:5173`

---

## Setup

```bash
npm install
npx playwright install --with-deps chromium firefox
cp .env.example .env
```

---

## Running Tests

```bash
# All tests
npm test

# Specific suites
npm run test:auth
npm run test:books
npm run test:dashboard
npm run test:e2e
npm run test:network
npm run test:visual

# By tag
npm run test:smoke      # Critical path only
npm run test:a11y       # Accessibility only

# Debug
npm run test:headed     # With browser visible
npm run test:debug      # Step-by-step debugger
npm run test:report     # Open HTML report

# Allure
npm run allure:generate
npm run allure:open
```

---

## Visual Regression

Os snapshots de baseline são gerados por plataforma — Windows localmente e Linux no CI — e ficam salvos em `tests/visual/__snapshots__/`. Devem ser commitados para que o CI possa comparar nas execuções seguintes.

O CI gera e commita automaticamente os snapshots Linux na primeira execução, evitando falsos positivos de diferença de renderização entre plataformas.

Para atualizar os baselines após mudanças intencionais de UI:

```bash
npm run snapshots:update
```

---

## What Playwright Adds Beyond Robot Framework

| Feature | Robot | Playwright |
|---|---|---|
| Network interception | ❌ | ✅ Mock any API response |
| Visual regression | ❌ | ✅ toHaveScreenshot() |
| axe-core a11y engine | ❌ | ✅ Full WCAG scan |
| Request payload assertion | ❌ | ✅ Inspect what was sent |
| Loading state testing | ❌ | ✅ Delay/abort requests |
| Multi-context isolation | ❌ | ✅ Parallel browser contexts |
| localStorage inspection | ❌ | ✅ page.evaluate() |
| Video on failure | ❌ | ✅ Built-in |
| Trace viewer | ❌ | ✅ Full action trace |

---

## CI/CD

O pipeline está configurado em `.github/workflows/playwright.yml` e é acionado em:
- **Push ou Pull Request** para `main` / `master`
- **Disparo manual** via `workflow_dispatch` no GitHub Actions

### Disparo manual

Na aba **Actions** do repositório, selecione **Playwright Tests** → **Run workflow** para disparar a execução sem depender de commit.

### Etapas do pipeline

1. Checkout e build do backend e frontend
2. Execução dos testes não-visuais (auth, books, dashboard, e2e, network)
3. Geração e commit automático dos snapshots Linux (visual regression)
4. Execução dos testes visuais com comparação de snapshots
5. Geração do Allure Report (sempre, mesmo em caso de falha)
6. Deploy automático para GitHub Pages
7. Upload de artefatos — `allure-report` (30 dias) e `playwright-report` (14 dias)

📊 **[Ver Allure Report](https://thiago8rocha.github.io/bookshelf-playwright-tests/allure-report/)**

---

## Troubleshooting

**Snapshots divergindo entre local e CI**
- Snapshots são gerados por plataforma. Os do Linux são criados automaticamente pelo CI no primeiro push. Não sobrescreva snapshots Linux com capturas feitas no Windows.

**Testes visuais falhando após mudança de UI intencional**
```bash
npm run snapshots:update
git add tests/visual/__snapshots__/
git commit -m "Update visual snapshots"
```

**Playwright não encontra os browsers**
```bash
npx playwright install --with-deps chromium firefox
```

---

## Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [axe-playwright](https://github.com/abhinaba-ghosh/axe-playwright)
- [Allure + Playwright](https://allurereport.org/docs/playwright/)