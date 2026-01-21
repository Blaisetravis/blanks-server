const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/images');
const DATA_DIR = path.join(__dirname, '../data');

// Find all PNG files recursively
function findPngFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPngFiles(fullPath, files);
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Convert a single PNG to WebP
async function convertToWebp(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, '.webp');

  try {
    await sharp(pngPath)
      .webp({ quality: 85 }) // Good balance of quality and size
      .toFile(webpPath);

    // Get file sizes for reporting
    const pngSize = fs.statSync(pngPath).size;
    const webpSize = fs.statSync(webpPath).size;
    const savings = ((1 - webpSize / pngSize) * 100).toFixed(1);

    return { pngPath, webpPath, pngSize, webpSize, savings, success: true };
  } catch (error) {
    return { pngPath, error: error.message, success: false };
  }
}

// Update JSON files to use .webp extension
function updateJsonFiles() {
  const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = path.join(DATA_DIR, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace all .png references with .webp
    const updated = content.replace(/\.png"/g, '.webp"');

    if (content !== updated) {
      fs.writeFileSync(filePath, updated);
      console.log(`Updated: ${file}`);
    }
  }
}

// Delete original PNG files
function deletePngFiles(pngPaths) {
  for (const pngPath of pngPaths) {
    try {
      fs.unlinkSync(pngPath);
    } catch (error) {
      console.error(`Failed to delete ${pngPath}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('Finding PNG files...');
  const pngFiles = findPngFiles(IMAGES_DIR);
  console.log(`Found ${pngFiles.length} PNG files\n`);

  console.log('Converting to WebP...');
  let totalPngSize = 0;
  let totalWebpSize = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pngFiles.length; i++) {
    const result = await convertToWebp(pngFiles[i]);

    if (result.success) {
      totalPngSize += result.pngSize;
      totalWebpSize += result.webpSize;
      successCount++;
      const relativePath = path.relative(IMAGES_DIR, result.pngPath);
      console.log(`[${i + 1}/${pngFiles.length}] ${relativePath} - ${result.savings}% smaller`);
    } else {
      failCount++;
      console.error(`[${i + 1}/${pngFiles.length}] FAILED: ${result.pngPath} - ${result.error}`);
    }
  }

  console.log('\n--- Conversion Summary ---');
  console.log(`Converted: ${successCount}/${pngFiles.length} files`);
  console.log(`Original size: ${(totalPngSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`WebP size: ${(totalWebpSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total savings: ${((1 - totalWebpSize / totalPngSize) * 100).toFixed(1)}%`);

  if (failCount > 0) {
    console.log(`\n${failCount} files failed to convert. Aborting cleanup.`);
    return;
  }

  console.log('\nUpdating JSON data files...');
  updateJsonFiles();

  console.log('\nDeleting original PNG files...');
  deletePngFiles(pngFiles);

  console.log('\nDone! All images converted to WebP.');
}

main().catch(console.error);
