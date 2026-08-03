import { chromium } from 'playwright';

const EMAIL = process.argv[2];
const PASSWORD = 'SmokeTest12345!';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

await page.goto('http://localhost:3005/merchant/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.locator('input[placeholder="shop@example.com"]').fill(EMAIL);
await page.locator('input[placeholder="••••••••"]').fill(PASSWORD);
await page.locator('button[type="submit"]').click({ force: true }).catch(() => page.locator('button:has-text("เข้าสู่ระบบ")').click({ force: true }));
await page.waitForTimeout(3000);
console.log('URL', page.url());
console.log('BODY', (await page.locator('body').innerText()).slice(0, 300));
console.log('CONSOLE_ERRORS', JSON.stringify(consoleErrors));
await browser.close();
