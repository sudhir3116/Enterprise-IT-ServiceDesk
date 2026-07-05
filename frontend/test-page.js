const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Login loaded successfully');
  } catch (e) {
    console.log('Error loading login:', e.message);
  }

  await browser.close();
})();
