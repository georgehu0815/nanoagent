#!/bin/bash

set -euo pipefail

# ============================================================================
# easy-markdown-to-pdf - Convert Markdown to PDF without sudo
# ============================================================================
# Uses: Mermaid CLI + Chrome headless (no Pandoc/LaTeX required)
# Author: Claude
# Version: 1.0
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
GENERATE_TOC=false
THEME="light"
LANDSCAPE=false
RENDER_MERMAID=true
KEEP_TEMP=false
CUSTOM_CSS=""

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    if [[ "$KEEP_TEMP" == "false" ]]; then
        rm -rf "$TEMP_DIR"
    else
        log_info "Temporary files kept at: $TEMP_DIR"
    fi
}

trap cleanup EXIT

# ============================================================================
# Dependency Checks
# ============================================================================

check_dependencies() {
    log_info "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found, installing..."
        brew install node
    fi

    # Check mermaid-cli
    if ! command -v mmdc &> /dev/null && ! npm list -g @mermaid-js/mermaid-cli &> /dev/null; then
        log_warning "mermaid-cli not found, installing..."
        npm install -g @mermaid-js/mermaid-cli
    fi

    # Check Chrome
    CHROME_PATH=""
    if [[ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
        CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    elif command -v google-chrome &> /dev/null; then
        CHROME_PATH="google-chrome"
    elif command -v chromium &> /dev/null; then
        CHROME_PATH="chromium"
    else
        log_error "Chrome/Chromium not found. Please install Google Chrome."
        exit 1
    fi

    log_success "All dependencies available"
}

# ============================================================================
# Mermaid Processing
# ============================================================================

extract_and_render_mermaid() {
    local input_md="$1"
    local output_html="$2"

    if [[ "$RENDER_MERMAID" == "false" ]]; then
        cp "$input_md" "$output_html"
        return
    fi

    log_info "Processing mermaid diagrams..."

    local temp_md="$TEMP_DIR/processed.md"
    local diagram_count=0
    local in_mermaid=false
    local mermaid_content=""

    while IFS= read -r line; do
        if [[ "$line" =~ ^\`\`\`mermaid ]]; then
            in_mermaid=true
            mermaid_content=""
        elif [[ "$in_mermaid" == "true" && "$line" =~ ^\`\`\`$ ]]; then
            # Render this mermaid diagram
            diagram_count=$((diagram_count + 1))
            local mmd_file="$TEMP_DIR/diagram_${diagram_count}.mmd"
            local png_file="$TEMP_DIR/diagram_${diagram_count}.png"

            echo "$mermaid_content" > "$mmd_file"

            if mmdc -i "$mmd_file" -o "$png_file" -b transparent -w 3200 2>/dev/null; then
                echo "![Diagram ${diagram_count}](${png_file})" >> "$temp_md"
                log_success "Rendered diagram ${diagram_count}"
            else
                log_warning "Failed to render diagram ${diagram_count}, keeping as code"
                echo '```mermaid' >> "$temp_md"
                echo "$mermaid_content" >> "$temp_md"
                echo '```' >> "$temp_md"
            fi

            in_mermaid=false
        elif [[ "$in_mermaid" == "true" ]]; then
            mermaid_content+="$line"$'\n'
        else
            echo "$line" >> "$temp_md"
        fi
    done < "$input_md"

    cp "$temp_md" "$output_html"

    if [[ $diagram_count -gt 0 ]]; then
        log_success "Processed $diagram_count mermaid diagram(s)"
    fi
}

# ============================================================================
# Markdown to HTML
# ============================================================================

markdown_to_html() {
    local input_md="$1"
    local output_html="$2"

    log_info "Converting markdown to HTML..."

    # Read markdown content
    local content
    content=$(<"$input_md")

    # Extract title from first H1
    local title=""
    if [[ "$content" =~ ^#[[:space:]]+(.+)$ ]]; then
        title="${BASH_REMATCH[1]}"
    else
        title=$(basename "$input_md" .md)
    fi

    # Generate TOC if requested
    local toc_html=""
    if [[ "$GENERATE_TOC" == "true" ]]; then
        toc_html=$(generate_toc "$content")
    fi

    # Get CSS based on theme
    local css
    css=$(get_theme_css "$THEME")

    # If custom CSS provided, append it
    if [[ -n "$CUSTOM_CSS" && -f "$CUSTOM_CSS" ]]; then
        css+=$'\n'
        css+=$(<"$CUSTOM_CSS")
    fi

    # Convert markdown to HTML (basic conversion)
    local body_html
    body_html=$(basic_markdown_to_html "$content")

    # Create full HTML
    cat > "$output_html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$title</title>
    <style>
$css
    </style>
</head>
<body>
    $toc_html
    $body_html
</body>
</html>
EOF

    log_success "HTML generated"
}

basic_markdown_to_html() {
    local md="$1"
    local html=""
    local in_code_block=false
    local code_block_content=""
    local code_lang=""

    while IFS= read -r line; do
        # Code blocks
        if [[ "$line" =~ ^\`\`\`([a-z]*) ]]; then
            if [[ "$in_code_block" == "false" ]]; then
                in_code_block=true
                code_lang="${BASH_REMATCH[1]}"
                code_block_content=""
            else
                in_code_block=false
                html+="<pre><code class=\"language-${code_lang}\">$(escape_html "$code_block_content")</code></pre>"$'\n'
            fi
            continue
        fi

        if [[ "$in_code_block" == "true" ]]; then
            code_block_content+="$line"$'\n'
            continue
        fi

        # Headers
        if [[ "$line" =~ ^######[[:space:]]+(.+)$ ]]; then
            html+="<h6>${BASH_REMATCH[1]}</h6>"$'\n'
        elif [[ "$line" =~ ^#####[[:space:]]+(.+)$ ]]; then
            html+="<h5>${BASH_REMATCH[1]}</h5>"$'\n'
        elif [[ "$line" =~ ^####[[:space:]]+(.+)$ ]]; then
            html+="<h4>${BASH_REMATCH[1]}</h4>"$'\n'
        elif [[ "$line" =~ ^###[[:space:]]+(.+)$ ]]; then
            html+="<h3>${BASH_REMATCH[1]}</h3>"$'\n'
        elif [[ "$line" =~ ^##[[:space:]]+(.+)$ ]]; then
            html+="<h2>${BASH_REMATCH[1]}</h2>"$'\n'
        elif [[ "$line" =~ ^#[[:space:]]+(.+)$ ]]; then
            html+="<h1>${BASH_REMATCH[1]}</h1>"$'\n'
        # Images
        elif [[ "$line" =~ !\[([^\]]*)\]\(([^\)]+)\) ]]; then
            local alt="${BASH_REMATCH[1]}"
            local src="${BASH_REMATCH[2]}"
            html+="<img src=\"$src\" alt=\"$alt\" />"$'\n'
        # Horizontal rule
        elif [[ "$line" =~ ^---+$ ]] || [[ "$line" =~ ^\*\*\*+$ ]]; then
            html+="<hr />"$'\n'
        # Blank line
        elif [[ -z "$line" ]]; then
            html+="<br />"$'\n'
        # Paragraph
        else
            # Process inline formatting
            local processed
            processed=$(process_inline_formatting "$line")
            html+="<p>$processed</p>"$'\n'
        fi
    done <<< "$md"

    echo "$html"
}

process_inline_formatting() {
    local text="$1"

    # Bold
    text=$(echo "$text" | sed -E 's/\*\*([^*]+)\*\*/<strong>\1<\/strong>/g')

    # Italic
    text=$(echo "$text" | sed -E 's/\*([^*]+)\*/<em>\1<\/em>/g')

    # Inline code
    text=$(echo "$text" | sed -E 's/`([^`]+)`/<code>\1<\/code>/g')

    # Links
    text=$(echo "$text" | sed -E 's/\[([^\]]+)\]\(([^\)]+)\)/<a href="\2">\1<\/a>/g')

    echo "$text"
}

escape_html() {
    local text="$1"
    echo "$text" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g'
}

generate_toc() {
    local content="$1"
    local toc='<div class="toc"><h2>Table of Contents</h2><ul>'

    while IFS= read -r line; do
        if [[ "$line" =~ ^##[[:space:]]+(.+)$ ]]; then
            local heading="${BASH_REMATCH[1]}"
            local anchor=$(echo "$heading" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
            toc+="<li><a href=\"#$anchor\">$heading</a></li>"
        fi
    done <<< "$content"

    toc+='</ul></div>'
    echo "$toc"
}

# ============================================================================
# CSS Themes
# ============================================================================

get_theme_css() {
    local theme="$1"

    case "$theme" in
        dark)
            get_dark_theme_css
            ;;
        minimal)
            get_minimal_theme_css
            ;;
        professional)
            get_professional_theme_css
            ;;
        *)
            get_light_theme_css
            ;;
    esac
}

get_light_theme_css() {
    cat <<'EOF'
@page {
    size: A4;
    margin: 1in;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background: white;
}

h1 { color: #1e40af; font-size: 32px; border-bottom: 4px solid #3b82f6; padding-bottom: 15px; }
h2 { color: #3b82f6; font-size: 24px; margin-top: 40px; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
h3 { color: #6366f1; font-size: 18px; margin-top: 25px; }
h4 { color: #1e40af; font-size: 16px; }

code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "SF Mono", Monaco, monospace;
    font-size: 0.9em;
}

pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
}

pre code {
    background: none;
    color: inherit;
}

img {
    max-width: 100%;
    height: auto;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    margin: 20px 0;
}

.toc {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    padding: 20px;
    border-radius: 8px;
    margin: 25px 0;
}

.toc h2 {
    margin-top: 0;
}

.toc ul {
    list-style: none;
    padding-left: 0;
}

.toc li {
    margin: 8px 0;
}

.toc a {
    color: #3b82f6;
    text-decoration: none;
}

.toc a:hover {
    text-decoration: underline;
}
EOF
}

get_dark_theme_css() {
    cat <<'EOF'
@page {
    size: A4;
    margin: 1in;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    color: #e0e0e0;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background: #1e1e1e;
}

h1 { color: #60a5fa; font-size: 32px; border-bottom: 4px solid #3b82f6; padding-bottom: 15px; }
h2 { color: #60a5fa; font-size: 24px; margin-top: 40px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
h3 { color: #818cf8; font-size: 18px; margin-top: 25px; }
h4 { color: #60a5fa; font-size: 16px; }

code {
    background: #2d2d2d;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "SF Mono", Monaco, monospace;
    font-size: 0.9em;
    color: #e0e0e0;
}

pre {
    background: #0d1117;
    color: #c9d1d9;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
}

img {
    max-width: 100%;
    height: auto;
    border: 2px solid #374151;
    border-radius: 8px;
    margin: 20px 0;
}

.toc {
    background: #2d2d2d;
    border: 1px solid #374151;
    padding: 20px;
    border-radius: 8px;
    margin: 25px 0;
}
EOF
}

get_minimal_theme_css() {
    cat <<'EOF'
@page {
    size: A4;
    margin: 0.75in;
}

body {
    font-family: Georgia, serif;
    line-height: 1.5;
    color: #333;
    max-width: 100%;
    margin: 0;
    padding: 15px;
    background: white;
}

h1 { font-size: 28px; margin-bottom: 10px; }
h2 { font-size: 22px; margin-top: 30px; }
h3 { font-size: 18px; margin-top: 20px; }

code {
    font-family: "Courier New", monospace;
    font-size: 0.9em;
}

img {
    max-width: 100%;
    height: auto;
}
EOF
}

get_professional_theme_css() {
    cat <<'EOF'
@page {
    size: A4;
    margin: 1.25in;
}

body {
    font-family: "Times New Roman", Times, serif;
    line-height: 1.8;
    color: #2c3e50;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background: white;
}

h1 {
    color: #2c3e50;
    font-size: 28px;
    text-align: center;
    border-bottom: 3px double #34495e;
    padding-bottom: 15px;
    margin-bottom: 30px;
}

h2 {
    color: #34495e;
    font-size: 22px;
    margin-top: 35px;
    border-bottom: 1px solid #95a5a6;
    padding-bottom: 8px;
}

h3 {
    color: #34495e;
    font-size: 18px;
    margin-top: 25px;
}

code {
    background: #ecf0f1;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: "Courier New", monospace;
    font-size: 0.9em;
}

img {
    max-width: 100%;
    height: auto;
    border: 1px solid #bdc3c7;
    margin: 20px auto;
    display: block;
}
EOF
}

# ============================================================================
# HTML to PDF
# ============================================================================

html_to_pdf() {
    local input_html="$1"
    local output_pdf="$2"

    log_info "Converting HTML to PDF with Chrome headless..."

    local orientation_flag=""
    if [[ "$LANDSCAPE" == "true" ]]; then
        orientation_flag="--landscape"
    fi

    "$CHROME_PATH" \
        --headless \
        --disable-gpu \
        --print-to-pdf="$output_pdf" \
        $orientation_flag \
        --no-margins \
        "file://$input_html" \
        2>/dev/null

    if [[ -f "$output_pdf" ]]; then
        local size
        size=$(du -h "$output_pdf" | cut -f1)
        log_success "PDF generated: $output_pdf ($size)"
    else
        log_error "Failed to generate PDF"
        exit 1
    fi
}

# ============================================================================
# Main Function
# ============================================================================

usage() {
    cat <<EOF
Usage: $0 <input.md> <output.pdf> [options]

Options:
  --toc              Generate table of contents
  --theme=THEME      Theme: light (default), dark, minimal, professional
  --landscape        Use landscape orientation
  --no-mermaid       Skip mermaid diagram rendering
  --keep-temp        Keep temporary files for debugging
  --css=FILE         Custom CSS file
  --help             Show this help message

Examples:
  $0 README.md README.pdf
  $0 docs.md docs.pdf --toc --theme=professional
  $0 architecture.md arch.pdf --toc --landscape

EOF
    exit 0
}

main() {
    # Parse arguments
    if [[ $# -lt 2 ]]; then
        usage
    fi

    local input_md="$1"
    local output_pdf="$2"
    shift 2

    # Parse options
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --toc)
                GENERATE_TOC=true
                ;;
            --theme=*)
                THEME="${1#*=}"
                ;;
            --landscape)
                LANDSCAPE=true
                ;;
            --no-mermaid)
                RENDER_MERMAID=false
                ;;
            --keep-temp)
                KEEP_TEMP=true
                ;;
            --css=*)
                CUSTOM_CSS="${1#*=}"
                ;;
            --help)
                usage
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                ;;
        esac
        shift
    done

    # Validate input
    if [[ ! -f "$input_md" ]]; then
        log_error "Input file not found: $input_md"
        exit 1
    fi

    # Get absolute path for input
    input_md="$(cd "$(dirname "$input_md")" && pwd)/$(basename "$input_md")"

    log_info "Starting conversion: $(basename "$input_md") → $(basename "$output_pdf")"

    # Check dependencies
    check_dependencies

    # Process pipeline
    local processed_md="$TEMP_DIR/processed.md"
    local html_file="$TEMP_DIR/output.html"

    extract_and_render_mermaid "$input_md" "$processed_md"
    markdown_to_html "$processed_md" "$html_file"
    html_to_pdf "$html_file" "$output_pdf"

    log_success "Conversion complete!"
}

# Run main
main "$@"
