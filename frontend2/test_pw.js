import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.localStorage.setItem('pm_user', JSON.stringify({ id: '123', username: 'testuser', balance: 1000, is_admin: 0 }));
    window.localStorage.setItem('pm_token', 'fake-token');
  });
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  const content = await page.content();
  console.log('PAGE DOM:', content.substring(0, 1000));
  if (content.includes('Bootstrapping')) console.log('STUCK ON LOADING SCENARIO');
  else if (content.includes('login-form')) console.log('SHOWING LOGIN FORM');
  else console.log('RENDERED CORRECTLY / UNKNOWN STATE');
  await browser.close();
})();
