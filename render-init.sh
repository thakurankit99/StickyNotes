#!/bin/bash

# This script is meant to be run in the Render.com environment to properly initialize the application

# Create a temporary directory for app usage
mkdir -p /tmp/plik
chmod -R 777 /tmp/plik

# Set environment variables
export TMPDIR=/tmp/plik

# Start the application
cd /home/plik
./start.sh 