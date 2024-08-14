const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');
const axios = require('axios');

async function getProducts(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.item_product_main', { timeout: 30000 });

    const products = await page.evaluate(() => {
      const productElements = document.querySelectorAll('.item_product_main');
      const title = document.querySelector('.title-page')?.innerText || 'No product type';
      let part = title.split(' ');
      const branch = part[part.length - 1].toLowerCase();
      const productType = part.slice(0, part.length - 1).join(' ').toLowerCase();
      const productData = [];

      productElements.forEach(product => {
        const name = product.querySelector('.product-name')?.innerText || 'No name';
        const price = product.querySelector('.price-box')?.innerText || 'No price';
        const imgUrl = product.querySelector('.lazyload.loaded')?.getAttribute('src') || 'No image URL';
        productData.push({ name, price, productType, branch, imgUrl });
      });

      return productData;
    });

    return products;
  } catch (error) {
    return []; // Return an empty array if there was an error
  }
}

const listUrls = [
  'https://shopvnb.com/vot-cau-long-yonex.html',
  'https://shopvnb.com/vot-cau-long-victor.html',
  'https://shopvnb.com/vot-cau-long-lining.html',
  'https://shopvnb.com/vot-cau-long-mizuno.html',
  'https://shopvnb.com/vot-cau-long-apacs.html',
  'https://shopvnb.com/vot-cau-long-vnb.html',
  'https://shopvnb.com/vot-cau-long-proace.html',
  'https://shopvnb.com/vot-cau-long-flypower.html',
  'https://shopvnb.com/vot-cau-long-tenway.html',

  'https://shopvnb.com/giay-cau-long-yonex.html',
  'https://shopvnb.com/giay-cau-long-victor.html',
  'https://shopvnb.com/giay-cau-long-lining.html',
  'https://shopvnb.com/giay-cau-long-kawasaki-nam.html',
  'https://shopvnb.com/giay-cau-long-mizuno.html',
  'https://shopvnb.com/giay-cau-long-kumpoo1.html',
  'https://shopvnb.com/giay-cau-long-promax.html',
  'https://shopvnb.com/giay-cau-long-babolat.html',
  'https://shopvnb.com/giay-cau-long-sunbatta.html',
  'https://shopvnb.com/giay-cau-long-apacs.html',
];

async function urlExists(url) {
  try {
    await axios.head(url);
    return true;
  } catch (error) {
    return false;
  }
}

async function processUrls(listUrls) {
  const numPages = 3;
  const totalTasks = listUrls.length * numPages;
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(totalTasks, 0);

  let totalProducts = [];
  const errorLog = [];

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pages = await Promise.all(Array(5).fill(null).map(() => browser.newPage())); // Open 5 pages

  const tasks = listUrls.flatMap(baseUrl =>
    Array.from({ length: numPages }, (_, j) => ({
      url: j === 1 ? baseUrl : `${baseUrl}?page=${j + 1}`,
    }))
  );

  const chunkSize = Math.ceil(tasks.length / pages.length);
  const taskChunks = Array.from({ length: pages.length }, (_, i) =>
    tasks.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  await Promise.all(taskChunks.map(async (taskChunk, index) => {
    const page = pages[index];
    for (const task of taskChunk) {
      const { url } = task;
      if (await urlExists(url)) {
        try {
          const products = await getProducts(page, url);
          totalProducts.push(...products);
        } catch (error) {
          errorLog.push(`Error scraping ${url}: ${error.message}`);
        }
      } else {
        errorLog.push(`URL does not exist: ${url}`);
      }
      progressBar.increment();
    }
  }));

  await browser.close();
  progressBar.stop();

  // Write products data to JSON file
  const filePath = './src/result/products.json';
  const jsonData = JSON.stringify(totalProducts, null, 2);
  fs.writeFileSync(filePath, jsonData, 'utf-8');

  // Write errors to log file
  if (errorLog.length > 0) {
    const logFilePath = './src/result/error.log';
    fs.writeFileSync(logFilePath, errorLog.join('\n'), 'utf-8');
    console.log('Errors were logged to error.log');
  }

  console.log(`Done!\nTotal number of products: ${totalProducts.length}`);
}

// Example usage
console.log('Start scraping products...');
processUrls(listUrls);
