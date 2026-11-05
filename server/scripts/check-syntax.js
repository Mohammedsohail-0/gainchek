const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const serverDir = path.resolve(__dirname, '..');
const srcDir = path.join(serverDir, 'src');

function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const dirent of list) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(getJsFiles(fullPath));
    } else if (dirent.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getJsFiles(srcDir);
let errors = 0;

console.log(`Checking syntax for ${files.length} server files...`);
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    console.error(`Syntax error in ${path.relative(serverDir, file)}:`, err.stderr?.toString() || err.message);
    errors++;
  }
}

if (errors > 0) {
  console.error(`Found ${errors} syntax errors.`);
  process.exit(1);
} else {
  console.log(`✓ All ${files.length} server files passed syntax check.`);
}
