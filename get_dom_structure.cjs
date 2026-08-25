const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  const elementHtml = await page.evaluate(() => {
    const el = document.querySelector('div#root > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4) > button:nth-of-type(1)');
    return el ? el.outerHTML : 'Element not found';
  });
  console.log('Target element:', elementHtml);
  
  // also get the parent structure to be sure
  const parentHtml = await page.evaluate(() => {
    const el = document.querySelector('div#root > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(4)');
    return el ? el.outerHTML.substring(0, 500) : 'Parent not found';
  });
  console.log('Parent element:', parentHtml);
  await browser.close();
})();
