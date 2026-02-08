#!/usr/bin/env bash
#
# convert.sh - Convert markdown to PDF using Pandoc
#
# Usage:
#   convert.sh input.md [output.pdf] [options]
#   convert.sh input.md [output.pdf] --engine=xelatex [options]
#
# Examples:
#   convert.sh README.md
#   convert.sh README.md output.pdf
#   convert.sh README.md output.pdf --toc --number-sections
#   convert.sh README.md output.pdf --engine=xelatex --toc
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
error() {
    echo -e "${RED}Error:${NC} $1" >&2
}

success() {
    echo -e "${GREEN}Success:${NC} $1"
}

info() {
    echo -e "${YELLOW}Info:${NC} $1"
}

# Install Homebrew if not present
ensure_homebrew() {
    if ! command -v brew &> /dev/null; then
        info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add brew to PATH for current session
        if [ -f /opt/homebrew/bin/brew ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [ -f /usr/local/bin/brew ]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
}

# Check and auto-install dependencies
check_dependencies() {
    local needs_install=false

    # Check pandoc
    if ! command -v pandoc &> /dev/null; then
        info "pandoc not found, installing..."
        ensure_homebrew
        brew install pandoc
        needs_install=true
    fi

    # Check for at least one LaTeX engine
    if ! command -v pdflatex &> /dev/null && \
       ! command -v xelatex &> /dev/null && \
       ! command -v lualatex &> /dev/null; then

        info "LaTeX not found, installing BasicTeX..."
        ensure_homebrew
        brew install --cask basictex

        # Add LaTeX to PATH for current session
        export PATH="/Library/TeX/texbin:$PATH"

        # Update tlmgr and install common packages
        info "Updating TeX Live Manager..."
        sudo tlmgr update --self

        needs_install=true
    else
        # Ensure LaTeX is in PATH
        if [ -d /Library/TeX/texbin ] && [[ ":$PATH:" != *":/Library/TeX/texbin:"* ]]; then
            export PATH="/Library/TeX/texbin:$PATH"
        fi
    fi

    if [ "$needs_install" = true ]; then
        success "Dependencies installed successfully"
        echo ""
    fi
}

# Show usage
usage() {
    cat << EOF
Usage: $(basename "$0") INPUT.md [OUTPUT.pdf] [OPTIONS]

Convert markdown files to PDF using Pandoc with LaTeX.

Arguments:
  INPUT.md          Input markdown file (required)
  OUTPUT.pdf        Output PDF file (optional, default: INPUT.pdf)
  OPTIONS           Additional options (see below)

Examples:
  # Basic conversion
  $(basename "$0") document.md

  # Specify output file
  $(basename "$0") document.md output.pdf

  # With table of contents and numbered sections
  $(basename "$0") document.md output.pdf --toc --number-sections

  # Use XeLaTeX for Unicode support
  $(basename "$0") document.md output.pdf --engine=xelatex --toc

  # With custom margins and font size
  $(basename "$0") document.md output.pdf --variable=geometry:margin=1in --variable=fontsize=12pt

Script Options:
  --engine=ENGINE          PDF engine: pdflatex (default), xelatex, lualatex
                          Use xelatex for Unicode/international text
  --render-mermaid         Automatically render mermaid diagrams to images
                          Requires: npm install -g @mermaid-js/mermaid-cli

Pandoc Options:
  --toc                    Generate table of contents
  --number-sections        Number section headings
  --highlight-style=tango  Code syntax highlighting
  --variable=KEY:VALUE     Set LaTeX variables

PDF Engines:
  pdflatex    Default, fast, good for ASCII/Latin text
  xelatex     Better Unicode support (recommended for international text)
  lualatex    Advanced features, Lua scripting support

Dependencies:
  - pandoc
  - pdflatex/xelatex/lualatex (from TeX distribution)

EOF
}

# Main script
main() {
    # Check for help flag
    if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        usage
        exit 0
    fi

    # Check dependencies
    check_dependencies

    # Parse arguments
    local input_file="$1"
    shift

    # Validate input file
    if [ ! -f "$input_file" ]; then
        error "Input file not found: $input_file"
        exit 1
    fi

    if [ ! -r "$input_file" ]; then
        error "Input file not readable: $input_file"
        exit 1
    fi

    # Determine output file
    local output_file
    if [ $# -gt 0 ] && [[ "$1" != --* ]]; then
        output_file="$1"
        shift
    else
        # Default: replace .md extension with .pdf
        output_file="${input_file%.md}.pdf"
        if [ "$output_file" = "$input_file" ]; then
            # Input didn't have .md extension, just append .pdf
            output_file="${input_file}.pdf"
        fi
    fi

    # Parse options
    local pdf_engine="pdflatex"
    local render_mermaid=false
    local pandoc_opts=()

    while [ $# -gt 0 ]; do
        case "$1" in
            --engine=*)
                pdf_engine="${1#*=}"
                shift
                ;;
            --render-mermaid)
                render_mermaid=true
                shift
                ;;
            *)
                pandoc_opts+=("$1")
                shift
                ;;
        esac
    done

    # Validate PDF engine
    if ! command -v "$pdf_engine" &> /dev/null; then
        error "PDF engine not found: $pdf_engine"
        echo "Available engines: pdflatex, xelatex, lualatex"
        exit 1
    fi

    # Handle mermaid rendering if requested
    local processed_input="$input_file"
    local temp_dir=""
    local cleanup_needed=false

    if [ "$render_mermaid" = true ]; then
        info "Mermaid rendering enabled"

        # Check if mermaid-cli is available, install if needed
        if ! command -v mmdc &> /dev/null; then
            info "mermaid-cli not found, installing..."

            # Check if npm is available
            if ! command -v npm &> /dev/null; then
                info "npm not found, installing Node.js..."
                ensure_homebrew
                brew install node
            fi

            # Install mermaid-cli globally
            npm install -g @mermaid-js/mermaid-cli
            success "mermaid-cli installed successfully"
            echo ""
        fi

        # Create temp directory for processed markdown and diagrams
        temp_dir=$(mktemp -d)
        cleanup_needed=true

        local processed_md="$temp_dir/$(basename "${input_file%.md}")-processed.md"

        # Get the directory of this script
        local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

        # Render mermaid diagrams
        echo ""
        if "$script_dir/render-mermaid.sh" "$input_file" "$processed_md" "$temp_dir"; then
            processed_input="$processed_md"
            echo ""
        else
            error "Failed to render mermaid diagrams"
            exit 1
        fi
    fi

    # Show conversion info
    info "Converting markdown to PDF"
    echo "  Input:  $input_file"
    echo "  Output: $output_file"
    echo "  Engine: $pdf_engine"
    if [ "$render_mermaid" = true ]; then
        echo "  Mermaid: enabled (diagrams will be rendered)"
    fi
    if [ ${#pandoc_opts[@]} -gt 0 ]; then
        echo "  Options: ${pandoc_opts[*]}"
    fi
    echo ""

    # Run pandoc
    echo "Running pandoc with $pdf_engine..."
    if pandoc "$processed_input" -o "$output_file" \
        --pdf-engine="$pdf_engine" \
        --resource-path="$(dirname "$processed_input")" \
        "${pandoc_opts[@]}"; then
        echo ""
        success "PDF generated: $output_file"

        # Show file info
        if command -v ls &> /dev/null; then
            ls -lh "$output_file" | awk '{print "  Size: " $5}'
        fi

        # Offer to open
        if [ -t 0 ]; then  # Check if running interactively
            echo ""
            read -p "Open PDF now? [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if command -v open &> /dev/null; then
                    open "$output_file"
                elif command -v xdg-open &> /dev/null; then
                    xdg-open "$output_file"
                else
                    info "Could not find command to open PDF"
                fi
            fi
        fi
    else
        echo ""
        error "PDF generation failed"

        # Cleanup temp files even on failure
        if [ "$cleanup_needed" = true ] && [ -n "$temp_dir" ] && [ -d "$temp_dir" ]; then
            rm -rf "$temp_dir"
        fi
        exit 1
    fi

    # Cleanup temp files
    if [ "$cleanup_needed" = true ] && [ -n "$temp_dir" ] && [ -d "$temp_dir" ]; then
        info "Cleaning up temporary files..."
        rm -rf "$temp_dir"
    fi
}

# Run main function
main "$@"
