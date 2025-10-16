import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';
import { writeFileSync } from 'fs';

function cleanText(text) {
  return text.replace(/[^\w\s,.-:/]/g, '').trim();
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
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  );

  await page.goto('https://www.nepvents.com/events', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  console.log(`📄 Scraping first page only...`);
  await page.waitForSelector('article');
  await autoScroll(page);

  // Get all event cards
  const cards = await page.$$eval('article', cards => {
    const cleanText = text => text.replace(/[^\w\s,.-:/]/g, '').trim();

    return cards.map(card => {
      const title = cleanText(card.querySelector('section a > div')?.innerText || '');
      const eventPageUrl = card.querySelector('section a')?.href || '';

      const imgTags = Array.from(card.querySelectorAll('img'));
      let image = '';
      if (imgTags.length >= 2 && imgTags[0].src.includes('completed.svg')) {
        image = imgTags[1].src;
      } else if (imgTags.length > 0) {
        image = imgTags[0].src;
      }

      const dateRaw = card.querySelector(
        'section > div.flex.flex-row.w-100.gap-1.md\\:gap-3.items-center.text-sm.md\\:text-base.text-nowrap'
      )?.innerText || '';

      let start_date = '';
      let end_date = '';
      if (dateRaw.includes('-')) {
        const parts = dateRaw.split('-');
        start_date = cleanText(parts[0]);
        end_date = cleanText(parts[1]);
      } else {
        start_date = cleanText(dateRaw);
        end_date = '';
      }

      const location = cleanText(card.querySelector('section > div:nth-child(2)')?.innerText || '');
      const tagEls = card.querySelectorAll('section > div.overflow-hidden > div span');
      const tags = Array.from(tagEls).map(tag => cleanText(tag.innerText)).filter(Boolean);
      const formattedTags = `{${tags.join(', ')}}`;
      const price = cleanText(card.querySelector('section > div:nth-child(5)')?.innerText || '');

      return {
        title,
        image,
        start_date,
        end_date,
        location,
        tags: formattedTags,
        price,
        eventPageUrl
      };
    });
  });

  // Visit each event page to find external register link
  const results = [];
  for (const event of cards) {
    try {
      const detailPage = await browser.newPage();
      await detailPage.goto(event.eventPageUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      // Wait for any form (if it exists)
      const hasForm = await detailPage.$('form[action]');
      let register_link = '';

      if (hasForm) {
        register_link = await detailPage.$eval('form[action]', el => el.getAttribute('action') || '');
      }

      // Sometimes the link is in a button or anchor instead of a form
      if (!register_link) {
        register_link = await detailPage.$$eval('a[href]', anchors => {
          const external = anchors.find(a =>
            a.href.includes('http') && !a.href.includes('nepvents.com')
          );
          return external ? external.href : '';
        });
      }

      event.register_link = register_link || '';
      await detailPage.close();

      console.log(`✅ ${event.title} → ${register_link}`);
    } catch (err) {
      console.warn(`⚠️ Failed for ${event.title}: ${err.message}`);
      event.register_link = '';
    }

    results.push(event);
  }

  // Save to CSV
  const csvWriter = createObjectCsvWriter({
    path: 'test.csv',
    header: [
      { id: 'title', title: 'Title' },
      { id: 'image', title: 'Image' },
      { id: 'start_date', title: 'Start Date' },
      { id: 'end_date', title: 'End Date' },
      { id: 'location', title: 'Location' },
      { id: 'tags', title: 'Tags' },
      { id: 'price', title: 'Price' },
      { id: 'register_link', title: 'Register Link' }
    ]
  });

  await csvWriter.writeRecords(results);
  console.log(`📁 Saved ${results.length} events with register links to test.csv`);



  await browser.close();
}

scrapeNepventsAll().catch(console.error);
