const puppeteer = require('puppeteer');
const fs = require('fs');
const { mainModule } = require('process');

async function getProductDetail(page, url) {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('.layout-product', { timeout: 30000 });

        const products = await page.evaluate(() => {
            const productData = [];
            const description = Array.from(document.querySelectorAll('#tab_gioi_thieu p'))
                .map(p => p.innerText)
                .join('\n');

            const technicalSpecification = Array.from(document.querySelectorAll('#tab_thong_so tr'))
                .map(tr => {
                    const specificationName = tr.querySelector('b').innerHTML;
                    const specificationDesc = tr.querySelectorAll('td')[1].innerHTML;
                    return { specificationName, specificationDesc };
                });

            productData.push({ description, technicalSpecification });

            return productData;
        });

        return products;
    } catch (error) {
        console.error(`Error scraping ${url}: ${error.message}`);
        return [];
    }
}

async function scrapeProductDetails(urls) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const allProducts = [];
    for (const url of urls) {
        const products = await getProductDetail(page, url);
        allProducts.push(...products);
    }

    await browser.close();
    return allProducts;
}

async function get() {
    const filePath = "./src/result/products.json";
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const products = JSON.parse(fileContent);

    const urls = products.map(product => product.link);

    const productDetails = await scrapeProductDetails(urls);
    // console.log(productDetails[0].desc);
    // console.log(productDetails[0].productSpecs);

    // Merge details into original products and remove the link property
    const updatedProducts = products.map((product, index) => {
        const { description, technicalSpecification } = productDetails[index];
        return {
            ...product,
            description,
            technicalSpecification,
            link: undefined // Remove the link property
        };
    });

    // Write the updated products back to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(updatedProducts, null, 2), 'utf-8');

    console.log('Updated products.json with detailed product information.');
}

get();