#!/bin/bash

# Simple test for easy-markdown-to-pdf

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$SCRIPT_DIR/test"

echo "Creating test markdown..."

mkdir -p "$TEST_DIR"

cat > "$TEST_DIR/simple-test.md" <<'EOF'
# Test Document

This is a simple test to verify the conversion works.

## Features

- **Markdown formatting**
- Syntax highlighting
- Mermaid diagrams
- Professional styling

## Code Example

```javascript
function hello(name) {
    console.log(`Hello, ${name}!`);
}

hello("World");
```

## Mermaid Diagram

```mermaid
graph LR
    A[Input] --> B[Process]
    B --> C[Output]
```

## Conclusion

If you can see this as a PDF, it works! ✓
EOF

echo "✓ Test markdown created"
echo ""

echo "Running conversion..."
"$SCRIPT_DIR/easy-convert.sh" "$TEST_DIR/simple-test.md" "$TEST_DIR/simple-test.pdf" --toc --theme=professional

echo ""
echo "========================================"
echo "Test complete!"
echo "========================================"
echo ""
echo "Generated:"
ls -lh "$TEST_DIR/simple-test.pdf"
echo ""
echo "Open PDF:"
echo "  open $TEST_DIR/simple-test.pdf"
