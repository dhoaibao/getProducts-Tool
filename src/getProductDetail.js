const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');

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

        const ids = {
            '1': '66cb3b5b916b971633510a0c',
            '2': '66cb3ba3916b971633510a0d',
            '3': '66cb3bba916b971633510a0e',
            '4': '66cb3bc9916b971633510a0f',
            '5': '66cb3c21916b971633510a12',
            '6': '66cb3bd7916b971633510a10',
            '7': '66cb3be2916b971633510a11',
            '8': '66cb4468916b971633510a15',
            '9': '66cb44cd916b971633510a16',
            '10': '66d71a1197b525267d89ba94',
            '11': '66d71a2197b525267d89ba95',
            '12': '66e8c89d9be3ab34bbc3d89a',
            '13': '66e8c8e89be3ab34bbc3d89b',
        };

        if (id) {
            for (const [key, $oid] of Object.entries(ids)) {
                if (id === key) {
                    return { $oid };
                }
            }
        }
    } else return name;
}


async function getProductDetail(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('#tab_thong_so', { timeout: 60000 });

        const products = await page.evaluate(() => {

            const productData = [];

            const title = document.querySelector('.title-product')?.innerText;

            const productImagePath = Array.from(document.querySelectorAll('.product-images a'))
                .map(a => a.getAttribute('href'));

            const description = Array.from(document.querySelectorAll('#tab_gioi_thieu'))
                .map(element => element.innerHTML);

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
        return [];
    }
}

async function scrapeProductDetails(urls) {
    const totalTasks = urls.length;
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(totalTasks, 0);

    let totalProducts = [];

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // for (const url of urls) {
    //     try {
    //         const products = await getProductDetail(page, url);
    //         totalProducts.push(...products);
    //     } catch (error) {
    //         // console.error(`Error scraping ${url}: ${error.message}`);
    //     }
    //     progressBar.increment();
    // }

    const pages = await Promise.all(Array(20).fill(null).map(() => browser.newPage()));

    const chunkSize = Math.ceil(urls.length / pages.length);
    const taskChunks = Array.from({ length: pages.length }, (_, i) =>
        urls.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    await Promise.all(taskChunks.map(async (taskChunk, index) => {
        const page = pages[index];
        const productsForPage = [];

        for (const url of taskChunk) {
            try {
                const products = await getProductDetail(page, url);
                productsForPage.push(...products);
            } catch (error) {
                // console.error(`Error scraping ${url}: ${error.message}`);
            }
            progressBar.increment();
        }

        totalProducts.push(...productsForPage);
        await page.close();  // Đóng trang sau khi hoàn thành tất cả các tác vụ
    }));

    await browser.close();
    progressBar.stop();

    return totalProducts;
}

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
                    productType: product.productType,
                    productBrand: product.productBrand,
                    countInStock : product.countInStock,
                    productImagePath: productDetail.productImagePath,
                    description: productDetail.description,
                    technicalSpecification: spec,
                };
            }
        });
        return updatedProduct;
    });

    // console.log(updatedProducts);

    const filePath = "./src/result/products-detail.json";
    fs.writeFileSync(filePath, JSON.stringify(updatedProducts, null, 2), 'utf-8');

    console.log(`Done!\nTotal number of products after updated successfully: ${updatedProducts.length}`);
}

console.log('\nStart updating products detail...');
get();