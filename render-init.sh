#!/bin/bash

# This script is meant to be run in the Render.com environment to properly initialize the application

# Create temporary directories with proper permissions
mkdir -p /tmp/nginx-logs /tmp/nginx-client-body /tmp/nginx-proxy
chmod -R 777 /tmp/nginx-logs /tmp/nginx-client-body /tmp/nginx-proxy

# Set environment variables to use these directories
export NGINX_LOG_PATH=/tmp/nginx-logs
export NGINX_TEMP_PATH=/tmp
export TMPDIR=/tmp

# Start the application
cd /home/plik
./start.sh 