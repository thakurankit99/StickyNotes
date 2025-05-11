#!/bin/bash

# Ensure all custom files exist and are ready for Docker build
echo "Preparing files for Docker build..."

# Create directories if they don't exist
mkdir -p webapp/js
mkdir -p webapp/css

# Ensure sticky-notes.js exists
if [ ! -f webapp/js/sticky-notes.js ]; then
    echo "Warning: webapp/js/sticky-notes.js not found. Check if it has been created."
fi

# Ensure board-controller.js exists
if [ ! -f webapp/js/board-controller.js ]; then
    echo "Warning: webapp/js/board-controller.js not found. Check if it has been created."
fi

# Ensure notes-styles.css exists
if [ ! -f webapp/css/notes-styles.css ]; then
    echo "Warning: webapp/css/notes-styles.css not found. Check if it has been created."
fi

# Ensure board-view.css exists
if [ ! -f webapp/css/board-view.css ]; then
    echo "Warning: webapp/css/board-view.css not found. Check if it has been created."
fi

# Check if files exist and print status
echo "Checking files for Docker build:"
echo "- webapp/js/sticky-notes.js: $([ -f webapp/js/sticky-notes.js ] && echo "Found" || echo "Missing")"
echo "- webapp/js/board-controller.js: $([ -f webapp/js/board-controller.js ] && echo "Found" || echo "Missing")"
echo "- webapp/css/notes-styles.css: $([ -f webapp/css/notes-styles.css ] && echo "Found" || echo "Missing")"
echo "- webapp/css/board-view.css: $([ -f webapp/css/board-view.css ] && echo "Found" || echo "Missing")"

# Build Docker image
echo "Building Docker image..."
docker build -t stickynotes:latest .

echo "Docker build complete!"
echo "To run: docker run -d -p 8080:8080 stickynotes:latest" 