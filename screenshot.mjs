import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 20000 });
await page.screenshot({ path: 'd:/app_math/app-home.png' });
console.log('Home screenshot taken');

// Try to find the game/duel tab
try {
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('Page text snippet:', allText.slice(0, 300));

  // Look for bottom tab navigation
  const tabs = await page.$$('[role="tab"], [accessibilityRole="tab"]');
  console.log('Tabs found:', tabs.length);
  for (const tab of tabs) {
    const txt = await tab.textContent().catch(() => '');
    console.log(' tab:', txt.trim());
  }

  // Try clicking "Đấu 1v1" text
  const gameLink = await page.$('text=Đấu 1v1');
  if (gameLink) {
    await gameLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'd:/app_math/app-game.png' });
    console.log('Game screen screenshot taken');
  } else {
    // Click second tab (usually the game/duel)
    if (tabs.length > 1) {
      await tabs[1].click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'd:/app_math/app-game.png' });
      console.log('Second tab screenshot taken');
    }
  }
} catch(e) {
  console.log('Nav error:', e.message);
}

await browser.close();
