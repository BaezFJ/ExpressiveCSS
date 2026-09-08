/** Shared network boundary for both candidate tools and independent post-run checks. */
export async function createBrowserSession(browser, origin, options = {}, { checkPath = () => {}, allowMutations = false } = {}) {
  const context = await browser.newContext({ ...options, serviceWorkers: 'block', acceptDownloads: false });
  const errors = [], blockedRequests = [];
  let requests = 0;
  await context.route('**/*', (route) => {
    try {
      const target = new URL(route.request().url());
      if (++requests > 1000 || target.origin !== origin || (!allowMutations && !['GET', 'HEAD'].includes(route.request().method()))) throw new Error('External or mutating request');
      checkPath(target.pathname);
      return route.continue();
    } catch { if (blockedRequests.length < 50) blockedRequests.push(route.request().url().slice(0, 512)); return route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', (socket) => { if (blockedRequests.length < 50) blockedRequests.push(socket.url().slice(0, 512)); socket.close(); });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  page.on('pageerror', (error) => { if (errors.length < 50) errors.push(error.message.slice(0, 2048)); });
  page.on('console', (message) => { if (message.type() === 'error' && errors.length < 50) errors.push(message.text().slice(0, 2048)); });
  context.on('page', (popup) => { if (popup !== page) void popup.close().catch(() => {}); });
  return { context, page, errors, blockedRequests };
}
