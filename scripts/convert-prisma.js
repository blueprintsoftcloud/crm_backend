#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read all controller files and convert Prisma to Mongoose
const controllersDir = path.join(__dirname, '../src/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.controller.ts'));

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Conversion patterns
  const patterns = [
    // prisma.model.findUnique({where: {id}}) -> Model.findById()
    [/await prisma\.(\w+)\.findUnique\(\{\s*where:\s*\{\s*id:\s*([^}]+)\s*\}\s*,?\s*select:\s*\{([^}]*)\}\s*\}\)/g, (match, model, id, select) => {
      return `await ${model}.findById(${id})`;
    }],
    [/await prisma\.(\w+)\.findUnique\(\{\s*where:\s*\{\s*id:\s*([^}]+)\s*\}\s*\}\)/g, (match, model, id) => {
      return `await ${model}.findById(${id})`;
    }],
    // prisma.model.findMany -> Model.find
    [/await prisma\.(\w+)\.findMany\(\s*\{/g, 'await $1.find({'],
    // prisma.model.findFirst -> Model.findOne
    [/await prisma\.(\w+)\.findFirst\(\s*\{/g, 'await $1.findOne({'],
    // prisma.model.create -> Model.create
    [/await prisma\.(\w+)\.create\(\s*\{(?:\s*data:\s*)?/g, 'await $1.create('],
    // prisma.model.update -> Model.findByIdAndUpdate
    [/await prisma\.(\w+)\.update\(\s*\{\s*where:\s*\{\s*id:\s*([^}]+)\s*\}\s*,\s*data:\s*\{/g, 'await $1.findByIdAndUpdate($2, {'],
    // prisma.model.count({where:...}) -> Model.countDocuments({...})
    [/await prisma\.(\w+)\.count\(\s*\{\s*where:/g, 'await $1.countDocuments({'],
    [/await prisma\.(\w+)\.count\(\s*\{\s*\}\s*\)/g, 'await $1.countDocuments()'],
    // prisma.model.deleteMany
    [/await prisma\.(\w+)\.deleteMany\(\s*\{/g, 'await $1.deleteMany({'],
    // prisma.model.delete
    [/await prisma\.(\w+)\.delete\(\s*\{.*?where:\s*\{\s*id:\s*([^}]+)\s*\}\s*\}\)/g, 'await $1.findByIdAndDelete($1)'],
    // prisma.model.upsert
    [/await prisma\.(\w+)\.upsert\(\s*\{\s*where:\s*\{\s*([^}:]+):\s*\{?\s*([^}]+)\s*\}?\s*\}\s*,\s*create:\s*\{([^}]*)\},\s*update:\s*\{([^}]*)\}\s*\}\)/g, 
     'await $1.findOneAndUpdate({$2: $3}, {$4 || $5}, {upsert: true, new: true})'],
    // prisma.model.deleteOne
    [/await prisma\.(\w+)\.delete\(\s*\{\s*where:\s*\{\s*([^:}]+):\s*([^}]+)\s*\}\s*\}\)/g,
     'await $1.deleteOne({$2: $3})'],
    // Remove "where:" wrappers that are now unnecessary  
    [/where:\s*\{([^}]*?)\s*,?\s*(?:include:|orderBy:|select:|take:|skip:)/g, '{$1, '],
    // Clean up include -> populate
    [/include:\s*\{([^}]*)\}/g, 'populate: {$1}'],
    // Clean up data: { at the end
    [/,\s*data:\s*\{/g, ', {'],
    // prisma.$transaction -> remove (for now, simplified handling)
    [/await prisma\.\$transaction\(\s*async\s*\(\s*tx\s*\)\s*=>\s*\{/g, 'await (async () => {'],
  ];

  patterns.forEach(([pattern, replacement]) => {
    if (typeof replacement === 'string') {
      content = content.replace(pattern, replacement);
    } else {
      content = content.replace(pattern, replacement);
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const changes = (originalContent.match(/prisma\./g) || []).length - (content.match(/prisma\./g) || []).length;
    if (changes > 0) {
      console.log(`✓ ${file}: ${changes} Prisma references converted`);
      totalReplacements += changes;
    }
  }
});

console.log(`\nTotal Prisma references converted: ${totalReplacements}`);
