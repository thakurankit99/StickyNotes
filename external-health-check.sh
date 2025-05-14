#!/bin/bash

# Configuration
SERVICE_URL="https://stickynotes-latest.onrender.com"  # Hardcoded Render.com URL
LOG_FILE="health-check.log"
NOTIFICATION_EMAIL="your-email@example.com"  # Replace with your email

# Get timestamp
timestamp=$(date +"%Y-%m-%d %H:%M:%S")

# Make the request and capture response code
response=$(curl -s -o /dev/null -w "%{http_code}" $SERVICE_URL)

# Log the result
echo "$timestamp - Health check: $response" >> $LOG_FILE

# If response is not 2xx or 3xx, send notification
if [[ $response -lt 200 || $response -ge 400 ]]; then
  echo "$timestamp - Health check failed with response code $response" >> $LOG_FILE
  
  # Send email notification (uncomment and configure if needed)
  # echo "Health check failed for $SERVICE_URL with response code $response" | \
  # mail -s "Service Health Check Alert" $NOTIFICATION_EMAIL
  
  # Or use webhook notification to services like Slack, Discord, etc.
  # curl -X POST -H 'Content-type: application/json' \
  # --data "{\"text\":\"Health check failed for $SERVICE_URL with response code $response\"}" \
  # https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
fi

exit 0 