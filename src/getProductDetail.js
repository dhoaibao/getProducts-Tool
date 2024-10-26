import puppeteer from 'puppeteer';
import fs from 'fs';
import cliProgress from 'cli-progress';
import pLimit from 'p-limit'; // Giới hạn số lượng yêu cầu song song

// Hàm thay thế tên specification với ID
function replaceID(name) {
    if (typeof name === 'string') {
        name = name.toLowerCase().trim();
        let id = null;
        if (name === 'trình độ chơi:') id = '1';
        if (name === 'chiều dài vợt:') id = '2';
        if (name === 'phong cách chơi:') id = '3';
        if (name === 'độ cứng đũa:') id = '4';
        if (name === 'điểm cân bằng:') id = '5';
        if (name === 'nội dung chơi:') id = '6';
        if (name === 'trọng lượng:') id = '7';
        if (name === 'chiều dài cán vợt:') id = '8';
        if (name === 'swingweight:') id = '9';
        if (name === 'số ngăn lớn:') id = '10';
        if (name === 'đối tượng:') id = '11';
        if (name === 'thể loại túi:') id = '12';
        if (name === 'điểm nổi bật:') id = '13';
        if (name === 'thể loại balo:') id = '14';

        const ids = {
            '1': '671ca928e1555600143a77c8',
            '2': '671ca931e1555600143a77cb',
            '3': '671ca93ae1555600143a77ce',
            '4': '671ca947e1555600143a77d3',
            '5': '671ca979e1555600143a77d8',
            '6': '671ca984e1555600143a77dd',
            '7': '671ca992e1555600143a77e0',
            '8': '671ca99de1555600143a77e5',
            '9': '671ca9a9e1555600143a77e8',
            '10': '671ca9b4e1555600143a77eb',
            '11': '671ca9bee1555600143a77f0',
            '12': '671ca9c9e1555600143a77f3',
            '13': '671ca9d5e1555600143a77f6',
            '14': '671ca9e0e1555600143a77fb',
        };

        if (id) {
            // return { $oid: ids[id] };
            return ids[id];
        }
    } 
    return name;
}

// Hàm lấy thông tin chi tiết sản phẩm và có cơ chế retry
async function getProductDetailWithRetry(page, url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector('.bodywrap', { timeout: 60000 });

            const products = await page.evaluate(() => {
                const productData = [];
                const title = document.querySelector('.title-product')?.innerText;
                const productImagePath = Array.from(document.querySelectorAll('.product-images a'))
                    .map(a => a.getAttribute('href'));
                                const description = Array.from(document.querySelectorAll('#tab_gioi_thieu'))
                                    .map(element => element.innerHTML)
                                    .join('');
                const technicalSpecification = Array.from(document.querySelectorAll('#tab_thong_so tr'))
                    .map(tr => {
                        const [specNameElem, specDescElem] = tr.querySelectorAll('b, td:nth-child(2)');
                        return {
                            specificationName: specNameElem ? specNameElem.innerHTML : '',
                            specificationDesc: specDescElem ? specDescElem.innerHTML : ''
                        };
                    });
                productData.push({ title, productImagePath, description, technicalSpecification });
                return productData;
            });

            return products;
        } catch (error) {
            if (i === retries - 1) {
                console.error(`Failed to scrape ${url} after ${retries} retries: ${error.message}`);
                return [];
            }
            console.log(`Retrying (${i + 1}/${retries}) for ${url}`);
        }
    }
}

// Hàm scrape chi tiết sản phẩm với cơ chế giới hạn song song và lưu từng phần
async function scrapeProductDetails(urls) {
    const totalTasks = urls.length;
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(totalTasks, 0);

    let totalProducts = [];
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pages = await Promise.all(Array(20).fill(null).map(() => browser.newPage()));
    const chunkSize = Math.ceil(urls.length / pages.length);
    const taskChunks = Array.from({ length: pages.length }, (_, i) =>
        urls.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    const limit = pLimit(5); // Giới hạn chỉ 5 trang chạy song song

    await Promise.all(taskChunks.map((taskChunk, index) => 
        limit(async () => {
            const page = pages[index];
            const productsForPage = [];

            for (const url of taskChunk) {
                try {
                    const products = await getProductDetailWithRetry(page, url);
                    productsForPage.push(...products);
                } catch (error) {
                    console.error(`Error scraping ${url}: ${error.message}`);
                }
                progressBar.increment();
            }

            totalProducts.push(...productsForPage);
            await page.close();
        })
    ));

    await browser.close();
    progressBar.stop();

    return totalProducts;
}

// Hàm chính
async function get() {
    const fileContent = fs.readFileSync("./src/result/products.json", 'utf-8');
    const products = JSON.parse(fileContent);

    const urls = products.map(product => product.link);

    const productDetails = await scrapeProductDetails(urls);

    const updatedProducts = products.map((product) => {
        let updatedProduct = {};
        productDetails.forEach((productDetail) => {
            if (productDetail.title === product.productName) {
                let spec = productDetail.technicalSpecification;
                spec.forEach((item) => {
                    item.specificationName = replaceID(item.specificationName.toString());
                });
                updatedProduct = {
                    productName: product.productName,
                    price: product.price,
                    discount: product.discount,
                    promotion: product.promotion,
                    category: product.category,
                    countInStock : product.countInStock,
                    productImagePath: productDetail.productImagePath,
                    description: productDetail.description,
                    technicalSpecification: spec,
                };
            }
        });
        return updatedProduct;
    });

    fs.writeFileSync("./src/result/products-detail.json", JSON.stringify(updatedProducts, null, 2), 'utf-8');

    console.log(`Done!\nTotal number of products after updated successfully: ${updatedProducts.length}`);
}

console.log('\nStart updating products detail...');
get();
