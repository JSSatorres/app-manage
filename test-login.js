const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  
  console.log('Page loaded:', await page.title());
  
  // Fill email
  await page.locator('input#email').fill('juansataz.devaws@gmail.com');
  await page.locator('input#password').fill('Lamama123');
  
  // Check buttons
  const enterBtn = page.locator('button:has-text("Entrar")');
  const isDisabled = await enterBtn.isDisabled();
  console.log('Entrar button disabled:', isDisabled);
  
  // Click Entrar
  if (!isDisabled) {
    await enterBtn.click();
    await page.waitForTimeout(3000);
    console.log('After login URL:', page.url());
    console.log('After login content:', await page.content());
  }
  
  await browser.close();
})();
