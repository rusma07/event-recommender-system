import puppeteer from 'puppeteer';
import { createObjectCsvWriter } from 'csv-writer';
import { writeFileSync } from 'fs';

// Clean up messy text
function cleanText(text) {
  return text.replace(/[^\w\s,.-:/]/g, '').trim();
}

// Scroll down page to load all lazy items
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
    headless: false, // Set true if you want to run silently
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

  console.log('🌍 Starting full-site scrape...');

  const scrapeOnePage = async () => {
    await page.waitForSelector('article');
    await autoScroll(page);

    const cards = await page.$$eval('article', cards => {
      const cleanText = text => text.replace(/[^\w\s,.-:/]/g, '').trim();

      return cards.map(card => {
        const title = cleanText(card.querySelector('section a > div')?.innerText || '');
        const eventPageUrl = card.querySelector('section a')?.href || '';

        // Image (skip completed.svg)
        const imgTags = Array.from(card.querySelectorAll('img'));
        let image = '';
        if (imgTags.length >= 2 && imgTags[0].src.includes('completed.svg')) {
          image = imgTags[1].src;
        } else if (imgTags.length > 0) {
          image = imgTags[0].src;
        }

        // Dates
        const dateRaw = card.querySelector(
          'section > div.flex.flex-row.w-100.gap-1.md\\:gap-3.items-center.text-sm.md\\:text-base.text-nowrap'
        )?.innerText || '';
        let start_date = '', end_date = '';
        if (dateRaw.includes('-')) {
          const parts = dateRaw.split('-');
          start_date = cleanText(parts[0]);
          end_date = cleanText(parts[1]);
        } else start_date = cleanText(dateRaw);

        // Location, tags, price
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

    // Visit each event page to find registration link
    const results = [];
    for (const event of cards) {
      let register_link = '';
      try {
        const detailPage = await page.browser().newPage();
        await detailPage.goto(event.eventPageUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        // ✅ First try: look for form[action]
        const formEl = await detailPage.$('form[action]');
        if (formEl) {
          register_link = await detailPage.$eval('form[action]', el => el.getAttribute('action') || '');
        }

        // ✅ Fallback: find external <a href> (like skillshikshya.com or excess.ioepc.edu.np)
        if (!register_link) {
          register_link = await detailPage.$$eval('a[href]', anchors => {
            const external = anchors.find(a =>
              a.href.includes('http') && !a.href.includes('nepvents.com')
            );
            return external ? external.href : '';
          });
        }

        // If still no external, leave blank
        event.register_link = register_link || '';
        console.log(`✅ ${event.title} → ${register_link || 'No link found'}`);

        await detailPage.close();
      } catch (err) {
        console.warn(`⚠️ Could not get register link for ${event.title}: ${err.message}`);
        event.register_link = '';
      }

      results.push(event);
    }

    return results;
  };

  let allEvents = [];
  let pageNum = 1;

  while (true) {
    console.log(`📄 Scraping page ${pageNum}...`);

    try {
      const pageEvents = await scrapeOnePage();
      allEvents.push(...pageEvents);
    } catch (err) {
      console.error(`❌ Failed scraping page ${pageNum}:`, err.message);
      break;
    }

    // Pagination check
    const nextButton = await page.$(`a[href*="/events?page=${pageNum + 1}"]`);
    if (!nextButton) break;

    try {
      await Promise.all([
        nextButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);
      pageNum++;
    } catch (err) {
      console.warn(`⚠️ Navigation timeout on page ${pageNum + 1}, stopping...`);
      break;
    }
  }

  // Remove duplicates by title
  const unique = Object.values(
    allEvents.reduce((map, event) => ({ ...map, [event.title]: event }), {})
  );

  // Write to CSV
  const csvWriter = createObjectCsvWriter({
    path: 'events.csv',
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

  await csvWriter.writeRecords(unique);
  console.log(`✅ Saved ${unique.length} events to events.csv`);

  // Write to JSON as well
  writeFileSync('events.json', JSON.stringify(unique, null, 2));
  console.log(`✅ Saved ${unique.length} events to events.json`);

  await browser.close();
  console.log('🎉 All pages scraped successfully!');
}

scrapeNepventsAll().catch(console.error);
