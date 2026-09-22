import fs from 'fs';
import path from 'path';

function removeVerboseComments(content) {
  let newContent = content;

  // 1. Remove // ---- dividers (handling \r\n and \n)
  newContent = newContent.replace(/^\s*\/\/\s*-+\s*\r?\n/gm, '');

  // 2. Remove multi-line block comments with ── in JSX
  // e.g. {/* ── ... ── */}
  newContent = newContent.replace(/\{\/\*[\s\S]*?──[\s\S]*?\*\/\}/g, '');

  // 3. Remove multi-line block comments with ── in regular JS
  // e.g. /* ── ... ── */
  newContent = newContent.replace(/\/\*[\s\S]*?──[\s\S]*?\*\//g, '');

  // 4. Remove purely structural single-line JSX comments that are short
  newContent = newContent.replace(/^\s*\{\/\*\s*[a-zA-Z0-9_\- ]{1,40}\s*\*\/\}\s*\r?\n/gm, '');

  // 5. Remove short structural line comments
  newContent = newContent.replace(/^\s*\/\/\s*[a-zA-Z0-9_\- ]{1,30}\s*\r?\n/gm, '');

  // 6. Convert multi-line JSDoc comments to single line
  // Find /** ... */
  newContent = newContent.replace(/\/\*\*([\s\S]*?)\*\//g, (match, inner) => {
    // Strip newlines and * from the inner text
    let singleLineText = inner.replace(/\r?\n\s*\*\s*/g, ' ').replace(/\r?\n\s*/g, ' ').trim();
    // Keep it short, remove extra spaces
    singleLineText = singleLineText.replace(/\s{2,}/g, ' ');
    return `/** ${singleLineText} */`;
  });

  // 7. Remove any multi-line JSX comments that are just formatting or notes
  // (We'll safely remove any JSX comment that contains a newline, as most are structural)
  newContent = newContent.replace(/\{\/\*[\s\S]*?\n[\s\S]*?\*\/\}/g, '');

  // 8. Remove any multi-line JS block comments that aren't JSDoc (i.e. /* but not /**)
  newContent = newContent.replace(/(?<!\/)\/\*(?!\*)[\s\S]*?\*\//g, '');

  // Clean up any double blank lines left behind
  newContent = newContent.replace(/\r?\n\s*\r?\n\s*\r?\n/g, '\n\n');

  return newContent;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const newContent = removeVerboseComments(content);
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated comments in: ${fullPath}`);
      }
    }
  }
}

const frontendDir = path.join(process.cwd(), 'frontend', 'src');
const backendDir = path.join(process.cwd(), 'backend', 'src');

processDirectory(frontendDir);
processDirectory(backendDir);

console.log("Deep comment removal and compression complete!");
