import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('page.html', 'utf-8');
const $ = cheerio.load(html);

const buttons = [];
$('button').each((i, el) => {
  buttons.push({ index: i, class: $(el).attr('class'), text: $(el).text().trim().substring(0, 50) });
});
console.log(buttons);
