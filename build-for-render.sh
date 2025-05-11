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

# Ensure the render-init.sh script is executable
chmod +x render-init.sh

echo "Setup completed successfully" 