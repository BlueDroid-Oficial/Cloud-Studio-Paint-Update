import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 4000));
  
  const html = await page.evaluate(() => {
    return document.querySelector('div#root').innerHTML;
  });
  console.log('HTML length:', html.length);
  import('fs').then(fs => fs.writeFileSync('page.html', html));
  await browser.close();
})();
