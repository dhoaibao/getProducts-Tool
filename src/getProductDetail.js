const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');

function replaceID(name) {
    if (name.includes('Trình Độ Chơi')) name = '1';
    if (name.includes('Chiều Dài Vợt')) name = '2';
    if (name.includes('Phong Cách Chơi')) name = '3';
    if (name.includes('Độ Cứng Đũa')) name = '4';
    if (name.includes('Điểm Cân Bằng')) name = '5';
    if (name.includes('Nội Dung Chơi')) name = '6';
    if (name.includes('Trọng Lượng')) name = '7';
    if (name.includes('Chiều Dài Cán Vợt')) name = '8';
    if (name.includes('Swingweight')) name = '9';


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
    };
    for (const [key, $oid] of Object.entries(ids)) {
        if (name.includes(key)) {
            return { $oid };
        }
    }
    return null;
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

    for (const url of urls) {
        try {
            const products = await getProductDetail(page, url);
            totalProducts.push(...products);
        } catch (error) {
            // console.error(`Error scraping ${url}: ${error.message}`);
        }
        progressBar.increment();
    }
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
        let updatedProduct = { ...product };
        productDetails.forEach((productDetail) => {
            if (productDetail.title === product.productName) {
                let spec = productDetail.technicalSpecification;
                spec.forEach((item) => {
                   item.specificationName = replaceID(item.specificationName.toString());
                });
                updatedProduct = {
                    ...product,
                    productImagePath: productDetail.productImagePath,
                    description: productDetail.description,
                    technicalSpecification: spec,
                    link: undefined
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