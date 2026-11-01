// Strumento a mano: segnala codice che forse non serve piu'. Non cancella nulla.
import fs from "node:fs";
import path from "node:path";

const appRoot = path.resolve(process.argv[2] || ".");

function walk(root, exts, excludeDirs = []) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts === null || exts.includes(ext)) out.push(full);
      }
    }
  }
  return out;
}

function rel(p) {
  return path.relative(appRoot, p).split(path.sep).join("/");
}

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    return "";
  }
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordRe(name) {
  return new RegExp("\\b" + escRe(name) + "\\b");
}

// --- 1. Export non usati ---
const jsDir = path.join(appRoot, "js");
const jsFiles = walk(jsDir, [".js"], ["node_modules"]).sort();
const testsDir = path.join(appRoot, "tests");
const testFiles = walk(testsDir, [".js", ".mjs"], ["node_modules"]).sort();

const indexHtmlPath = path.join(appRoot, "index.html");
const swJsPath = path.join(appRoot, "sw.js");
const indexHtml = readText(indexHtmlPath);
const swJs = readText(swJsPath);

// Raccolta export: { file, name }
const exportsList = [];
const exportPatterns = [
  /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
  /export\s+const\s+([A-Za-z_$][\w$]*)/g,
  /export\s+class\s+([A-Za-z_$][\w$]*)/g,
];
for (const file of jsFiles) {
  const content = readText(file);
  const found = new Set();
  for (const re of exportPatterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) found.add(m[1]);
  }
  // export { a, b } e export { a as b }
  const braceRe = /export\s*\{\s*([^}]+)\s*\}/g;
  let bm;
  while ((bm = braceRe.exec(content)) !== null) {
    const parts = bm[1].split(",");
    for (const part of parts) {
      const t = part.trim();
      if (!t) continue;
      const am = t.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (am) found.add(am[2] || am[1]);
    }
  }
  for (const name of found) exportsList.push({ file, name });
}

// Corpus per uso export: altri file js, tests, index.html, sw.js
function exportUsageCorpus(currentFile) {
  const files = [];
  for (const f of jsFiles) if (path.resolve(f) !== path.resolve(currentFile)) files.push(f);
  for (const f of testFiles) files.push(f);
  files.push(indexHtmlPath, swJsPath);
  return files;
}

const unusedExports = [];
for (const item of exportsList) {
  const corpus = exportUsageCorpus(item.file);
  let used = false;
  for (const f of corpus) {
    const content = readText(f);
    if (wordRe(item.name).test(content)) {
      used = true;
      break;
    }
  }
  if (!used) unusedExports.push(item);
}
unusedExports.sort((a, b) => (rel(a.file) + a.name).localeCompare(rel(b.file) + b.name));

// --- 2. File .js sotto js/ mai importati ---
const mainJsPath = path.join(jsDir, "main.js");
// Corpus per import: tutti i .js della root, i .mjs/.js dei test, index.html, sw.js
const rootJsFiles = walk(appRoot, [".js"], ["node_modules"]).sort();
const importCorpus = [...rootJsFiles, ...testFiles];
if (fs.existsSync(indexHtmlPath)) importCorpus.push(indexHtmlPath);
if (fs.existsSync(swJsPath)) importCorpus.push(swJsPath);

function importSpecifiers(content) {
  const specs = [];
  const patterns = [
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(content)) !== null) specs.push(m[1]);
  }
  return specs;
}

const unusedFiles = [];
for (const file of jsFiles) {
  if (path.resolve(file) === path.resolve(mainJsPath)) continue;
  const base = path.basename(file, ".js");
  let imported = false;
  for (const corpusFile of importCorpus) {
    if (path.resolve(corpusFile) === path.resolve(file)) continue;
    const content = readText(corpusFile);
    const specs = importSpecifiers(content);
    if (specs.some((spec) => path.basename(spec, path.extname(spec)) === base)) {
      imported = true;
      break;
    }
  }
  if (!imported) unusedFiles.push(file);
}
unusedFiles.sort();

// --- 3. Classi CSS non trovate ---
const cssAppPath = path.join(appRoot, "css", "app.css");
const cssContent = readText(cssAppPath);
const cssClasses = new Set();
const classRe = /\.([A-Za-z_][\w-]*)/g;
let cm;
while ((cm = classRe.exec(cssContent)) !== null) cssClasses.add(cm[1]);

// Codice in cui cercare: js + index.html
const codeCorpus = [...jsFiles.map(readText), indexHtml].join("\n");
const unusedClasses = [];
for (const cls of cssClasses) {
  if (!wordRe(cls).test(codeCorpus)) unusedClasses.push(cls);
}
unusedClasses.sort();

// --- 4. Risorse non usate ---
const assetsDir = path.join(appRoot, "assets");
const assetFiles = walk(assetsDir, null, ["node_modules"]).sort();

// Corpus per risorse: tutti i .js, .json sotto data/, .css, index.html, manifest, sw.js
const dataDir = path.join(appRoot, "data");
const dataJsonFiles = walk(dataDir, [".json"], ["node_modules"]);
const cssFiles = walk(appRoot, [".css"], ["node_modules"]);
const manifestPath = path.join(appRoot, "manifest.webmanifest");
const resourceCorpusFiles = [...rootJsFiles, ...dataJsonFiles, ...cssFiles];
if (fs.existsSync(indexHtmlPath)) resourceCorpusFiles.push(indexHtmlPath);
if (fs.existsSync(manifestPath)) resourceCorpusFiles.push(manifestPath);
if (fs.existsSync(swJsPath)) resourceCorpusFiles.push(swJsPath);
const resourceCorpus = resourceCorpusFiles.map(readText).join("\n");

const unusedAssets = [];
for (const file of assetFiles) {
  const name = path.basename(file);
  if (!resourceCorpus.includes(name)) unusedAssets.push(file);
}
unusedAssets.sort();

// --- Output ---
console.log("Export non usati");
for (const item of unusedExports) {
  console.log("  " + rel(item.file) + ": " + item.name);
}

console.log("");
console.log("File mai importati");
for (const file of unusedFiles) {
  console.log("  " + rel(file));
}

console.log("");
console.log("Classi CSS non trovate nel codice");
for (const cls of unusedClasses) {
  console.log("  ." + cls);
}
console.log("  (alcune possono essere composte da stringhe)");

console.log("");
console.log("Risorse non usate");
for (const file of unusedAssets) {
  console.log("  " + rel(file));
}

console.log("");
console.log("Riepilogo");
console.log("  Export non usati: " + unusedExports.length);
console.log("  File mai importati: " + unusedFiles.length);
console.log("  Classi CSS non trovate: " + unusedClasses.length);
console.log("  Risorse non usate: " + unusedAssets.length);
console.log("Controllare a mano prima di togliere qualcosa: il programma può sbagliare");

process.exit(0);