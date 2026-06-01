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
  
  // Click Google button
  const googleBtn = page.locator('button:has-text("Continuar con Google")');
  console.log('Google button disabled:', await googleBtn.isDisabled());
  
  await googleBtn.click();
  await page.waitForTimeout(5000);
  console.log('After Google click URL:', page.url());
  console.log('After Google click title:', await page.title());
  
  const content = await page.content();
  if (content.includes('Google')) {
    console.log('Redirected to Google');
  } else {
    console.log('Still on login page');
  }
  
  await browser.close();
})();
