#!/bin/bash

set -euo pipefail

# Test script for easy-markdown-to-pdf

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test"

echo "Creating test markdown file..."

mkdir -p "$TEST_DIR"

cat > "$TEST_DIR/test-document.md" <<'EOF'
# Test Document for easy-markdown-to-pdf

This is a test document to verify the conversion process.

## Features to Test

This document tests the following features:

1. **Headers** - Multiple levels
2. **Bold and italic** text formatting
3. **Code blocks** with syntax highlighting
4. **Mermaid diagrams** - Auto-rendered
5. **Images** - If you have any
6. **Lists** - Ordered and unordered
7. **Links** - Internal and external

## Code Example

Here's a simple TypeScript function:

```typescript
function greet(name: string): string {
    return `Hello, ${name}!`;
}

console.log(greet("World"));
```

## Mermaid Diagram

```mermaid
graph TB
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
    C --> E[Done]
```

## System Architecture

```mermaid
graph LR
    subgraph Frontend
        A[React App]
    end

    subgraph Backend
        B[API Server]
        C[Database]
    end

    A --> B
    B --> C
```

## Lists

### Unordered List
- First item
- Second item
  - Nested item
  - Another nested
- Third item

### Ordered List
1. Step one
2. Step two
3. Step three

## Links

- [Google](https://google.com)
- [GitHub](https://github.com)

## Inline Code

Use the `convert.sh` script with `--toc` flag for table of contents.

## Blockquote

> This is a quote to test blockquote formatting.
> It can span multiple lines.

---

## Conclusion

If you can see this document properly formatted as a PDF with:
- ✅ Proper headers and styling
- ✅ Rendered mermaid diagrams
- ✅ Syntax-highlighted code
- ✅ All text formatting

Then the conversion is working correctly!

---

**Generated:** $(date)
**Version:** 1.0
EOF

echo "✓ Test markdown created: $TEST_DIR/test-document.md"
echo ""
echo "Running conversions..."
echo ""

# Test 1: Basic conversion
echo "Test 1: Basic conversion (light theme)"
"$SCRIPT_DIR/convert.sh" "$TEST_DIR/test-document.md" "$TEST_DIR/test-basic.pdf"
echo ""

# Test 2: With TOC
echo "Test 2: With table of contents"
"$SCRIPT_DIR/convert.sh" "$TEST_DIR/test-document.md" "$TEST_DIR/test-with-toc.pdf" --toc
echo ""

# Test 3: Dark theme
echo "Test 3: Dark theme with TOC"
"$SCRIPT_DIR/convert.sh" "$TEST_DIR/test-document.md" "$TEST_DIR/test-dark.pdf" --toc --theme=dark
echo ""

# Test 4: Professional theme
echo "Test 4: Professional theme"
"$SCRIPT_DIR/convert.sh" "$TEST_DIR/test-document.md" "$TEST_DIR/test-professional.pdf" --toc --theme=professional
echo ""

# Test 5: Minimal theme
echo "Test 5: Minimal theme"
"$SCRIPT_DIR/convert.sh" "$TEST_DIR/test-document.md" "$TEST_DIR/test-minimal.pdf" --theme=minimal
echo ""

# Test 6: Landscape
echo "Test 6: Landscape orientation"
"$SCRIPT_DIR/convert.sh" "$TEST_DIR/test-document.md" "$TEST_DIR/test-landscape.pdf" --landscape
echo ""

echo "========================================"
echo "All tests completed!"
echo "========================================"
echo ""
echo "Generated PDFs:"
ls -lh "$TEST_DIR"/*.pdf
echo ""
echo "Open test PDFs:"
echo "  open $TEST_DIR/test-basic.pdf"
echo "  open $TEST_DIR/test-with-toc.pdf"
echo "  open $TEST_DIR/test-dark.pdf"
echo "  open $TEST_DIR/test-professional.pdf"
echo "  open $TEST_DIR/test-minimal.pdf"
echo "  open $TEST_DIR/test-landscape.pdf"
echo ""
echo "Test source: $TEST_DIR/test-document.md"
