const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');
const axios = require('axios');

async function getProducts(page, url) {
  try {
    // await page.setRequestInterception(true);
    //     page.on('request', (request) => {
    //         if (request.isInterceptResolutionHandled()) {
    //             return;
    //         }
    //         if (['image', 'stylesheet'].includes(request.resourceType())) {
    //             request.abort();
    //         } else {
    //             request.continue();
    //         }
    //     });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.item_product_main', { timeout: 60000 });

    const products = await page.evaluate(() => {
      const productElements = document.querySelectorAll('.item_product_main');
      const title = document.querySelector('.title-page')?.innerText;
      let part = title.split(' ');
      const lastPart = part[part.length - 1].toLowerCase();
      const productBranch = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
      const productType = part.slice(0, part.length - 1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
      const countInStock = 50;
      const productData = [];

      productElements.forEach(product => {
        const productName = product.querySelector('.product-name')?.innerText;
        const link = "https://shopvnb.com/".concat(product.querySelector('.product-name a')?.getAttribute('href'));
        const priceText = product.querySelector('.price-box')?.innerText;
        // const productImagePath = product.querySelector('.lazyload.loaded')?.getAttribute('src');
        const price = parseInt(priceText.replace(/\./g, '').replace(' ₫', ''), 10);
        productData.push({ productName, price, productType, productBranch, countInStock, link });
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
];

async function urlExists(url) {
  try {
    await axios.head(url);
    return true;
  } catch (error) {
    return false;
  }
}

async function processUrls(listUrls, numPages) {
  const totalTasks = listUrls.length * numPages;
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(totalTasks, 0);

  let totalProducts = [];

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
          // console.error(`Error scraping ${url}: ${error.message}`);        
        }
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

  console.log(`Done!\nTotal number of products scraped: ${totalProducts.length}`);
}

console.log('Start scraping products...');
processUrls(listUrls, 3);
