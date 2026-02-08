---
name: markdown-to-pdf
description: Convert markdown files to professionally formatted PDF documents using Pandoc
dependencies:
  - pandoc
  - pdflatex (texlive or similar TeX distribution)
---

# markdown-to-pdf

Convert markdown files to professionally formatted PDF documents using Pandoc with LaTeX rendering.

## Prerequisites

**Automatic Installation:** All dependencies are automatically installed when you run the conversion script. No manual setup required!

The script will automatically install:
- **pandoc** - Markdown to PDF converter (via Homebrew)
- **BasicTeX** - Lightweight LaTeX distribution for PDF rendering (via Homebrew)
- **mermaid-cli** - Diagram rendering tool (via npm, when using `--render-mermaid`)
- **Node.js** - Required for mermaid-cli (via Homebrew, if needed)

To manually verify installed dependencies:
```bash
# Check pandoc
which pandoc

# Check pdflatex (should be in /Library/TeX/texbin or similar)
which pdflatex

# Check xelatex (better Unicode support)
which xelatex

# Check mermaid-cli (for diagram rendering)
which mmdc

# Check versions
pandoc --version
pdflatex --version
xelatex --version
mmdc --version
```

## PDF Engines

Pandoc supports multiple LaTeX engines for PDF generation:

### pdflatex (default)
- **Best for:** Standard documents with ASCII/Latin characters
- **Pros:** Fast, widely compatible, good for simple documents
- **Cons:** Limited Unicode support, struggles with emojis and complex scripts
- **Use when:** Document uses standard English text

### xelatex (recommended for Unicode)
- **Best for:** Documents with Unicode characters, international text
- **Pros:** Excellent Unicode support, handles most special characters
- **Cons:** Slightly slower than pdflatex, emojis still may not display
- **Use when:** Document contains Unicode characters, international text, or special symbols

### lualatex
- **Best for:** Advanced LaTeX features, scripting
- **Pros:** Modern engine, good Unicode support, extensible
- **Cons:** Slower than pdflatex
- **Use when:** Need advanced LaTeX features or Lua scripting

**Recommendation:** Use `xelatex` for most modern documents, especially those with Unicode content.

## Usage

### Basic Conversion

Convert a markdown file to PDF:
```bash
~/.claude/skills/markdown-to-pdf/scripts/convert.sh input.md output.pdf
```

Or use pandoc directly:
```bash
# Default engine (pdflatex)
pandoc input.md -o output.pdf --pdf-engine=pdflatex

# With Unicode support (xelatex - recommended)
pandoc input.md -o output.pdf --pdf-engine=xelatex
```

### With Custom Styling

```bash
pandoc input.md -o output.pdf \
  --pdf-engine=pdflatex \
  --variable=geometry:margin=1in \
  --variable=fontsize=11pt \
  --variable=documentclass=article
```

### Advanced Options

**Table of contents:**
```bash
pandoc input.md -o output.pdf \
  --pdf-engine=pdflatex \
  --toc \
  --toc-depth=2
```

**Custom fonts and styling:**
```bash
pandoc input.md -o output.pdf \
  --pdf-engine=pdflatex \
  --variable=mainfont:"Times New Roman" \
  --variable=fontsize=12pt \
  --variable=geometry:margin=1.5in \
  --variable=linestretch=1.5
```

**Syntax highlighting for code blocks:**
```bash
pandoc input.md -o output.pdf \
  --pdf-engine=pdflatex \
  --highlight-style=tango
```

**With custom LaTeX template:**
```bash
pandoc input.md -o output.pdf \
  --pdf-engine=pdflatex \
  --template=template.tex
```

## Common Options

- `--toc` - Generate table of contents
- `--toc-depth=N` - TOC depth (default: 3)
- `--number-sections` - Number section headings
- `--variable=KEY:VALUE` - Set LaTeX variables
- `--highlight-style=STYLE` - Code highlighting theme (pygments, tango, espresso, etc.)
- `--listings` - Use listings package for code blocks
- `--metadata=KEY:VALUE` - Set metadata (title, author, date)

## Geometry Options

Control page layout with `--variable=geometry:OPTIONS`:
- `margin=1in` - All margins
- `left=1.5in,right=1in` - Specific margins
- `a4paper` - Paper size
- `landscape` - Landscape orientation

## Document Classes

Use `--variable=documentclass:CLASS`:
- `article` - Default, for shorter documents
- `report` - For longer documents with chapters
- `book` - For books with front/back matter
- `memoir` - Enhanced book class

## Special Content

### Handling Unicode Characters

For documents with Unicode characters (accented letters, international text, special symbols):

```bash
# Use xelatex instead of pdflatex
pandoc input.md -o output.pdf \
  --pdf-engine=xelatex \
  --toc \
  --number-sections \
  --variable=geometry:margin=1in
```

### Handling Emojis

**Warning:** Emojis (👤, 🚀, 📝, etc.) are not supported by standard LaTeX fonts.

**Options:**
1. **Remove emojis** before conversion (cleanest approach)
2. **Use xelatex** - conversion succeeds but emojis won't display
3. **Replace with text** - Use descriptive text instead: `[User Icon]`, `[Rocket]`

**Example cleanup:**
```bash
# Remove emojis before conversion
sed 's/[😀-🙏🚀-🛿]//g' input.md > cleaned.md
pandoc cleaned.md -o output.pdf --pdf-engine=xelatex
```

### Mermaid Diagrams

Pandoc doesn't natively render mermaid diagrams. Four approaches:

**Approach 1: Automated rendering (recommended - Automatic!)**
```bash
# No installation needed! Dependencies are automatically installed
# Just use the --render-mermaid flag

# Convert with automatic mermaid rendering
~/.claude/skills/markdown-to-pdf/scripts/convert.sh input.md output.pdf \
  --render-mermaid \
  --engine=xelatex \
  --toc

# The script will:
# 1. Auto-install mermaid-cli and Node.js if needed
# 2. Detect all ```mermaid blocks
# 3. Render each to PNG
# 4. Replace with image references
# 5. Convert to PDF
# 6. Clean up temp files
```

**Approach 2: Manual pre-render (best quality control)**
```bash
# If mermaid-cli isn't installed yet, it will be auto-installed
# when you use --render-mermaid in the main script

# Extract mermaid code to separate file
# Then render to PNG
mmdc -i diagram.mmd -o diagram.png -b transparent

# Replace mermaid code block in markdown with:
# ![System Architecture](diagram.png)

# Then convert to PDF
pandoc updated.md -o output.pdf --pdf-engine=xelatex
```

**Approach 3: Keep code visible (for reference)**
```bash
# Just convert - mermaid code will appear as code block
pandoc input.md -o output.pdf \
  --pdf-engine=xelatex \
  --highlight-style=tango
```

**Approach 4: Use mermaid.live**
1. Copy mermaid code
2. Paste into https://mermaid.live
3. Export as PNG/SVG
4. Insert image into markdown
5. Convert to PDF

### Math Equations

LaTeX math notation is fully supported:

```markdown
Inline math: $E = mc^2$

Display math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### Code Blocks with Syntax Highlighting

```bash
pandoc input.md -o output.pdf \
  --pdf-engine=xelatex \
  --highlight-style=tango \
  --variable=geometry:margin=1in
```

Available highlight styles:
- `pygments` (default)
- `tango` (recommended)
- `espresso`
- `kate`
- `monochrome`
- `breezedark`
- `haddock`

## Examples

### Professional Report
```bash
pandoc report.md -o report.pdf \
  --pdf-engine=pdflatex \
  --toc \
  --number-sections \
  --variable=geometry:margin=1in \
  --variable=fontsize=11pt \
  --variable=documentclass=report \
  --metadata=title:"Quarterly Report" \
  --metadata=author:"Your Name" \
  --metadata=date:"2026-02-07"
```

### Academic Paper
```bash
pandoc paper.md -o paper.pdf \
  --pdf-engine=pdflatex \
  --toc \
  --number-sections \
  --variable=geometry:margin=1.25in \
  --variable=fontsize=12pt \
  --variable=linestretch=2 \
  --variable=documentclass=article
```

### Technical Documentation
```bash
pandoc docs.md -o docs.pdf \
  --pdf-engine=pdflatex \
  --toc \
  --toc-depth=3 \
  --number-sections \
  --highlight-style=tango \
  --variable=geometry:margin=1in \
  --variable=fontsize=10pt
```

### Architecture Document with Mermaid Diagrams
```bash
# Dependencies are automatically installed (mermaid-cli, Node.js if needed)
~/.claude/skills/markdown-to-pdf/scripts/convert.sh architecture.md architecture.pdf \
  --render-mermaid \
  --engine=xelatex \
  --toc \
  --number-sections \
  --variable=geometry:margin=1in \
  --variable=fontsize=11pt
```

## Troubleshooting

**Note:** Most dependency issues are automatically resolved by the script. It will install pandoc, BasicTeX, Node.js, and mermaid-cli as needed.

**"pdflatex not found" (if auto-install failed):**
- The script automatically adds /Library/TeX/texbin to PATH
- If still missing, manually verify: `which pdflatex`
- Manual fix: `export PATH="/Library/TeX/texbin:$PATH"`

**"! LaTeX Error: File `*.sty' not found":**
- Install missing LaTeX packages via TeX Live Manager
- On macOS: `sudo tlmgr install <package-name>`

**Unicode/UTF-8 errors with pdflatex:**
- **Solution 1 (Recommended):** Switch to xelatex:
  ```bash
  pandoc input.md -o output.pdf --pdf-engine=xelatex
  ```
- **Solution 2:** Add to markdown frontmatter:
  ```yaml
  ---
  header-includes:
    - \usepackage[utf8]{inputenc}
  ---
  ```

**Emojis not displaying in PDF:**
- **Root cause:** Standard LaTeX fonts don't include emoji glyphs
- **Workaround:** Use xelatex (emojis will be skipped but conversion succeeds)
- **Best solution:** Remove emojis or replace with text equivalents before conversion
- **Example:** `👤 User` → `User` or `[User]`

**Mermaid diagrams not rendering:**
- **Root cause:** Pandoc doesn't render mermaid code blocks natively
- **What happens:** Mermaid code appears as a code block in the PDF
- **Solution 1 (Easiest - Automated):** Use the --render-mermaid flag:
  ```bash
  # mermaid-cli is automatically installed if needed!
  # Just use the --render-mermaid flag
  ~/.claude/skills/markdown-to-pdf/scripts/convert.sh input.md output.pdf \
    --render-mermaid --engine=xelatex --toc
  ```
- **Solution 2 (Manual):** Use mermaid-cli to pre-render diagrams:
  ```bash
  # Render diagram to PNG
  mmdc -i diagram.mmd -o diagram.png

  # Replace mermaid code block with image in markdown
  # ![Architecture Diagram](diagram.png)
  ```
- **Solution 3:** Use online tools like mermaid.live to export diagrams
- **Solution 4:** Keep mermaid code visible (useful for documentation)

**Chinese/Japanese/Korean characters not displaying:**
- Use xelatex with CJK font support:
  ```bash
  pandoc input.md -o output.pdf \
    --pdf-engine=xelatex \
    --variable=CJKmainfont:"PingFang SC"
  ```

**Images not showing:**
- Use relative paths from the markdown file location
- Supported formats: PNG, JPG, PDF
- Example: `![Caption](images/figure1.png)`
- Ensure images exist at the specified path

## Markdown Front Matter

Add metadata to your markdown file:
```markdown
---
title: "Document Title"
author: "Your Name"
date: "2026-02-07"
abstract: "This is a brief summary of the document."
---

# Chapter 1

Content here...
```

## Tips

1. **Test first**: Convert a simple markdown file to verify setup
2. **Use absolute paths**: When running from scripts, use full paths to input/output files
3. **Check logs**: Pandoc outputs detailed error messages if conversion fails
4. **Preview**: Open generated PDFs immediately to verify formatting
5. **Templates**: Save common pandoc command combinations as shell scripts

## Related Commands

- Convert to other formats: `pandoc input.md -o output.docx` (Word)
- Convert to other formats: `pandoc input.md -o output.html` (HTML)
- Merge multiple files: `pandoc file1.md file2.md -o combined.pdf`
- From stdin: `echo "# Hello" | pandoc -o output.pdf`

## Notes

- Pandoc uses LaTeX as intermediate format for PDF generation
- First run may be slow (LaTeX package loading)
- Complex LaTeX in markdown is supported
- Math notation: Use `$inline$` or `$$display$$` syntax
- Citations: Supported via `--bibliography=refs.bib`

## Resources

- Pandoc User's Guide: https://pandoc.org/MANUAL.html
- LaTeX Symbols: http://www.stdout.org/~winston/latex/latexsheet.pdf
- Markdown Guide: https://www.markdownguide.org/
