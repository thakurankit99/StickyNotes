#!/bin/bash

# This script is meant to be run in the Render.com environment to properly initialize the application

# Create necessary directories with proper permissions
mkdir -p /tmp/nginx/logs
chmod 777 /tmp/nginx/logs
mkdir -p /tmp/nginx/client_body_temp
chmod 777 /tmp/nginx/client_body_temp
mkdir -p /tmp/nginx/proxy_temp
chmod 777 /tmp/nginx/proxy_temp

# Create and set permissions for Nginx logs directory
mkdir -p /var/log/nginx
chmod 777 /var/log/nginx
touch /var/log/nginx/error.log
touch /var/log/nginx/access.log
chmod 666 /var/log/nginx/error.log
chmod 666 /var/log/nginx/access.log

# Set environment variables for Nginx
export NGINX_ERROR_LOG_PATH=/tmp/nginx/logs/error.log
export NGINX_ACCESS_LOG_PATH=/tmp/nginx/logs/access.log
export NGINX_CLIENT_BODY_TEMP_PATH=/tmp/nginx/client_body_temp
export NGINX_PROXY_TEMP_PATH=/tmp/nginx/proxy_temp

# Update Nginx configuration
if [ -f /etc/nginx/nginx.conf ]; then
    # Create a backup of the original config
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak
    
    # Update error log path
    sed -i 's|error_log /var/log/nginx/error.log|error_log '"$NGINX_ERROR_LOG_PATH"'|g' /etc/nginx/nginx.conf
    
    # Update client body temp path and proxy temp path
    sed -i 's|client_body_temp_path /var/cache/nginx/client_temp|client_body_temp_path '"$NGINX_CLIENT_BODY_TEMP_PATH"'|g' /etc/nginx/nginx.conf
    sed -i 's|proxy_temp_path /var/cache/nginx/proxy_temp|proxy_temp_path '"$NGINX_PROXY_TEMP_PATH"'|g' /etc/nginx/nginx.conf
fi

# Start the application
cd /home/plik
./start.sh 