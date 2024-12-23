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

            'túi đựng giày': '6721f2191b086dac2541c7e0',
            'vớ cầu lông': '6721f4fef34e16b760cb76a6',
            'cước đan vợt cầu lông': '6721f6cef34e16b760cb7892',
            'quả cầu lông': '6721fad5f34e16b760cb7b0f',
            'bình nước cầu lông': '6721fb53f34e16b760cb7c23',
            'quấn cán cầu lông': '6721fbb3f34e16b760cb7d13',
            'móc khóa cầu lông': '6721ff72f34e16b760cb7f78',

            'vợt tennis wilson': '672472dbda52ac7cec958115',            
            'vợt tennis babolat': '6724738a614df2a226fedc2b',            
            'vợt tennis yonex': '67247396614df2a226fedc34',            
            'vợt tennis head': '672473a2614df2a226fedc47',
            'vợt tennis prince': '672473ad614df2a226fedc50',                      
            'vợt tennis tecnifibre': '672473f16ad384ea783e9c2b',
            
            'túi tennis wilson': '6735b7260d718af5b315bdc9',
            'túi tennis babolat': '6735b73a0d718af5b315bddc',
            'túi tennis head': '6735b7560d718af5b315bdf8',
            'túi tennis adidas': '6735b7640d718af5b315be01',
            'túi tennis tecnifibre': '6735b7720d718af5b315be0a',
            'túi tennis prince': '6735b77f0d718af5b315be1d',

            'balo tennis wilson': '6735bbf502fb33f22997d383',
            'balo tennis babolat': '6735bbfc02fb33f22997d38c',
            'balo tennis prince': '6735bc0802fb33f22997d395',
            'balo tennis head': '6735bc1102fb33f22997d3a8',

            'bóng tennis': '6735c94802fb33f22997daf3',
            'quấn cán vợt tennis': '6735c96002fb33f22997db04',
            'vớ tennis': '6735c98502fb33f22997db15',
            'nón tennis': '6735c98e02fb33f22997db1c',
            'giảm rung': '6735c9dd02fb33f22997db41',

            'vợt pickleball head': '6735cce902fb33f22997e052',
            'vợt pickleball joola': '6735ccf602fb33f22997e05b',
            'vợt pickleball prokennex': '6735cd0402fb33f22997e06e',
            'vợt pickleball passion': '6735cd1002fb33f22997e077',
            'vợt pickleball beesoul': '6735cd2302fb33f22997e08a',
            'vợt pickleball selkirk': '6735cd2e02fb33f22997e093',
            'vợt pickleball babolat': '6735cd3802fb33f22997e0a5',
            'vợt pickleball wilson': '6735cd4602fb33f22997e0af',
            'vợt pickleball wilson': '6735cd4602fb33f22997e0af',

            'túi pickleball joola': '6735cd5d02fb33f22997e0c2',
            
            'balo pickleball joola': '6735cd8502fb33f22997e0e7',
            'balo pickleball arronax': '6735cda602fb33f22997e10c',

            'lưới pickleball': '6735cdb702fb33f22997e11e',
            'quấn cán vợt pickleball': '6735cdc702fb33f22997e125',
            'bảo vệ khung vợt pickleball': '6735cdd102fb33f22997e136',
            'tẩy mặt vợt pickleball': '6735cde302fb33f22997e13d',
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
          return name;
        }

        const productElements = document.querySelectorAll('.item_product_main');
        const title = document.querySelector('.title-page')?.innerText;
        const category = replaceID(title);
        const countInStock = 50;
        // const discount = {$oid : '66ca9dc92e0cf6b9be6806a0'};
        // const promotion = {$oid : '66ee63e22d296cdd27688fe5'};
        const discount = '66ca9dc92e0cf6b9be6806a0';
        const promotion = '66fc19da144b342832933967';
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

  // 'https://shopvnb.com/balo-cau-long-yonex.html',
  // 'https://shopvnb.com/balo-cau-long-victor.html',
  // 'https://shopvnb.com/balo-cau-long-kawasaki.html',
  // 'https://shopvnb.com/balo-cau-long-flypower.html',
  // 'https://shopvnb.com/balo-cau-long-mizuno.html',
  // 'https://shopvnb.com/balo-cau-long-adonex.html',
  // 'https://shopvnb.com/balo-cau-long-forza.html',
  // 'https://shopvnb.com/balo-cau-long-lining.html',
  // 'https://shopvnb.com/balo-cau-long-sunbatta.html',

  // 'https://shopvnb.com/tui-dung-giay.html',
  // 'https://shopvnb.com/vo-cau-long.html',
  // 'https://shopvnb.com/cuoc-dan-vot-cau-long.html',
  // 'https://shopvnb.com/qua-cau-long.html',
  // 'https://shopvnb.com/binh-nuoc-cau-long.html',
  // 'https://shopvnb.com/quan-can-cau-long.html'
  // 'https://shopvnb.com/moc-khoa-cau-long1.html',

  // 'https://shopvnb.com/vot-tennis-wilson.html',
  // 'https://shopvnb.com/vot-tennis-babolat.html',
  // 'https://shopvnb.com/vot-tennis-yonex.html',
  // 'https://shopvnb.com/vot-tennis-head.html',
  // 'https://shopvnb.com/vot-tennis-prince.html',
  // 'https://shopvnb.com/vot-tennis-tecnifibre.html',

  // 'https://shopvnb.com/tui-tennis-wilson.html',
  // 'https://shopvnb.com/tui-tennis-babolat.html',
  // 'https://shopvnb.com/tui-tennis-head.html',
  // 'https://shopvnb.com/tui-tennis-adidas.html',
  // 'https://shopvnb.com/tui-tennis-tecnifibre.html',
  // 'https://shopvnb.com/tui-tennis-prince.html',

  // 'https://shopvnb.com/balo-tennis-wilson.html',
  // 'https://shopvnb.com/balo-tennis-babolat.html',
  // 'https://shopvnb.com/balo-tennis-prince.html',
  // 'https://shopvnb.com/balo-tennis-head.html',

  // 'https://shopvnb.com/bong-tennis.html',
  // 'https://shopvnb.com/quan-can-vot-tennis.html',
  // 'https://shopvnb.com/giam-rung.html',
  // 'https://shopvnb.com/vo-tennis.html',
  // 'https://shopvnb.com/non-tennis.html',

  // 'https://shopvnb.com/vot-pickleball-head.html',
  // 'https://shopvnb.com/vot-pickleball-joola.html',
  // 'https://shopvnb.com/vot-pickleball-prokennex.html',
  // 'https://shopvnb.com/vot-pickleball-passion.html',
  // 'https://shopvnb.com/vot-pickleball-beesoul.html',
  // 'https://shopvnb.com/vot-pickleball-selkirk.html',
  // 'https://shopvnb.com/vot-pickleball-babolat.html',
  // 'https://shopvnb.com/vot-pickleball-wilson.html',

  // 'https://shopvnb.com/tui-pickleball-joola.html',

  // 'https://shopvnb.com/balo-pickleball-joola.html',
  // 'https://shopvnb.com/balo-pickleball-arronax.html',

  // 'https://shopvnb.com/luoi-pickleball.html',
  // 'https://shopvnb.com/quan-can-vot-pickleball.html'
  // 'https://shopvnb.com/bao-ve-khung-vot-pickleball.html',
  // 'https://shopvnb.com/tay-mat-vot.html',
];

console.log('Start scraping products...');
processUrls(listUrls, 1);
