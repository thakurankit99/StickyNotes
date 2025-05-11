#!/bin/bash

# Monitor health check logs script for Render
# This script helps monitor the health check logs in Render

echo "Monitoring health check logs. Press Ctrl+C to exit."
echo "-----------------------------------------------"

# Create the log file if it doesn't exist
touch /var/log/health-check.log

# Tail the health check log file
tail -f /var/log/health-check.log 