const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const target = (await (await fetch('http://127.0.0.1:19397/json/list')).json())[0];
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0; const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data); const callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); callback(message); }
  });
  const evaluate = expression => new Promise((resolve, reject) => {
    pending.set(++id, result => result.error || result.result.exceptionDetails
      ? reject(new Error(JSON.stringify(result))) : resolve(result.result.result.value));
    socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });
  const wait = async expression => {
    const begin = Date.now();
    while (!(await evaluate(expression))) {
      if (Date.now() - begin > 65_000) throw new Error(`Timeout ${expression}`);
      await sleep(100);
    }
  };
  const rows = [];
  try {
    for (let cycle = 1; cycle <= 5; cycle++) {
      await wait('!globalThis.__p42.exists()');
      const value = await evaluate(`new Promise(resolve => {
        const start = process.hrtime.bigint();
        globalThis.__p42.open();
        const check = () => globalThis.__p42.visible()
          ? resolve({ ms: Number(process.hrtime.bigint() - start) / 1e6, url: globalThis.__p42.url() })
          : setTimeout(check, 1);
        check();
      })`);
      rows.push({ cycle, ...value });
      // Wait for page initialization before closing, then verify actual clean probe.
      await sleep(3500);
      const state = await evaluate('globalThis.__p42.probe()');
      if (state !== 'clean') throw new Error(`Probe ${state}`);
      console.log(JSON.stringify({ cycle, ...value, state }));
      await evaluate('globalThis.__p42.hide()');
    }
    writeFileSync(join(__dirname, 'reopen.csv'), 'cycle,visible_ms,url\n' + rows.map(r => `${r.cycle},${r.ms},${r.url}`).join('\n') + '\n');
  } finally { socket.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
