import { chromium } from 'playwright';

const OUT = 'C:/Users/Jack/AppData/Local/Temp/claude/c--Users-Jack-Documents-line-oa-booking-saas/35e4a63c-5853-4f3a-b213-f840ed50520b/scratchpad';
const stamp = Date.now();
const EMAIL = `praphawach+regretestFIX2${stamp}@gmail.com`;
const PASSWORD = 'SmokeTest12345!';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext();
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

page.on('request', (req) => {
  const url = req.url();
  if (url.includes('/rest/v1/tenants')) {
    console.log('ALL_HEADERS', JSON.stringify(req.headers(), null, 2));
    console.log('POSTDATA', req.postData());
  }
});
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/rest/v1/tenants')) {
    let body = '';
    try { body = await res.text(); } catch {}
    console.log('RESPONSE', res.status(), url, body);
  }
});

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

console.log('EMAIL', EMAIL);
await page.goto('http://localhost:3005/merchant/register', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1000);
await page.locator('input[placeholder="เช่น สปา ลาวันเดอร์"]').fill('ร้านทดสอบ RLS Retest');
await page.locator('button:has-text("💆 สปา / นวด")').click();
await page.locator('button:has-text("ถัดไป")').click();
await page.waitForTimeout(800);
await page.locator('input[placeholder="ชื่อ-นามสกุล"]').fill('RLS Retest');
await page.locator('input[placeholder="0812345678"]').fill('0812345678');
await page.locator('input[placeholder="shop@example.com"]').fill(EMAIL);
await page.locator('input[placeholder="••••••••"]').first().fill(PASSWORD);
await page.locator('input[placeholder="••••••••"]').nth(1).fill(PASSWORD);
await page.locator('button:has-text("สร้างบัญชีและเปิดร้าน")').click();
await page.waitForTimeout(3000);
console.log('URL_AT_3S', page.url());
await page.waitForTimeout(4000);
console.log('URL_AT_7S', page.url());
await shot('50-register-retest-result');
console.log('BODY', (await page.locator('body').innerText()).slice(0, 500));
console.log('CONSOLE_ERRORS', JSON.stringify(consoleErrors));

await browser.close();
