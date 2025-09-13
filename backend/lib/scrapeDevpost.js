import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';
import { writeFileSync } from 'fs';

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

async function autoScrollUntilCount(page, minCount = 200) {
  let prevCount = 0;
  while (true) {
    const count = await page.$$eval('.hackathons-container > div', els => els.length);

    if (count >= minCount) {
      console.log(`✅ Loaded at least ${count} hackathons`);
      break;
    }

    if (count === prevCount) {
      console.log('⚠️ No new hackathons loaded, stopping scroll');
      break;
    }

    prevCount = count;

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 2);
    });

    await new Promise(r => setTimeout(r, 1500)); // wait for lazy load
  }
}

async function scrapeDevpost() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1366, height: 768 }
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  );

  await page.goto('https://devpost.com/hackathons', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  // 🔄 Keep scrolling until 200 hackathons are loaded
  await autoScrollUntilCount(page, 200);

  const events = await page.$$eval('.hackathons-container > div', cards => {
    const cleanText = text => text.replace(/\s+/g, ' ').trim();

    return cards.map(card => {
      const title = cleanText(card.querySelector('h3')?.innerText || '');
      const url = card.querySelector('a')?.href || '';
      const image = card.querySelector('img')?.src || '';
      const date = cleanText(
        card.querySelector('.side-info > div:nth-child(2) div')?.innerText || ''
      );
      const location = cleanText(
        card.querySelector(
          '.flex-row.justify-content-start.mb-6 > div:nth-child(2) span'
        )?.innerText || ''
      );

      const tags = Array.from(
        card.querySelectorAll('.side-info .themes div div')
      )
        .map(tag => cleanText(tag.innerText))
        .filter(Boolean);

      const prize = cleanText(
        card.querySelector('.prizes-and-participants .prizes')?.innerText || ''
      );

      const participants = cleanText(
        card.querySelector('.prizes-and-participants .participants')?.innerText ||
          ''
      );

      return {
        title,
        url,
        image,
        date,
        location,
        tags: `{${tags.join(', ')}}`,
        prize,
        participants
      };
    });
  });

  // ✅ Remove duplicates
  const unique = Object.values(
    events.reduce((map, event) => ({ ...map, [event.url]: event }), {})
  );

  // ✅ Save to CSV
  const csvWriter = createObjectCsvWriter({
    path: 'devpost_hackathons.csv',
    header: [
      { id: 'title', title: 'Title' },
      { id: 'url', title: 'URL' },
      { id: 'image', title: 'Image' },
      { id: 'date', title: 'Date' },
      { id: 'location', title: 'Location' },
      { id: 'tags', title: 'Tags' },
      { id: 'prize', title: 'Prize' },
      { id: 'participants', title: 'Participants' }
    ]
  });

  await csvWriter.writeRecords(unique);
  console.log(`✅ Saved ${unique.length} hackathons to devpost_hackathons.csv`);

  // ✅ Save to JSON
  writeFileSync('devpost_hackathons.json', JSON.stringify(unique, null, 2));
  console.log(`✅ Saved ${unique.length} hackathons to devpost_hackathons.json`);

  await browser.close();
}

scrapeDevpost().catch(console.error);
