const puppeteer = require('puppeteer');
const fs = require('fs');
const cliProgress = require('cli-progress');

async function getProductDetail(page, url) {
    try {
        // await page.setRequestInterception(true);
        // page.on('request', (request) => {
        //     if (request.isInterceptResolutionHandled()) {
        //         return;
        //     }
        //     if (['image', 'stylesheet'].includes(request.resourceType())) {
        //         request.abort();
        //     } else {
        //         request.continue();
        //     }
        // });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('#tab_thong_so', { timeout: 60000 });

        const products = await page.evaluate(() => {
            const productData = [];

            const productImagePath = Array.from(document.querySelectorAll('.product-images a'))
                .map(a => a.getAttribute('href'));

            const description = Array.from(document.querySelectorAll('#tab_gioi_thieu p'))
                .map(p => p.innerText)
                .join('\n');

            const technicalSpecification = Array.from(document.querySelectorAll('#tab_thong_so tr'))
                .map(tr => {
                    const [specNameElem, specDescElem] = tr.querySelectorAll('b, td:nth-child(2)');
                    return {
                        specificationName: specNameElem ? specNameElem.innerHTML : '',
                        specificationDesc: specDescElem ? specDescElem.innerHTML : ''
                    };
                });

            productData.push({ productImagePath, description, technicalSpecification });

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

    const pages = await Promise.all(Array(30).fill(null).map(() => browser.newPage())); // Open 30 pages

    const chunkSize = Math.ceil(urls.length / pages.length);
    const taskChunks = Array.from({ length: pages.length }, (_, i) =>
        urls.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    await Promise.all(taskChunks.map(async (taskChunk, index) => {
        const page = pages[index];
        for (const url of taskChunk) {
            try {
                const products = await getProductDetail(page, url);
                totalProducts.push(...products);
            } catch (error) {
                // console.error(`Error scraping ${url}: ${error.message}`);
            }
            progressBar.increment();
        }
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

    const updatedProducts = products.map((product, index) => {
        const details = productDetails[index];
        if (details) {
            const { productImagePath, description, technicalSpecification } = details;
            return {
                ...product,
                productImagePath,
                description,
                technicalSpecification,
                link: undefined
            };
        } else {
            // console.error(`No details found for product at index ${index}`);
            // return product;
        }
    });

    const filePath = "./src/result/products-detail.json";
    fs.writeFileSync(filePath, JSON.stringify(updatedProducts, null, 2), 'utf-8');

        console.log(`Done!\nTotal number of products after updated successfully: ${updatedProducts.length}`);
}

console.log('\nStart updating products detail...');
get();