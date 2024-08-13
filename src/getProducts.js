const puppeteer = require('puppeteer');
const fs = require('fs');
const { get } = require('http');

async function getProducts(url) {
  let browser;
  try {
    // Khởi động trình duyệt
    browser = await puppeteer.launch({ 
      headless: true, // Chạy ở chế độ headless để tăng tốc độ
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Điều hướng đến trang web mục tiêu với timeout tăng lên 60 giây
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Đợi các phần tử sản phẩm xuất hiện với timeout tăng lên 60 giây
    await page.waitForSelector('.item_product_main', { timeout: 60000 });

    // Lấy dữ liệu sản phẩm
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

    // Đọc nội dung hiện tại của tệp JSON
    let existingData = [];
    const filePath = './src/result/products.json';
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      if (fileContent.trim()) {
        existingData = JSON.parse(fileContent);
      }
    }

    // Thêm dữ liệu mới vào nội dung hiện tại
    existingData.push(...products);

    // Ghi lại toàn bộ nội dung vào tệp JSON
    const jsonData = JSON.stringify(existingData, null, 2);
    fs.writeFileSync(filePath, jsonData, 'utf-8');

  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
  } finally {
    // Đóng trình duyệt
    if (browser) {
      await browser.close();
    }
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

for (let i = 1; i < listUrls.length; i++) {
  setTimeout(() => {
    getProducts(listUrls[i]);
  }, i * 10000);
}