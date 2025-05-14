#!/bin/sh

# Configuration
BASE_URL="https://stickynotes-latest.onrender.com"  # Hardcoded Render.com URL
LOG_FILE=${LOG_FILE:-"/tmp/health-check.log"}

# Create log directory if it doesn't exist
mkdir -p $(dirname $LOG_FILE)

# Get timestamp
timestamp=$(date +"%Y-%m-%d %H:%M:%S")

# Make the request and capture response code
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL)

# Log the result
echo "$timestamp - Health check: $response" >> $LOG_FILE

# Output to stdout as well (useful for Docker logs)
echo "$timestamp - Health check: $response"

# If response is not 2xx or 3xx, exit with error
if [ $response -lt 200 ] || [ $response -ge 400 ]; then
  echo "$timestamp - Health check failed with response code $response" >> $LOG_FILE
  echo "$timestamp - Health check failed with response code $response"
  exit 1
fi

exit 0 