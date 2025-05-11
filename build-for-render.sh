#!/bin/bash

# This script prepares the project for building on Render

set -e

echo "Setting up project for build on Render.com..."

# Ensure custom directories exist
mkdir -p webapp/js webapp/css

# Create custom files if they don't exist (to avoid build errors)
for file in "webapp/js/sticky-notes.js" "webapp/js/board-controller.js" "webapp/css/notes-styles.css" "webapp/css/board-view.css"; do
    if [ ! -f "$file" ]; then
        echo "Creating $file as it doesn't exist"
        touch "$file"
    else
        echo "$file already exists"
    fi
done

# Ensure scripts are executable
chmod +x render-init.sh
find . -name "*.sh" -type f -exec chmod +x {} \; 2>/dev/null || true

echo "Setup completed successfully" 