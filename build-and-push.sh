#!/bin/bash

# Exit on error
set -e

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is required but not installed. Please install Docker first."
    exit 1
fi

# Configuration
IMAGE_NAME="stickynotes"
DOCKER_HUB_USERNAME=""  # Replace with your Docker Hub username

# Parse arguments
VERSION="latest"
while getopts ":v:u:" opt; do
  case $opt in
    v) VERSION="$OPTARG"
    ;;
    u) DOCKER_HUB_USERNAME="$OPTARG"
    ;;
    \?) echo "Invalid option -$OPTARG" >&2
    exit 1
    ;;
  esac
done

# Check if Docker Hub username is provided
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo "Please provide your Docker Hub username with -u username"
    exit 1
fi

# Display build information
echo "========================================="
echo "Building image: $DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION"
echo "========================================="

# Ensure required files exist
echo "Checking if required files exist..."
mkdir -p webapp/js webapp/css

# Check if files exist and create empty ones if they don't
for file in "webapp/js/sticky-notes.js" "webapp/js/board-controller.js" "webapp/css/notes-styles.css" "webapp/css/board-view.css"; do
    if [ ! -f "$file" ]; then
        echo "Warning: $file not found. Creating an empty file."
        touch "$file"
    else
        echo "✓ $file exists."
    fi
done

# Check if required configuration files have been updated
echo "Checking Nginx configuration in Dockerfile..."
if grep -q "chown -R plik:plik /var/lib/nginx" Dockerfile; then
    echo "✓ Nginx permissions have been properly configured in Dockerfile."
else
    echo "Warning: Nginx permissions might not be properly configured. This could cause issues with logs and temporary directories."
fi

if grep -q "duplicate extension" Dockerfile; then
    echo "Warning: Dockerfile may contain duplicate MIME type definitions."
else
    echo "✓ MIME type definitions appear to be correctly configured."
fi

# Build the Docker image
echo "Building Docker image..."
docker build -t "$DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION" .

# Log in to Docker Hub
echo "Logging in to Docker Hub..."
echo "Please enter your Docker Hub password when prompted."
docker login -u "$DOCKER_HUB_USERNAME"

# Push the image to Docker Hub
echo "Pushing image to Docker Hub..."
docker push "$DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION"

echo "========================================="
echo "Build and push completed successfully!"
echo "Image: $DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION"
echo "========================================="
echo ""
echo "Next steps for Render.com deployment:"
echo "1. Go to your Render dashboard"
echo "2. Create a new Web Service"
echo "3. Select 'Docker' as the environment"
echo "4. Enter '$DOCKER_HUB_USERNAME/$IMAGE_NAME:$VERSION' as the image URL"
echo "5. Set port to '8080'"
echo "=========================================" 