const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src/generated');
const outDir = path.resolve(__dirname, '../dist/generated');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }

  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  copyRecursive(srcDir, outDir);
  console.log(`Copied generated files from ${srcDir} to ${outDir}`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
