const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');

async function getProductDetail(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('#tab_thong_so', { timeout: 60000 });

        const products = await page.evaluate(() => {
            function replaceID(name) {
                name = name.replace('\t', '');
                if (name.search('Trình độ chơi')) return '66caae814e2dc95e550c94b2';
                if (name.search('Chiều dài vợt')) return '66caaf0d4e2dc95e550c94b3';
                if (name.search('Phong cách chơi')) return '66caaf214e2dc95e550c94b4';
                if (name.search('Độ cứng đũa')) return '66caaf354e2dc95e550c94b5';
                if (name.search('Điểm cân bằng')) return '66caaf4c4e2dc95e550c94b6';
                if (name.search('Nội dung chơi')) return '66caaf5d4e2dc95e550c94b7';
                if (name.search('Trọng lượng')) return '66caaf6e4e2dc95e550c94b8';
            }

            const productData = [];

            const title = document.querySelector('.title-product')?.innerText;

            const productImagePath = Array.from(document.querySelectorAll('.product-images a'))
                .map(a => a.getAttribute('href'));

            const description = Array.from(document.querySelectorAll('#tab_gioi_thieu p'))
                .map(p => p.innerText)
                .join('\n');

            const technicalSpecification = Array.from(document.querySelectorAll('#tab_thong_so tr'))
                .map(tr => {
                    const [specNameElem, specDescElem] = tr.querySelectorAll('b, td:nth-child(2)');
                    return {
                        specificationName: specNameElem ? replaceID(specNameElem.innerHTML) : '',
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

    // const pages = await Promise.all(Array(20).fill(null).map(() => browser.newPage())); 

    // const chunkSize = Math.ceil(urls.length / pages.length);
    // const taskChunks = Array.from({ length: pages.length }, (_, i) =>
    //     urls.slice(i * chunkSize, (i + 1) * chunkSize)
    // );

    // await Promise.all(taskChunks.map(async (taskChunk, index) => {
    //     const page = pages[index];
    //     for (const url of taskChunk) {
    //         try {
    //             const products = await getProductDetail(page, url);
    //             totalProducts.push(...products);
    //         } catch (error) {
    //             // console.error(`Error scraping ${url}: ${error.message}`);
    //         }
    //         progressBar.increment();
    //     }
    // }));

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
                updatedProduct = {
                    ...product,
                    productImagePath: productDetail.productImagePath,
                    description: productDetail.description,
                    technicalSpecification: productDetail.technicalSpecification,
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