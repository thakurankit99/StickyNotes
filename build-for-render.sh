#!/bin/bash

# This script prepares the project for building on Render

set -e

echo "Setting up project for build on Render.com..."

# Ensure custom directories exist
mkdir -p webapp/js webapp/css webapp/favicon

# Create custom files if they don't exist (to avoid build errors)
for file in "webapp/js/sticky-notes.js" "webapp/js/board-controller.js" "webapp/css/notes-styles.css" "webapp/css/board-view.css"; do
    if [ ! -f "$file" ]; then
        echo "Creating $file as it doesn't exist"
        touch "$file"
    else
        echo "$file already exists"
    fi
done

# Ensure favicon directory is properly set up
if [ ! -d "webapp/favicon" ] || [ -z "$(ls -A webapp/favicon 2>/dev/null)" ]; then
    echo "Favicon directory is missing or empty, creating placeholder files"
    mkdir -p webapp/favicon
    # If favicon files don't exist, create simpler placeholder until real ones are available
    if [ ! -f "webapp/favicon/favicon.ico" ]; then
        echo "Creating placeholder favicon files"
        # This would ideally create simple placeholder files, but for now we'll just create empty ones
        touch webapp/favicon/favicon.ico
        touch webapp/favicon/favicon-16x16.png
        touch webapp/favicon/favicon-32x32.png
        echo '{"name":"StickyNotes","short_name":"StickyNotes","icons":[],"theme_color":"#ffffff","background_color":"#ffffff","display":"standalone"}' > webapp/favicon/site.webmanifest
    fi
else
    echo "Favicon directory exists and contains files"
fi

# Ensure scripts are executable
chmod +x render-init.sh
find . -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

echo "Setup completed successfully" 