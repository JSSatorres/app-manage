# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility.spec.ts >> Accesibilidad >> los inputs deberían tener labels asociados
- Location: e2e\accessibility.spec.ts:81:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Password')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Password')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e5]
      - generic [ref=e7]: SportApp
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "Iniciar sesión" [level=1] [ref=e10]
        - paragraph [ref=e11]: Accede a tu cuenta de SportApp
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Email
          - textbox "Email" [ref=e15]
        - generic [ref=e16]:
          - generic [ref=e17]: Contraseña
          - textbox "Contraseña" [ref=e18]
        - button "Entrar" [disabled]
        - generic [ref=e23]: o
        - button "Continuar con Google" [ref=e24]:
          - img [ref=e25]
          - text: Continuar con Google
      - paragraph [ref=e30]:
        - text: ¿No tienes cuenta?
        - button "Crear cuenta" [ref=e31]
  - contentinfo
  - button "Open Next.js Dev Tools" [ref=e37] [cursor=pointer]:
    - img [ref=e38]
  - alert [ref=e41]
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test'
  2   | 
  3   | const TEST_EMAIL = 'juansataz.devaws@gmail.com'
  4   | const TEST_PASSWORD = 'Lamala123'
  5   | const BASE_URL = 'http://localhost:3000'
  6   | 
  7   | async function login(page: Page) {
  8   |   await page.goto(`${BASE_URL}/login`)
  9   |   await page.waitForLoadState('networkidle')
  10  |   await page.getByLabel('Email').fill(TEST_EMAIL)
  11  |   await page.getByLabel('Contraseña').fill(TEST_PASSWORD)
  12  |   await page.getByRole('button', { name: /^Entrar$/i }).click()
  13  |   await page.waitForURL(/\/dashboard/, { timeout: 20000 })
  14  | }
  15  | 
  16  | test.describe('Navegación', () => {
  17  |   test('debería redirigir de / a /login sin sesión', async ({ page }) => {
  18  |     await page.goto('/')
  19  | 
  20  |     await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  21  |   })
  22  | 
  23  |   test('debería tener el footer', async ({ page }) => {
  24  |     await page.goto('/login')
  25  | 
  26  |     await expect(page.locator('footer')).toBeAttached()
  27  |   })
  28  | })
  29  | 
  30  | test.describe('Responsive', () => {
  31  |   test('debería funcionar en móvil', async ({ page }) => {
  32  |     await page.setViewportSize({ width: 375, height: 667 })
  33  | 
  34  |     await page.goto('/login')
  35  | 
  36  |     const body = page.locator('body')
  37  |     await expect(body).toBeVisible()
  38  |   })
  39  | 
  40  |   test('debería mostrar el formulario de login en móvil', async ({ page }) => {
  41  |     await page.setViewportSize({ width: 375, height: 667 })
  42  | 
  43  |     await page.goto('/login')
  44  | 
  45  |     await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
  46  |   })
  47  | })
  48  | 
  49  | test.describe('Accesibilidad', () => {
  50  |   test('debería tener lang="es" en html', async ({ page }) => {
  51  |     await page.goto('/login')
  52  | 
  53  |     const html = page.locator('html')
  54  |     await expect(html).toHaveAttribute('lang', 'es')
  55  |   })
  56  | 
  57  |   test('no debería tener errores de consola críticos en login', async ({ page }) => {
  58  |     const errors: string[] = []
  59  | 
  60  |     page.on('console', (msg) => {
  61  |       if (msg.type() === 'error') {
  62  |         errors.push(msg.text())
  63  |       }
  64  |     })
  65  | 
  66  |     await page.goto('/login')
  67  |     await page.waitForLoadState('networkidle')
  68  | 
  69  |     const criticalErrors = errors.filter(
  70  |       (e) =>
  71  |         !e.includes('favicon') &&
  72  |         !e.includes('manifest') &&
  73  |         !e.includes('404') &&
  74  |         !e.includes('supabase') &&
  75  |         !e.includes('NEXT_PUBLIC')
  76  |     )
  77  | 
  78  |     expect(criticalErrors).toHaveLength(0)
  79  |   })
  80  | 
  81  |   test('los inputs deberían tener labels asociados', async ({ page }) => {
  82  |     await page.goto('/login')
  83  | 
  84  |     const emailInput = page.getByLabel('Email')
  85  |     const passwordInput = page.getByLabel('Password')
  86  | 
  87  |     await expect(emailInput).toBeVisible()
> 88  |     await expect(passwordInput).toBeVisible()
      |                                 ^ Error: expect(locator).toBeVisible() failed
  89  |   })
  90  | })
  91  | 
  92  | // Task 3.2 — FormField (label htmlFor/id) y DataTable (roles ARIA).
  93  | test.describe('Accesibilidad — FormField y DataTable (Task 3.2)', () => {
  94  |   test.beforeEach(async ({ page }) => {
  95  |     await login(page)
  96  |   })
  97  | 
  98  |   test('FormField: el label del formulario de entrenador está asociado al input por htmlFor/id', async ({ page }) => {
  99  |     await page.goto(`${BASE_URL}/entrenadores`)
  100 |     await page.waitForLoadState('networkidle')
  101 | 
  102 |     await page.getByRole('button', { name: /^nuevo$/i }).click()
  103 | 
  104 |     const dialog = page.getByRole('dialog')
  105 |     await expect(dialog).toBeVisible()
  106 | 
  107 |     const nombreLabel = dialog.locator('label', { hasText: 'Nombre' }).first()
  108 |     await expect(nombreLabel).toBeVisible()
  109 | 
  110 |     const forAttr = await nombreLabel.getAttribute('for')
  111 |     expect(forAttr).toBeTruthy()
  112 | 
  113 |     const nombreInput = dialog.getByLabel('Nombre')
  114 |     await expect(nombreInput).toBeVisible()
  115 |     await expect(nombreInput).toHaveAttribute('id', forAttr!)
  116 | 
  117 |     // getByLabel confirma la asociación programática para el resto de campos
  118 |     // simples del form (misma FormField compartida). "Nombre" es `required`
  119 |     // (el label incluye "*" en el nombre accesible, de ahí el match parcial).
  120 |     await expect(dialog.getByLabel('Apellidos')).toBeVisible()
  121 |     await expect(dialog.getByLabel('Email', { exact: true })).toBeVisible()
  122 |   })
  123 | 
  124 |   test('DataTable: la tabla de entrenadores expone semántica y roles ARIA', async ({ page }) => {
  125 |     await page.goto(`${BASE_URL}/entrenadores`)
  126 |     await page.waitForLoadState('networkidle')
  127 | 
  128 |     await expect(page.getByRole('table')).toBeVisible()
  129 | 
  130 |     const nombreHeader = page.getByRole('columnheader', { name: /nombre/i })
  131 |     await expect(nombreHeader).toBeVisible()
  132 |     await expect(nombreHeader).toHaveAttribute('aria-sort', 'none')
  133 | 
  134 |     await nombreHeader.getByRole('button').click()
  135 |     await expect(nombreHeader).toHaveAttribute('aria-sort', 'ascending')
  136 | 
  137 |     const searchInput = page.getByRole('textbox', { name: /buscar/i })
  138 |     await expect(searchInput).toBeVisible()
  139 |   })
  140 | })
  141 | 
```