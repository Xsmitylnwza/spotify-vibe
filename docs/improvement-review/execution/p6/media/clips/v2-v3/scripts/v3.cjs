const { run } = require('./rec.cjs');
run('v3', async (page, { click, sleep }) => {
  await click(page.locator('[data-act="screen"][data-arg="scenes"]').first());
  await click(page.locator('[data-act="editscene"][data-arg="watch"]'), { after: 800 });
  await page.locator('#pairsec').scrollIntoViewIfNeeded(); await sleep(300);
  await click(page.locator('[data-act="pairadd"]'), { after: 800 });
  const items = page.locator('.mk-picker .mk-item');
  //console.log('items', await items.count(), await items.evaluateAll(l => l.slice(0, 8).map(e => e.innerText.replace(/\n/g, ' / '))));
  await click(items.nth(0), { after: 500 });
  await click(items.nth(2), { after: 700 });
  console.log(await page.locator('#padd').innerText());
  await click(page.locator('#padd'), { after: 900 });
  await page.getByRole('button',{name:'Not now'}).waitFor(); await sleep(400); await click(page.getByRole('button',{name:'Not now'}), { after: 700 });
  await page.locator('#pairsec').scrollIntoViewIfNeeded(); await sleep(900);
  await click(page.locator('[data-act="closedrawer"]').last(), { after: 1200 });
}).catch(e => { console.error(e.message); process.exit(1); });
