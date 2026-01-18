const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.losangelesapparel-imprintable.net';

async function downloadImage(url, filepath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${url} (${response.status})`);
  }
  const buffer = await response.buffer();
  fs.writeFileSync(filepath, buffer);
  return buffer.length;
}

async function getProductImageUrl(styleCode) {
  const productUrl = `${BASE_URL}/product/${styleCode}/`;
  console.log(`  Fetching product page: ${productUrl}`);

  const response = await fetch(productUrl);
  if (!response.ok) {
    throw new Error(`Product page not found: ${styleCode}`);
  }

  const html = await response.text();

  // Look for large or thumb images in the page
  const largeMatch = html.match(/images\/large\/([^"'\s]+\.png)/i);
  const thumbMatch = html.match(/images\/thumb\/([^"'\s]+\.png)/i);
  const hiresMatch = html.match(/images\/hires\/([^"'\s]+\.png)/i);

  if (largeMatch) {
    return `${BASE_URL}/images/large/${largeMatch[1]}`;
  } else if (thumbMatch) {
    return `${BASE_URL}/images/thumb/${thumbMatch[1]}`;
  } else if (hiresMatch) {
    return `${BASE_URL}/images/hires/${hiresMatch[1]}`;
  }

  return null;
}

async function scrapeAndDownload(pageUrl, outputDir) {
  console.log(`Fetching category page: ${pageUrl}\n`);

  const response = await fetch(pageUrl);
  const html = await response.text();
  const $ = cheerio.load(html);

  const styleCodes = [];

  // Find all product containers and extract style codes
  $('.browseProd').each((i, el) => {
    const styleCode = $(el).attr('data-productid') || $(el).find('.browseProdDesc').text().trim();
    if (styleCode && !styleCodes.includes(styleCode.toUpperCase())) {
      styleCodes.push(styleCode.toUpperCase());
    }
  });

  console.log(`Found ${styleCodes.length} products\n`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Visit each product page and download the large image
  for (const styleCode of styleCodes) {
    console.log(`Processing ${styleCode}...`);

    try {
      const imageUrl = await getProductImageUrl(styleCode);

      if (!imageUrl) {
        console.log(`  ✗ No image found for ${styleCode}\n`);
        continue;
      }

      const filename = `${styleCode}.png`;
      const filepath = path.join(outputDir, filename);

      console.log(`  Downloading: ${imageUrl}`);
      const size = await downloadImage(imageUrl, filepath);
      console.log(`  ✓ Saved: ${filename} (${(size / 1024).toFixed(1)}KB)\n`);

    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
    }

    // Delay between requests to be respectful
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Done!');
  return styleCodes;
}

// Get URL from command line or use default
const url = process.argv[2] || 'https://www.losangelesapparel-imprintable.net/Mens/Bottoms-Shop-All/';
const outputDir = process.argv[3] || path.join(__dirname, '../downloads/bottoms');

scrapeAndDownload(url, outputDir).catch(console.error);
