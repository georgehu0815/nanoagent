#!/usr/bin/env bash
#
# render-mermaid.sh - Extract and render mermaid diagrams from markdown
#
# Usage:
#   render-mermaid.sh input.md output.md
#
# This script:
# 1. Finds mermaid code blocks in the markdown
# 2. Renders them to PNG images using mermaid-cli
# 3. Replaces mermaid blocks with image references
# 4. Outputs modified markdown file
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() {
    echo -e "${RED}Error:${NC} $1" >&2
}

success() {
    echo -e "${GREEN}Success:${NC} $1" >&2
}

info() {
    echo -e "${YELLOW}Info:${NC} $1" >&2
}

# Check if mermaid-cli is installed
check_mermaid_cli() {
    if ! command -v mmdc &> /dev/null; then
        error "mermaid-cli (mmdc) not found"
        echo ""
        echo "Install with: npm install -g @mermaid-js/mermaid-cli"
        echo ""
        exit 1
    fi
}

# Extract mermaid blocks and render them
render_mermaid_diagrams() {
    local input_file="$1"
    local output_file="$2"
    local temp_dir="$3"

    local in_mermaid=false
    local mermaid_content=""
    local diagram_count=0
    local line_num=0

    # Read input file line by line
    while IFS= read -r line || [ -n "$line" ]; do
        line_num=$((line_num + 1))

        # Check if we're starting a mermaid block
        if [[ "$line" =~ ^\`\`\`mermaid ]]; then
            in_mermaid=true
            mermaid_content=""
            info "Found mermaid diagram at line $line_num"
            continue
        fi

        # Check if we're ending a mermaid block
        if [[ "$in_mermaid" == true ]] && [[ "$line" =~ ^\`\`\` ]]; then
            in_mermaid=false
            diagram_count=$((diagram_count + 1))

            # Save mermaid content to temp file
            local mmd_file="$temp_dir/diagram_${diagram_count}.mmd"
            local png_file="$temp_dir/diagram_${diagram_count}.png"

            echo "$mermaid_content" > "$mmd_file"

            # Render diagram
            info "Rendering diagram $diagram_count..."
            if mmdc -i "$mmd_file" -o "$png_file" -b transparent -t neutral 2>&1 | grep -v "Generating single mermaid chart" || true; then
                success "Rendered diagram_${diagram_count}.png"

                # Add image reference to output
                echo "" >> "$output_file"
                echo "![Diagram ${diagram_count}](diagram_${diagram_count}.png)" >> "$output_file"
                echo "" >> "$output_file"
            else
                error "Failed to render diagram $diagram_count"
                # Keep original mermaid code block
                echo '```mermaid' >> "$output_file"
                echo "$mermaid_content" >> "$output_file"
                echo '```' >> "$output_file"
            fi

            continue
        fi

        # Collect mermaid content
        if [[ "$in_mermaid" == true ]]; then
            mermaid_content="${mermaid_content}${line}"$'\n'
        else
            # Regular line - copy to output
            echo "$line" >> "$output_file"
        fi
    done < "$input_file"

    echo "$diagram_count"
}

# Main function
main() {
    if [ $# -lt 2 ]; then
        echo "Usage: $(basename "$0") INPUT.md OUTPUT.md [TEMP_DIR]"
        echo ""
        echo "Extract and render mermaid diagrams from markdown."
        echo ""
        echo "Arguments:"
        echo "  INPUT.md    Input markdown file with mermaid diagrams"
        echo "  OUTPUT.md   Output markdown file with rendered images"
        echo "  TEMP_DIR    Directory for temporary files (optional)"
        echo ""
        exit 1
    fi

    local input_file="$1"
    local output_file="$2"
    local temp_dir="${3:-$(dirname "$output_file")}"

    # Validate input
    if [ ! -f "$input_file" ]; then
        error "Input file not found: $input_file"
        exit 1
    fi

    # Check dependencies
    check_mermaid_cli

    # Create temp directory if needed
    mkdir -p "$temp_dir"

    # Clear output file
    > "$output_file"

    info "Processing $input_file"
    echo "  Output: $output_file"
    echo "  Temp dir: $temp_dir"
    echo ""

    # Render diagrams
    local diagram_count
    diagram_count=$(render_mermaid_diagrams "$input_file" "$output_file" "$temp_dir")

    echo ""
    if [ "$diagram_count" -gt 0 ]; then
        success "Rendered $diagram_count mermaid diagram(s)"
    else
        info "No mermaid diagrams found"
    fi
}

main "$@"
