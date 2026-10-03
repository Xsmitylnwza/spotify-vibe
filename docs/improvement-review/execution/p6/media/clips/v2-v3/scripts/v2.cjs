const { run } = require('./rec.cjs');
run('v2', async (page, { click, sleep }) => {
  await click(page.locator('nav [data-act="screen"][data-arg="scenes"], [data-act="screen"][data-arg="scenes"]').first());
  await click(page.locator('[data-act="newscene"]'), { after: 650 });
  const name = page.locator('#sc-name'); await click(name, { after: 200 });
  await page.keyboard.type('Late-night focus', { delay: 40 }); await sleep(150);
  await click(page.locator('#sc-l1'), { after: 150 }); await page.keyboard.type('Deep work, headphones on', { delay: 24 }); await sleep(200);
  await click(page.locator('#sc-l2'), { after: 150 }); await page.keyboard.type('Back at 9 a.m.', { delay: 24 }); await sleep(250);
  await click(page.locator('[data-sec="lg"] .mk-well-thumb'), { after: 650 });
  await click(page.locator('.mk-cat[aria-label$=" 3"]').first(), { after: 700 });
  await sleep(150);
  await click(page.locator('[data-act="donedrawer"]'), { after: 2600 });
}).catch(e => { console.error(e); process.exit(1); });
