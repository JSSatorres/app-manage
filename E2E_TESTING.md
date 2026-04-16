# Testing E2E con Playwright

## Qué es Playwright

Playwright permite automatizar navegadores para:
- **Testear flujos de usuario** completos
- **Verificar** que la UI funciona correctamente
- **Detectar regresiones** antes de producción
- **Generar screenshots/videos** para debug

---

## Instalación (ya completada)

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

---

## Comandos Disponibles

```bash
# Ejecutar todos los tests
npm run test:e2e

# Abrir UI interactiva para ver tests
npm run test:e2e:ui

# Ver el navegador (headed mode)
npm run test:e2e:headed

# Solo un archivo
npx playwright test e2e/example.spec.ts

# Solo un test específico
npx playwright test -g "debería cargar"
```

---

## Estructura del Proyecto

```
e2e/
├── example.spec.ts        # Tests de ejemplo
└── accessibility.spec.ts  # Tests de accesibilidad
```

---

## Escribir Tests

### Sintaxis Básica

```typescript
import { test, expect } from '@playwright/test'

test('nombre del test', async ({ page }) => {
  // 1. Ir a la página
  await page.goto('/')
  
  // 2. Interactuar
  await page.click('button')
  
  // 3. Verificar
  await expect(page.locator('h1')).toHaveText(' Título ')
})
```

### Selectores Comunes

```typescript
// Por rol
await page.getByRole('button', { name: 'Enviar' }).click()
await page.getByRole('textbox', { name: 'Email' }).fill('test@test.com')

// Por texto
await page.getByText('Iniciar sesión').click()
await page.getByLabel('Contraseña').fill('secret')

// Por test id
await page.getByTestId('submit-button').click()

// CSS selectors
await page.locator('.btn-primary').click()
await page.locator('#form input').first().fill('value')
```

### Esperas Automáticas

Playwright espera automáticamente por:
- Elementos visibles
- Elementos actionable (clickeables)
- Respuestas de red (con `waitForResponse`)
- URLs específicas

```typescript
// Espera automática
await page.click('button') // Espera hasta que sea clickeable

// Espera explícita
await page.waitForURL('**/dashboard')
await page.waitForResponse('**/api/users')
```

---

## Ejemplos de Tests

### Test de Login

```typescript
test('debería hacer login correctamente', async ({ page }) => {
  await page.goto('/login')
  
  // Llenar formulario
  await page.getByLabel('Email').fill('entrenador@test.com')
  await page.getByLabel('Contraseña').fill('password123')
  
  // Enviar
  await page.getByRole('button', { name: /entrar/i }).click()
  
  // Verificar redirección
  await expect(page).toHaveURL('**/dashboard')
  
  // Verificar que el usuario está logueado
  await expect(page.getByText('Bienvenido')).toBeVisible()
})
```

### Test de Formulario

```typescript
test('debería validar campos requeridos', async ({ page }) => {
  await page.goto('/equipos/nuevo')
  
  // Intentar enviar vacío
  await page.getByRole('button', { name: /crear/i }).click()
  
  // Verificar mensaje de error
  await expect(page.getByText('Nombre requerido')).toBeVisible()
})
```

### Test de Navegación

```typescript
test('debería navegar entre páginas', async ({ page }) => {
  await page.goto('/dashboard')
  
  // Ir a equipos
  await page.getByRole('link', { name: /equipos/i }).click()
  await expect(page).toHaveURL('**/equipos')
  
  // Ir a sesiones
  await page.getByRole('link', { name: /sesiones/i }).click()
  await expect(page).toHaveURL('**/sesiones')
})
```

---

## Page Objects (Patrón Recomendado)

Para tests mantenibles, usa Page Objects:

```typescript
// e2e/pages/LoginPage.ts
import { Page, expect } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/login')
  }
  
  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email)
    await this.page.getByLabel('Contraseña').fill(password)
    await this.page.getByRole('button', { name: /entrar/i }).click()
  }
  
  async expectToBeLoggedIn() {
    await expect(this.page).toHaveURL('**/dashboard')
  }
}
```

```typescript
// e2e/flows/auth.spec.ts
import { test } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'

test('login exitoso', async ({ page }) => {
  const loginPage = new LoginPage(page)
  
  await loginPage.goto()
  await loginPage.login('test@test.com', 'password')
  await loginPage.expectToBeLoggedIn()
})
```

---

## Testing Responsive

```typescript
test('debería funcionar en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  
  await page.goto('/')
  
  // Menú hamburguesa debería aparecer
  await expect(page.getByRole('button', { name: /menu/i })).toBeVisible()
  
  // Al hacer clic, debería abrir el drawer
  await page.getByRole('button', { name: /menu/i }).click()
  await expect(page.getByRole('navigation')).toBeVisible()
})
```

---

## Testing de API (Mock)

```typescript
test('debería mostrar equipos desde API', async ({ page }) => {
  // Mockear la respuesta
  await page.route('**/api/equipos', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify([
        { id: '1', nombre: 'Infantil A' },
        { id: '2', nombre: 'Juvenil B' },
      ]),
    })
  })
  
  await page.goto('/equipos')
  
  await expect(page.getByText('Infantil A')).toBeVisible()
  await expect(page.getByText('Juvenil B')).toBeVisible()
})
```

---

## Debugging

```typescript
// Añadir breakpoints en el código
test('debug test', async ({ page }) => {
  await page.goto('/')
  
  // Pausa aquí para inspeccionar
  await page.pause()
  
  // Continuar con el test
})
```

### Screenshots y Videos

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure', // Solo cuando falla
    video: 'retain-on-failure',   // Video si falla
  },
})
```

### Trace Viewer

```bash
# Abrir el trace de un test fallido
npx playwright show-trace trace.zip
```

---

## Best Practices

### Do's
- Usa `getByRole` o `getByLabel` (más accesible)
- Usa `waitForURL` en lugar de `sleep`
- Un test por funcionalidad
- Nombres descriptivos en español
- Mockea APIs externas

### Don'ts
- No uses selectores CSS frágil (`.div > span > a`)
- No uses `sleep()` (usa esperas automáticas)
- No tests demasiado largos (máx 30 segundos)
- No asserts muchos en un solo test

---

## Integración con CI/CD

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E Tests
        run: npm run test:e2e
```

---

## Recursos

- [Playwright Docs](https://playwright.dev/docs/intro)
- [API Reference](https://playwright.dev/docs/api/class-page)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Runners](https://playwright.dev/docs/test-runners)
