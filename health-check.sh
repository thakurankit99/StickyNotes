#!/bin/bash

# Health Check Cron Script for Sticky Notes App
# This script detects the base URL of the application and pings it every 3 minutes
# Logs the results to the Render logs

# Log function with timestamp that writes to both stdout and the log file
log() {
  LOG_MESSAGE="[$(date '+%Y-%m-%d %H:%M:%S')] HEALTH CHECK: $1"
  echo "$LOG_MESSAGE"
  # Also log to stdout for Render logging
  echo "$LOG_MESSAGE" >> /proc/1/fd/1 2>/dev/null || true
}

# Set up the cron job to run every 3 minutes
setup_cron() {
  # Remove any existing cron job for this script to avoid duplicates
  (crontab -l 2>/dev/null | grep -v "health-check.sh") | crontab -
  
  # Add new cron job to run every 3 minutes
  # Direct output to both a log file and to the main process stdout for Render logging
  (crontab -l 2>/dev/null; echo "*/3 * * * * $(pwd)/health-check.sh run") | crontab -
  
  log "Cron job set up to run every 3 minutes"
}

# Detect the base URL of the application
detect_base_url() {
  # Check if a custom domain is set in an environment variable
  if [ -n "$APP_DOMAIN" ]; then
    BASE_URL="https://$APP_DOMAIN"
    log "Using configured domain: $BASE_URL"
    return
  fi
  
  # Try to detect from Render environment variables
  if [ -n "$RENDER_EXTERNAL_URL" ]; then
    BASE_URL="$RENDER_EXTERNAL_URL"
    log "Detected Render URL: $BASE_URL"
    return
  fi
  
  # If both methods fail, try to detect from server config
  if [ -f "/home/plik/server/plikd.cfg" ]; then
    PORT=$(grep -E "ListenPort\s*=" /home/plik/server/plikd.cfg | sed -E 's/.*=\s*([0-9]+).*/\1/' || echo "8080")
    BASE_URL="http://localhost:$PORT"
    log "Using configuration file port: $BASE_URL"
    return
  fi
  
  # Fallback to default port
  BASE_URL="http://localhost:8080"
  log "Fallback to default URL: $BASE_URL"
}

# Run the health check
run_health_check() {
  detect_base_url
  
  # Ping the base URL and capture the response
  log "Pinging $BASE_URL"
  
  START_TIME=$(date +%s)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
  END_TIME=$(date +%s)
  
  # Calculate response time without using bc
  RESPONSE_TIME=$((END_TIME - START_TIME))
  
  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    log "Health check successful - HTTP $HTTP_CODE - Response time: ${RESPONSE_TIME}s"
  else
    log "Health check failed - HTTP $HTTP_CODE - Response time: ${RESPONSE_TIME}s"
  fi
}

# Main execution logic
case "$1" in
  setup)
    setup_cron
    ;;
  run)
    run_health_check
    ;;
  *)
    # If no argument is provided, run both setup and first health check
    setup_cron
    run_health_check
    ;;
esac 