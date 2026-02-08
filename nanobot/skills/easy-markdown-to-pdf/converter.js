#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Check if marked is installed
let marked, markedHighlight, hljs;
try {
  ({ marked } = require('marked'));
  ({ markedHighlight } = require('marked-highlight'));
  hljs = require('highlight.js');
} catch (e) {
  console.log('Installing dependencies...');
  execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
  ({ marked } = require('marked'));
  ({ markedHighlight } = require('marked-highlight'));
  hljs = require('highlight.js');
}

// Configuration
const config = {
  toc: false,
  theme: 'light',
  landscape: false,
  renderMermaid: true,
  keepTemp: false,
  customCss: null
};

// CSS Themes
const themes = {
  light: `
    @page { size: A4; margin: 1in; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: white;
    }
    h1 { color: #1e40af; font-size: 32px; border-bottom: 4px solid #3b82f6; padding-bottom: 15px; }
    h2 { color: #3b82f6; font-size: 24px; margin-top: 40px; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
    h3 { color: #6366f1; font-size: 18px; margin-top: 25px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: "SF Mono", Monaco, monospace; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
    img { max-width: 100%; height: auto; border: 2px solid #e5e7eb; border-radius: 8px; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    th { background: #f9fafb; font-weight: bold; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 15px; color: #6b7280; margin: 20px 0; }
    .toc { background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 25px 0; }
    .toc ul { list-style: none; padding-left: 0; }
    .toc a { color: #3b82f6; text-decoration: none; }
  `,
  dark: `
    @page { size: A4; margin: 1in; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #e0e0e0;
      padding: 20px;
      background: #1e1e1e;
    }
    h1 { color: #60a5fa; font-size: 32px; border-bottom: 4px solid #3b82f6; padding-bottom: 15px; }
    h2 { color: #60a5fa; font-size: 24px; margin-top: 40px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
    h3 { color: #818cf8; font-size: 18px; margin-top: 25px; }
    code { background: #2d2d2d; padding: 2px 6px; border-radius: 3px; font-family: "SF Mono", Monaco, monospace; color: #e0e0e0; }
    pre { background: #0d1117; color: #c9d1d9; padding: 15px; border-radius: 5px; overflow-x: auto; }
    img { max-width: 100%; height: auto; border: 2px solid #374151; border-radius: 8px; margin: 20px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #374151; padding: 8px; text-align: left; }
    th { background: #2d2d2d; font-weight: bold; }
  `,
  professional: `
    @page { size: A4; margin: 1.25in; }
    body {
      font-family: "Times New Roman", Times, serif;
      line-height: 1.8;
      color: #2c3e50;
      padding: 20px;
      background: white;
    }
    h1 { color: #2c3e50; font-size: 28px; text-align: center; border-bottom: 3px double #34495e; padding-bottom: 15px; }
    h2 { color: #34495e; font-size: 22px; margin-top: 35px; border-bottom: 1px solid #95a5a6; padding-bottom: 8px; }
    code { background: #ecf0f1; padding: 2px 6px; font-family: "Courier New", monospace; }
    img { max-width: 100%; height: auto; border: 1px solid #bdc3c7; margin: 20px auto; display: block; }
  `
};

// Configure marked with syntax highlighting
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

async function renderMermaidDiagrams(markdown, tempDir) {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  let result = markdown;
  let diagramCount = 0;

  const matches = [];
  while ((match = mermaidRegex.exec(markdown)) !== null) {
    matches.push(match);
  }

  for (const match of matches) {
    diagramCount++;
    const mermaidCode = match[1];
    const mmdFile = path.join(tempDir, `diagram_${diagramCount}.mmd`);
    const pngFile = path.join(tempDir, `diagram_${diagramCount}.png`);

    fs.writeFileSync(mmdFile, mermaidCode);

    try {
      await execAsync(`mmdc -i "${mmdFile}" -o "${pngFile}" -b transparent -w 3200`);
      result = result.replace(match[0], `![Diagram ${diagramCount}](${pngFile})`);
      console.log(`✓ Rendered diagram ${diagramCount}`);
    } catch (error) {
      console.log(`⚠ Failed to render diagram ${diagramCount}, keeping as code`);
    }
  }

  return result;
}

function generateTOC(markdown) {
  const lines = markdown.split('\n');
  const toc = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      const heading = match[1];
      const anchor = heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      toc.push(`- [${heading}](#${anchor})`);
    }
  }

  if (toc.length === 0) return '';

  return `## Table of Contents\n\n${toc.join('\n')}\n\n---\n\n`;
}

async function convertMarkdownToHTML(inputFile, outputFile, tempDir) {
  console.log(`\nConverting: ${path.basename(inputFile)} → ${path.basename(outputFile)}`);

  // Read markdown
  let markdown = fs.readFileSync(inputFile, 'utf8');

  // Process mermaid diagrams
  if (config.renderMermaid) {
    console.log('Processing mermaid diagrams...');
    markdown = await renderMermaidDiagrams(markdown, tempDir);
  }

  // Generate TOC
  if (config.toc) {
    const tocMarkdown = generateTOC(markdown);
    markdown = markdown.replace(/^#\s+(.+)$/m, (match) => `${match}\n\n${tocMarkdown}`);
  }

  // Convert to HTML
  const htmlBody = marked.parse(markdown);

  // Extract title
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : path.basename(inputFile, '.md');

  // Get CSS
  let css = themes[config.theme] || themes.light;
  if (config.customCss && fs.existsSync(config.customCss)) {
    css += '\n' + fs.readFileSync(config.customCss, 'utf8');
  }

  // Add highlight.js CSS
  const hljsCss = fs.readFileSync(
    path.join(__dirname, 'node_modules/highlight.js/styles/github-dark.css'),
    'utf8'
  );

  // Create HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
${css}
${hljsCss}
    </style>
</head>
<body>
    ${htmlBody}
</body>
</html>`;

  // Write HTML
  const htmlFile = path.join(tempDir, 'output.html');
  fs.writeFileSync(htmlFile, html);
  console.log('✓ HTML generated');

  // Convert to PDF
  await htmlToPDF(htmlFile, outputFile);
}

async function htmlToPDF(htmlFile, outputFile) {
  console.log('Converting HTML to PDF...');

  // Find Chrome
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium'
  ];

  let chromePath = process.env.CHROME_PATH;
  if (!chromePath) {
    chromePath = chromePaths.find(p => fs.existsSync(p));
  }

  if (!chromePath) {
    throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH');
  }

  const landscapeFlag = config.landscape ? '--landscape' : '';

  try {
    await execAsync(
      `"${chromePath}" --headless --disable-gpu --print-to-pdf="${outputFile}" ${landscapeFlag} --no-margins "file://${htmlFile}"`
    );

    const stats = fs.statSync(outputFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✓ PDF generated: ${outputFile} (${sizeMB} MB)`);
  } catch (error) {
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`Usage: node converter.js <input.md> <output.pdf> [options]

Options:
  --toc              Generate table of contents
  --theme=THEME      Theme: light (default), dark, professional
  --landscape        Landscape orientation
  --no-mermaid       Skip mermaid rendering
  --keep-temp        Keep temporary files
  --css=FILE         Custom CSS file
`);
    process.exit(1);
  }

  const inputFile = path.resolve(args[0]);
  const outputFile = path.resolve(args[1]);

  // Parse options
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--toc') config.toc = true;
    else if (arg.startsWith('--theme=')) config.theme = arg.split('=')[1];
    else if (arg === '--landscape') config.landscape = true;
    else if (arg === '--no-mermaid') config.renderMermaid = false;
    else if (arg === '--keep-temp') config.keepTemp = true;
    else if (arg.startsWith('--css=')) config.customCss = arg.split('=')[1];
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'easy-md-pdf-'));

  try {
    await convertMarkdownToHTML(inputFile, outputFile, tempDir);
    console.log('\n✅ Conversion complete!');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    if (!config.keepTemp) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } else {
      console.log(`\nTemp files: ${tempDir}`);
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { convertMarkdownToHTML };
