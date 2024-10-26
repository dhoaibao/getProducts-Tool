import fs from 'fs';

let products = [];

try {
  const fileContent = fs.readFileSync("./src/result/products-detail.json", 'utf-8');
  products = JSON.parse(fileContent);
} catch (error) {
  console.error('Error reading or parsing products-detail.json:', error);
}

async function addProductToDb(product) {
  try {
    const response = await fetch('http://localhost:5000/api/v1/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(product)
    });
    if (!response.ok) {
      console.log('Network response was not ok');
    }
    // const data = await response.json();
    // console.log('Product added successfully:', data);
  } catch (error) {
    console.error('There has been a problem with your fetch operation:', error);
  }
}

Promise.all(products.map(product => addProductToDb(product)))
  .then(() => console.log('All products have been processed'))
  .catch(error => console.error('Error processing products:', error));