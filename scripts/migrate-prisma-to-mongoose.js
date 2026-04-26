#!/usr/bin/env node

/**
 * Mass migration script: Prisma → Mongoose
 * Converts all controller files from Prisma syntax to Mongoose equivalents
 */

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '../controllers');

// Mapping of Prisma patterns to Mongoose equivalents
const replacements = [
  // Import statements
  {
    find: /import { prisma } from ["']\.\.\/config\/database["'];?/g,
    replace: (match) => {
      // Determine what to import based on context
      return `// Mongoose models will be imported from ../config/database`;
    },
  },
  {
    find: /import { Prisma } from ["'](\.\.\/)?generated\/prisma\/client["'];?/g,
    replace: '',
  },
  // prisma.model.findUnique() → Model.findById() or Model.findOne()
  {
    find: /await prisma\.(\w+)\.findUnique\(\{\s*where:\s*{\s*id:\s*(\w+)\s*}\s*[,}]/g,
    replace: 'await Model.findById($2)',
  },
];

const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.controller.ts'));
console.log(`Found ${files.length} controller files`);

files.forEach((file) => {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let changed = false;
  replacements.forEach(({ find, replace }) => {
    const newContent = content.replace(find, replace);
    if (newContent !== content) {
      changed = true;
      content = newContent;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${file}`);
  }
});
