#!/bin/bash

# This script is meant to be run in the Render.com environment to properly initialize the application

# Create a temporary directory for app usage
mkdir -p /tmp/plik
chmod -R 777 /tmp/plik

# Set environment variables
export TMPDIR=/tmp/plik

# Print environment info for logging
echo "Starting StickyNotes with PostgreSQL database"
echo "Database Driver: $PLIKD_METADATA_BACKEND_CONFIG_DRIVER"
echo "Database Connection: Using connection string from environment variable"

# Test PostgreSQL connection
if [ -n "$PLIKD_METADATA_BACKEND_CONFIG_CONNECTION_STRING" ]; then
  echo "Testing PostgreSQL connection..."
  
  # Extract the host and port
  HOST=$(echo "$PLIKD_METADATA_BACKEND_CONFIG_CONNECTION_STRING" | grep -oP '(?<=@)[^:]+(?=:)')
  PORT=$(echo "$PLIKD_METADATA_BACKEND_CONFIG_CONNECTION_STRING" | grep -oP '(?<=:)[0-9]+(?=/)')
  DBNAME=$(echo "$PLIKD_METADATA_BACKEND_CONFIG_CONNECTION_STRING" | grep -oP '(?<=/)[^?]+')
  
  echo "Attempting to connect to PostgreSQL server at $HOST:$PORT..."
  
  # Use pg_isready to check if PostgreSQL is accepting connections
  pg_isready -h "$HOST" -p "$PORT"
  if [ $? -eq 0 ]; then
    echo "PostgreSQL server at $HOST:$PORT is accepting connections."
    echo "Database $DBNAME will be used by StickyNotes."
  else
    echo "WARNING: Could not connect to PostgreSQL server at $HOST:$PORT"
    echo "The application may still start but might fail to connect to the database."
  fi
fi

# Start the application (move to server directory and run plikd)
cd /home/plik/server
./plikd 