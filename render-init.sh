#!/bin/bash

# This script is meant to be run in the Render.com environment to properly initialize the application

# Create a temporary directory for app usage
mkdir -p /tmp/plik
chmod -R 777 /tmp/plik

# Set environment variables
export TMPDIR=/tmp/plik

# Make scripts executable
chmod +x /home/plik/health-check.sh
chmod +x /home/plik/monitor-health.sh

# Setup health check cron job in the background
/home/plik/health-check.sh setup &

# Start the application (move to server directory and run plikd)
cd /home/plik/server
./plikd 