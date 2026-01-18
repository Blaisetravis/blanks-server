const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.losangelesapparel-imprintable.net';

// Color code to name mapping
const COLOR_MAP = {
  'blk': 'Black', 'wht': 'White', 'nvy': 'Navy', 'gry': 'Grey', 'gra': 'Grey',
  'chr': 'Charcoal', 'hgr': 'Heather Grey', 'hgry': 'Heather Grey', 'hgrey': 'Heather Grey',
  'red': 'Red', 'blu': 'Blue', 'grn': 'Green', 'brn': 'Brown', 'tan': 'Tan',
  'nat': 'Natural', 'crm': 'Cream', 'pnk': 'Pink', 'pur': 'Purple', 'org': 'Orange',
  'orn': 'Orange', 'ylw': 'Yellow', 'olv': 'Olive', 'olive': 'Olive', 'bur': 'Burgundy',
  'mar': 'Maroon', 'marn': 'Maroon', 'ash': 'Ash', 'slt': 'Slate', 'snd': 'Sand',
  'khk': 'Khaki', 'kha': 'Khaki', 'choc': 'Chocolate', 'chocolate': 'Chocolate',
  'vblk': 'Vintage Black', 'vwht': 'Vintage White', 'vnvy': 'Vintage Navy',
  'bkedg': 'Black Edge', 'sco': 'Scour', 'scour': 'Scour', 'hth': 'Heather',
  'oxf': 'Oxford', 'dkh': 'Dark Heather', 'frn': 'Fern', 'frs': 'Forest', 'for': 'Forest',
  'mus': 'Mustard', 'rst': 'Rust', 'cml': 'Camel', 'sge': 'Sage', 'sag': 'Sage',
  'lav': 'Lavender', 'dst': 'Dusty', 'slb': 'Slate Blue', 'crl': 'Coral',
  'mnt': 'Mint', 'mint': 'Mint', 'sky': 'Sky', 'ivr': 'Ivory', 'ivy': 'Ivy',
  'bge': 'Beige', 'beige': 'Beige', 'gld': 'Gold', 'gold': 'Gold', 'trq': 'Turquoise',
  'cha': 'Charcoal', 'chrcl': 'Charcoal', 'htg': 'Heather Grey', 'lgr': 'Light Grey',
  'dgr': 'Dark Grey', 'rbl': 'Royal Blue', 'ryl': 'Royal', 'rybl': 'Royal Blue',
  'lbl': 'Light Blue', 'dbl': 'Dark Blue', 'dlb': 'Dusty Light Blue', 'arm': 'Army',
  'cream': 'Cream', 'owht': 'Off White', 'brg': 'Burgundy', 'brdx': 'Bordeaux',
  'brown': 'Brown', 'colbl': 'Columbia Blue', 'kel': 'Kelly Green', 'slv': 'Silver',
  'tea': 'Teal', 'purple': 'Purple', 'lpk': 'Light Pink', 'cmnt': 'Cement',
  'cblu': 'Cement Blue', 'atlngrn': 'Atlantic Green', 'mve': 'Mauve', 'mshrm': 'Mushroom',
  'ptli': 'Petal', 'rqtz': 'Rose Quartz', 'clve': 'Clove', 'oblk': 'Off Black',
  'asp': 'Asphalt', 'babp': 'Baby Pink', 'bbl': 'Baby Blue', 'egg': 'Eggshell',
  'eggsh': 'Eggshell', 'fus': 'Fuchsia', 'ltnt': 'Light Natural', 'rub': 'Ruby',
  'crn': 'Cranberry', 'blalg': 'Black Algae', 'maho': 'Mahogany', 'mnavy': 'Midnight Navy',
  'mnvy': 'Midnight Navy', 'shdw': 'Shadow', 'dkcyn': 'Dark Cyan', 'sapp': 'Sapphire',
  'aga': 'Agave', 'blos': 'Blossom', 'green': 'Green', 'nepur': 'Neon Purple',
  'nhblu': 'Neon Blue', 'npnk': 'Neon Pink', 'black': 'Black', 'white': 'White', 'navy': 'Navy'
};

// Load current product data
const bottomsPath = path.join(__dirname, '../data/bottoms.json');
const bottoms = JSON.parse(fs.readFileSync(bottomsPath, 'utf8'));

async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status}`);
    }
    const buffer = await response.buffer();
    fs.writeFileSync(filepath, buffer);
    return buffer.length;
  } catch (err) {
    console.log(`    ✗ Failed to download: ${err.message}`);
    return 0;
  }
}

function getColorName(code) {
  const lowerCode = code.toLowerCase();
  if (COLOR_MAP[lowerCode]) {
    return COLOR_MAP[lowerCode];
  }
  return code.split(/[-_]/).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

async function scrapeProductColors(styleCode) {
  const productUrl = `${BASE_URL}/product/${styleCode}/`;

  try {
    const response = await fetch(productUrl);
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Get unique color codes from data-color attributes
    const colorCodes = new Set();
    $('[data-color]').each((i, el) => {
      const code = $(el).attr('data-color');
      if (code) {
        colorCodes.add(code.toLowerCase());
      }
    });

    // Find images for each color - look for pattern: styleCode + colorCode
    const colors = [];
    const styleCodeLower = styleCode.toLowerCase().replace(/-/g, '');

    colorCodes.forEach(colorCode => {
      // Look for thumb image with this color code
      let imageUrl = null;

      $('img').each((i, el) => {
        const src = $(el).attr('src') || '';
        const srcLower = src.toLowerCase();

        // Match pattern like "be443blk" or "hf-04ash" (with or without hyphen)
        if (srcLower.includes('/thumb/') &&
            srcLower.includes(styleCodeLower) &&
            srcLower.includes(colorCode)) {
          // Prefer thumb images that are direct color variants (not side views etc)
          if (!imageUrl || (!srcLower.includes('side') && !srcLower.includes('back'))) {
            imageUrl = src.startsWith('http') ? src : BASE_URL + src;
          }
        }
      });

      colors.push({
        code: colorCode,
        name: getColorName(colorCode),
        image: imageUrl
      });
    });

    return colors;
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n=== Scraping colors for ${bottoms.products.length} products ===\n`);

  // Create images directory for color variants
  const colorsDir = path.join(__dirname, '../public/images/bottoms/colors');
  if (!fs.existsSync(colorsDir)) {
    fs.mkdirSync(colorsDir, { recursive: true });
  }

  const updatedProducts = [];
  let totalColors = 0;
  let imagesDownloaded = 0;

  for (const product of bottoms.products) {
    // Get the base product without the old colors
    const baseProduct = { ...product };
    delete baseProduct.colors;

    console.log(`${product.style}: ${product.description}`);

    const colors = await scrapeProductColors(product.style);

    if (colors && colors.length > 0) {
      console.log(`  Found ${colors.length} colors: ${colors.map(c => c.name).join(', ')}`);
      totalColors += colors.length;

      // Download images for each color
      for (const color of colors) {
        if (color.image) {
          const filename = `${product.style}-${color.code}.png`;
          const filepath = path.join(colorsDir, filename);

          // Download if not already exists
          if (!fs.existsSync(filepath)) {
            console.log(`    Downloading ${color.name}...`);
            const size = await downloadImage(color.image, filepath);
            if (size > 0) {
              imagesDownloaded++;
              console.log(`    ✓ Saved ${filename} (${(size / 1024).toFixed(1)}KB)`);
              color.image = `/images/bottoms/colors/${filename}`;
            } else {
              color.image = baseProduct.image; // Fallback
            }
          } else {
            console.log(`    ✓ ${filename} exists`);
            color.image = `/images/bottoms/colors/${filename}`;
          }
        } else {
          color.image = baseProduct.image; // Fallback
        }
      }

      updatedProducts.push({
        ...baseProduct,
        colors: colors.map(c => ({
          code: c.code,
          name: c.name,
          image: c.image
        }))
      });
    } else {
      console.log(`  No colors found, using default`);
      updatedProducts.push({
        ...baseProduct,
        colors: [{
          code: 'default',
          name: 'Default',
          image: baseProduct.image
        }]
      });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  // Update bottoms.json
  const updatedData = {
    category: bottoms.category,
    categoryName: bottoms.categoryName,
    products: updatedProducts
  };

  fs.writeFileSync(bottomsPath, JSON.stringify(updatedData, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total products: ${updatedProducts.length}`);
  console.log(`Total colors found: ${totalColors}`);
  console.log(`Images downloaded: ${imagesDownloaded}`);
  console.log(`\nUpdated ${bottomsPath}`);
}

main().catch(console.error);
