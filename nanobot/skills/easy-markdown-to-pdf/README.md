# easy-markdown-to-pdf

Convert markdown to PDF without sudo requirements. Uses Mermaid CLI + Chrome headless.

## Quick Start

```bash
# Basic conversion (recommended - uses Node.js)
./easy-convert.sh input.md output.pdf

# With table of contents
./easy-convert.sh input.md output.pdf --toc

# With professional theme
./easy-convert.sh input.md output.pdf --toc --theme=professional

# Dark theme
./easy-convert.sh input.md output.pdf --theme=dark

# Or use Node.js directly
node converter.js input.md output.pdf --toc --theme=light
```

## Installation

No manual installation needed! Dependencies are automatically installed:
- Node.js (via Homebrew)
- marked, highlight.js (via npm) - for markdown parsing
- mermaid-cli (via npm) - for diagram rendering
- Google Chrome (usually pre-installed)

## Options

```bash
--toc              # Generate table of contents
--theme=THEME      # light (default), dark, minimal, professional
--landscape        # Landscape orientation
--no-mermaid       # Skip mermaid rendering
--keep-temp        # Keep temp files for debugging
--css=FILE         # Custom CSS file
```

## Features

✅ No sudo required
✅ Automatic mermaid diagram rendering
✅ Professional styling (4 themes)
✅ Table of contents generation
✅ Full Unicode support
✅ Syntax highlighting for code

## Examples

```bash
# Technical documentation
./easy-convert.sh architecture.md architecture.pdf --toc --theme=professional

# API docs with diagrams
./easy-convert.sh api-docs.md api-docs.pdf --toc --theme=light

# Dark mode
./easy-convert.sh README.md README.pdf --toc --theme=dark

# Professional style
./easy-convert.sh report.md report.pdf --toc --theme=professional
```

## Mermaid Support

Mermaid diagrams are automatically detected and rendered:

```markdown
# System Architecture

```mermaid
graph LR
    A[Frontend] --> B[Backend]
    B --> C[Database]
```
```

No additional steps needed!

## Troubleshooting

**Chrome not found:**
```bash
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

**Keep temp files for debugging:**
```bash
./easy-convert.sh input.md output.pdf --keep-temp
```

## Testing

```bash
# Run comprehensive test
./test-simple.sh

# This will create a test document and convert it
# Open the generated PDF to verify everything works
```

## See Also

- Full documentation: [SKILL.md](SKILL.md)
- Mermaid syntax: https://mermaid.js.org/
- Node.js converter: `converter.js`
