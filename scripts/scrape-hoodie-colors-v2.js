const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const hoodiesPath = path.join(__dirname, '../data/hoodies.json');
const colorsDir = path.join(__dirname, '../public/images/hoodies/colors');

// Create colors directory if it doesn't exist
if (!fs.existsSync(colorsDir)) {
  fs.mkdirSync(colorsDir, { recursive: true });
}

async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}`);
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    return buffer.length;
  } catch (err) {
    console.log(`    ✗ Failed: ${err.message}`);
    return 0;
  }
}

async function scrapeProductColors(productUrl) {
  try {
    console.log(`  Fetching: ${productUrl}`);
    const response = await fetch(productUrl);
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const colors = [];

    // Find all color links in colorContainer2
    $('#colorContainer2 a.descTooltip').each((i, el) => {
      const $el = $(el);
      const colorCode = $el.attr('data-colorcode');
      const colorName = $el.attr('data-desc');
      const largeImage = $el.attr('data-image'); // This is the large product image for this color

      if (colorCode && colorName && largeImage) {
        colors.push({
          code: colorCode.toLowerCase(),
          name: colorName,
          imageUrl: largeImage
        });
      }
    });

    return colors;
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return null;
  }
}

async function processHoodie(style, productUrl) {
  console.log(`\n${style}:`);

  const colors = await scrapeProductColors(productUrl);

  if (!colors || colors.length === 0) {
    console.log('  No colors found');
    return null;
  }

  console.log(`  Found ${colors.length} colors: ${colors.map(c => c.name).join(', ')}`);

  // Download each color image
  const processedColors = [];
  for (const color of colors) {
    const filename = `${style}-${color.code}.png`;
    const filepath = path.join(colorsDir, filename);

    console.log(`    Downloading ${color.name}...`);
    const size = await downloadImage(color.imageUrl, filepath);

    if (size > 0) {
      console.log(`    ✓ Saved ${filename} (${(size / 1024).toFixed(1)}KB)`);
      processedColors.push({
        code: color.code,
        name: color.name,
        image: `/images/hoodies/colors/${filename}`
      });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return processedColors;
}

async function main() {
  // Product URLs - add your hoodie URLs here
  const productUrls = {
    'HF09MW': 'https://www.losangelesapparel-imprintable.net/product/HF09MW/',
    'HF09GD': 'https://www.losangelesapparel-imprintable.net/product/HF09GD/',
    'HF-09': 'https://www.losangelesapparel-imprintable.net/product/HF-09/',
    'ALP49GD': 'https://www.losangelesapparel-imprintable.net/product/ALP49GD/',
    'MWF1049': 'https://www.losangelesapparel-imprintable.net/product/MWF1049/',
    'PF409': 'https://www.losangelesapparel-imprintable.net/product/PF409/',
    'PLU09GD': 'https://www.losangelesapparel-imprintable.net/product/PLU09GD/',
    'SF1049': 'https://www.losangelesapparel-imprintable.net/product/SF1049/',
    'TRF09': 'https://www.losangelesapparel-imprintable.net/product/TRF09/'
  };

  // Load current hoodies data
  const hoodies = JSON.parse(fs.readFileSync(hoodiesPath, 'utf8'));

  console.log('=== Scraping hoodie colors ===');

  for (const product of hoodies.products) {
    const url = productUrls[product.style];
    if (!url) {
      console.log(`\n${product.style}: No URL provided, skipping`);
      continue;
    }

    const colors = await processHoodie(product.style, url);
    if (colors && colors.length > 0) {
      product.colors = colors;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Save updated data
  fs.writeFileSync(hoodiesPath, JSON.stringify(hoodies, null, 2));

  console.log('\n=== Done ===');
  console.log(`Updated ${hoodiesPath}`);
}

main().catch(console.error);
