import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';
import { writeFileSync } from 'fs';

// Helper function to remove unwanted characters
function cleanText(text) {
  return text.replace(/[^\w\s,.-]/g, '').trim(); // Removes special characters but keeps readable text
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let total = 0;
      const distance = 800;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

async function scrapeNepventsAll() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1366, height: 768 }
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  );

  await page.goto('https://www.nepvents.com/events', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  const scrapeOnePage = async () => {
    await page.waitForSelector('article');
    await autoScroll(page);

    return await page.$$eval('article', cards => {
      const cleanText = (text) =>
        text.replace(/[^\w\s,.-]/g, '').trim();

      return cards.map(card => {
        const titleRaw = card.querySelector('section a > div')?.innerText || '';
        const title = cleanText(titleRaw);

        const url = card.querySelector('section a')?.href || '';
        const image = card.querySelector('img')?.src || '';

        const dateEl = card.querySelector(
          'section > div.flex.flex-row.w-100.gap-1.md\\:gap-3.items-center.text-sm.md\\:text-base.text-nowrap'
        );
        const dateRaw = dateEl?.innerText || '';
        const date = cleanText(dateRaw);

        const locationRaw = card.querySelector('section > div:nth-child(2)')?.innerText || '';
        const location = cleanText(locationRaw);

        const tagEls = card.querySelectorAll('section > div.overflow-hidden > div span');
        const tags = Array.from(tagEls)
          .map(tag => cleanText(tag.innerText))
          .filter(Boolean);
        const formattedTags = `{${
          tags.join(', ')
        }}`; // Wrap in curly braces

        const priceEl = card.querySelector('section > div:nth-child(5)');
        const priceRaw = priceEl?.innerText || '';
        const price = cleanText(priceRaw);

        return {
          title,
          url,
          image,
          date,
          location,
          tags: formattedTags,
          price
        };
      });
    });
  };

  let allEvents = [];
  let pageNum = 1;

  while (true) {
    console.log(`📄 Scraping page ${pageNum}...`);
    allEvents.push(...await scrapeOnePage());

    const nextHandle = await page.$(`a[href*="/events?page=${pageNum + 1}"]`);
    if (!nextHandle) break;

    await Promise.all([
      nextHandle.click(),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    pageNum++;
  }

  // Remove duplicates based on event URL
  const unique = Object.values(
    allEvents.reduce((map, event) => ({ ...map, [event.url]: event }), {})
  );

  // Write to CSV
  const csvWriter = createObjectCsvWriter({
    path: 'events.csv',
    header: [
      { id: 'title', title: 'Title' },
      { id: 'url', title: 'URL' },
      { id: 'image', title: 'Image' },
      { id: 'date', title: 'Date' },
      { id: 'location', title: 'Location' },
      { id: 'tags', title: 'Tags' },
      { id: 'price', title: 'Price' }
    ]
  });

  await csvWriter.writeRecords(unique);
  console.log(`✅ Saved ${unique.length} events to events.csv`);

  // Write to JSON
  writeFileSync('events.json', JSON.stringify(unique, null, 2));
  console.log(`✅ Saved ${unique.length} events to events.json`);

  await browser.close();
}

scrapeNepventsAll().catch(console.error);
