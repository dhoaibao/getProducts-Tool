const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');
const axios = require('axios');

async function getProducts(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.item_product_main', { timeout: 60000 });

    const products = await page.evaluate(() => {
      function replaceID(name) {
        name = name.trim();
        const ids = {
          'Yonex': '66cac8b7ef5ace8edb5cff68',
          'Lining': '66cac89bef5ace8edb5cff63',
          'Kumpoo': '66c813b5c9e37580eac489f5',
          'Victor': '66cac8c6ef5ace8edb5cff6b',
          'Mizuno': '66cac8d6ef5ace8edb5cff6e',
          'Apacs': '66cac8e3ef5ace8edb5cff71',
          'VNB': '66cac8f2ef5ace8edb5cff74',
          'Proace': '66cac904ef5ace8edb5cff77',
          'Forza': '66cac91bef5ace8edb5cff7a',
          'FlyPower': '66cac93cef5ace8edb5cff7d',
          'Tenway': '66cac953ef5ace8edb5cff80',
          'Kason': '66e8cd3b9be3ab34bbc3d951',
          'Kawasaki': '66e8cd859be3ab34bbc3d953',
          'Forza': '66e8cda89be3ab34bbc3d954',
          'Adonex': '66e8cdd59be3ab34bbc3d955',
          'Kumpoo': '66e8cdf69be3ab34bbc3d956',
          'Teway': '66e8ce219be3ab34bbc3d957',
          'Sunbatta': '66e8ce549be3ab34bbc3d958',
          'vot-cau-long': '66caca6cef5ace8edb5cff8b',
          'tui-vot-cau-long': '66d718edd6c02fe695f1ad1b',
          'balo-cau-long': '66e8cedc9be3ab34bbc3d959'
        };
        for (const [key, $oid] of Object.entries(ids)) {
          if (name === key) {
            return { $oid };
          }
        }
        return null;
      }

      const productElements = document.querySelectorAll('.item_product_main');
      const title = document.querySelector('.title-page')?.innerText;
      let part = title.split(' ');
      const lastPart = part[part.length - 1].toLowerCase();
      const productBrand = replaceID(lastPart.charAt(0).toUpperCase() + lastPart.slice(1));
      const temp = part.slice(0, part.length - 1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
      const productType = replaceID(temp);
      const countInStock = 50;
      const productData = [];

      productElements.forEach(product => {
        const productName = product.querySelector('.product-name')?.innerText;
        const link = "https://shopvnb.com/".concat(product.querySelector('.product-name a')?.getAttribute('href'));
        const priceText = product.querySelector('.price-box')?.innerText;
        // const productImagePath = product.querySelector('.lazyload.loaded')?.getAttribute('src');
        const price = parseInt(priceText.replace(/\./g, '').replace(' ₫', ''), 10);
        productData.push({ productName, price, productType, productBrand, countInStock, link });
      });

      return productData;
    });

    return products;
  } catch (error) {
    return []; // Return an empty array if there was an error
  }
}

const listUrls = [
  // 'https://shopvnb.com/tui-vot-cau-long-lining.html',
  // 'https://shopvnb.com/tui-vot-cau-long-yonex.html',
  // 'https://shopvnb.com/tui-vot-cau-long-victor.html',
  // 'https://shopvnb.com/tui-vot-cau-long-kawasaki.html', 
  // 'https://shopvnb.com/tui-vot-cau-long-mizuno.html',
  // 'https://shopvnb.com/tui-vot-cau-long-kumpoo.html',

  // 'https://shopvnb.com/vot-cau-long-yonex.html',
  // 'https://shopvnb.com/vot-cau-long-victor.html',
  // 'https://shopvnb.com/vot-cau-long-lining.html',
  
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

  // const urls = listUrls.map(url =>
  //   Array.from({ length: numPages }, (_, j) => ({
  //     url: j === 0 ? url : `${url}?page=${j+1}`,
  //   }))
  // );

  // const page = await browser.newPage();
  // for (const url of urls) {
  //   try {
  //     const products = await getProductDetail(page, url);
  //     totalProducts.push(...products);
  //   } catch (error) {
  //     // console.error(`Error scraping ${url}: ${error.message}`);
  //   }
  //   progressBar.increment();
  // }

  const pages = await Promise.all(Array(5).fill(null).map(() => browser.newPage())); // Open 5 pages

  const tasks = listUrls.flatMap(baseUrl =>
    Array.from({ length: numPages }, (_, j) => ({
      url: j === 0 ? baseUrl : `${baseUrl}?page=${j + 1}`,
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
