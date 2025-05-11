#!/bin/bash

# Script for manually running the health check and viewing the logs in Render

echo "Running manual health check..."
echo "==============================================="

# Manually run the health check once
/home/plik/health-check.sh run

echo "==============================================="
echo "Health check complete."
echo ""
echo "To view ongoing health check logs from cron, run:"
echo "ps -ef | grep plikd    (to verify the main process ID)"
echo ""
echo "Current crontab setup:"
crontab -l | grep health-check 