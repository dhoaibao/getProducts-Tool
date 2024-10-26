import puppeteer from 'puppeteer';
import fs from 'fs';
import cliProgress from 'cli-progress';
import axios from 'axios';
import pLimit from 'p-limit'; // Giới hạn số lượng yêu cầu song song

async function getProducts(page, url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('.bodywrap', { timeout: 60000 });

      const products = await page.evaluate(() => {
        function replaceID(name) {
          name = name.trim().toLowerCase();
          const ids = {
            'vợt cầu lông yonex': '671cac35e1555600143a785c',
            'vợt cầu lông victor': '671cb61d6216dde784fba399',
            'vợt cầu lông lining': '671cb6226216dde784fba3a4',
            'vợt cầu lông mizuno': '671cb6276216dde784fba3ad',
            'vợt cầu lông apacs': '671cb62c6216dde784fba3b6',
            'vợt cầu lông vnb': '671cb6306216dde784fba3bf',
            'vợt cầu lông proace': '671cb6366216dde784fba3c8',
            'vợt cầu lông flypower': '671cb63c6216dde784fba3d1',
            'vợt cầu lông tenway': '671cb6416216dde784fba3dc',

            'túi vợt cầu lông yonex': '671cb85e6216dde784fbb63a',
            'túi vợt cầu lông victor': '671cb8666216dde784fbb645',
            'túi vợt cầu lông lining': '671cb86d6216dde784fbb64e',
            'túi vợt cầu lông kason': '671cb8846216dde784fbb665',
            'túi vợt cầu lông kawasaki': '671cb8a26216dde784fbb67c',
            'túi vợt cầu lông forza': '671cb9116216dde784fbb69d',
            'túi vợt cầu lông apacs': '671cb9196216dde784fbb6a8',
            'túi vợt cầu lông mizuno': '671cb9206216dde784fbb6b1',
            'túi vợt cầu lông adonex': '671cb9266216dde784fbb6ba',
            'túi vợt cầu lông kumpoo': '671cb92c6216dde784fbb6c3',

            'balo cầu lông yonex': '671cbab16216dde784fbc158',
            'balo cầu lông victor': '671cbab76216dde784fbc161',
            'balo cầu lông kawasaki': '671cbabf6216dde784fbc16a',
            'balo cầu lông flypower': '671cbacb6216dde784fbc175',
            'balo cầu lông mizuno': '671cbad36216dde784fbc17e',
            'balo cầu lông adonex': '671cbadb6216dde784fbc187',
          };
          // for (const [key, $oid] of Object.entries(ids)) {
          //   if (name === key) {
          //     return { $oid };
          //   }
          // }
          for (const [key, id] of Object.entries(ids)) {
            if (name === key) {
              return id;
            }
          }
          return null;
        }

        const productElements = document.querySelectorAll('.item_product_main');
        const title = document.querySelector('.title-page')?.innerText;
        const category = replaceID(title);
        const countInStock = 50;
        // const discount = {$oid : '66ca9dc92e0cf6b9be6806a0'};
        // const promotion = {$oid : '66ee63e22d296cdd27688fe5'};
        const discount = '66ca9dc92e0cf6b9be6806a0';
        const promotion = '66ee63e22d296cdd27688fe5';
        const productData = [];

        productElements.forEach(product => {
          const productName = product.querySelector('.product-name')?.innerText;
          const link = "https://shopvnb.com/".concat(product.querySelector('.product-name a')?.getAttribute('href'));
          const priceText = product.querySelector('.price-box')?.innerText;
          const price = parseInt(priceText.replace(/\./g, '').replace(' ₫', ''), 10);
          productData.push({ productName, category, price, discount, promotion, countInStock, link });
        });

        return productData;
      });

      return products;
    } catch (error) {
      return []; // Return an empty array if there was an error
    }
  }
}

async function urlExists(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await axios.head(url);
      return true;
    } catch (error) {
      if (i === retries - 1) {
        return false;
      }
    }
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

  const pages = await Promise.all(Array(10).fill(null).map(() => browser.newPage()));

  const tasks = listUrls.flatMap(baseUrl =>
    Array.from({ length: numPages }, (_, j) => ({
      url: j === 0 ? baseUrl : `${baseUrl}?page=${j + 1}`,
    }))
  );

  const chunkSize = Math.ceil(tasks.length / pages.length);
  const taskChunks = Array.from({ length: pages.length }, (_, i) =>
    tasks.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  const limit = pLimit(5); // Giới hạn chỉ 5 trang chạy song song

  await Promise.all(taskChunks.map((taskChunk, index) =>
    limit(async () => {
      const page = pages[index];

      for (const task of taskChunk) {
        const { url } = task;
        if (await urlExists(url)) {
          try {
            const products = await getProducts(page, url);
            totalProducts.push(...products);
          } catch (error) {
            console.error(`Error scraping ${url}: ${error.message}`);
          }
        }
        progressBar.increment();
      }
    })
  ));

  await browser.close();
  progressBar.stop();

  // Write products data to JSON file
  const filePath = './src/result/products.json';
  const jsonData = JSON.stringify(totalProducts, null, 2);
  fs.writeFileSync(filePath, jsonData, 'utf-8');

  console.log(`Done!\nTotal number of products scraped: ${totalProducts.length}`);
}

const listUrls = [
  // 'https://shopvnb.com/vot-cau-long-yonex.html',
  // 'https://shopvnb.com/vot-cau-long-victor.html',
  // 'https://shopvnb.com/vot-cau-long-lining.html',
  // 'https://shopvnb.com/vot-cau-long-mizuno.html',
  // 'https://shopvnb.com/vot-cau-long-apacs.html',
  // 'https://shopvnb.com/vot-cau-long-vnb.html',
  // 'https://shopvnb.com/vot-cau-long-proace.html',
  // 'https://shopvnb.com/vot-cau-long-flypower.html',
  // 'https://shopvnb.com/vot-cau-long-tenway.html',

  // 'https://shopvnb.com/tui-vot-cau-long-yonex.html',
  // 'https://shopvnb.com/tui-vot-cau-long-victor.html',
  // 'https://shopvnb.com/tui-vot-cau-long-lining.html',
  // 'https://shopvnb.com/tui-vot-cau-long-kason.html',
  // 'https://shopvnb.com/tui-vot-cau-long-kawasaki.html',
  // 'https://shopvnb.com/tui-vot-cau-long-forza.html',
  // 'https://shopvnb.com/tui-vot-cau-long-apacs.html',
  // 'https://shopvnb.com/tui-vot-cau-long-mizuno.html',
  // 'https://shopvnb.com/tui-vot-cau-long-adonex.html',
  // 'https://shopvnb.com/tui-vot-cau-long-kumpoo.html',

  'https://shopvnb.com/balo-cau-long-yonex.html',
  'https://shopvnb.com/balo-cau-long-victor.html',
  'https://shopvnb.com/balo-cau-long-kawasaki.html',
  'https://shopvnb.com/balo-cau-long-flypower.html',
  'https://shopvnb.com/balo-cau-long-mizuno.html',
  'https://shopvnb.com/balo-cau-long-adonex.html',
  'https://shopvnb.com/balo-cau-long-forza.html',
  'https://shopvnb.com/balo-cau-long-lining.html',
  'https://shopvnb.com/balo-cau-long-sunbatta.html',
];

console.log('Start scraping products...');
processUrls(listUrls, 1);
