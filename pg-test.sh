#!/bin/bash

# This script tests the PostgreSQL connection before starting the application

echo "Testing PostgreSQL connection..."

# Extract connection parts from the connection string
# Note: This assumes the connection string is in the format:
# postgres://username:password@hostname:port/database
CONNECTION_STRING="${PLIKD_METADATA_BACKEND_CONFIG_CONNECTION_STRING}"

# Extract the host and port
HOST=$(echo "$CONNECTION_STRING" | grep -oP '(?<=@)[^:]+(?=:)')
PORT=$(echo "$CONNECTION_STRING" | grep -oP '(?<=:)[0-9]+(?=/)')
DBNAME=$(echo "$CONNECTION_STRING" | grep -oP '(?<=/)[^?]+')

echo "Attempting to connect to PostgreSQL server at $HOST:$PORT..."

# Use pg_isready to check if PostgreSQL is accepting connections
pg_isready -h "$HOST" -p "$PORT"
RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo "PostgreSQL server at $HOST:$PORT is accepting connections."
  echo "Database $DBNAME will be used by StickyNotes."
  exit 0
else
  echo "WARNING: Could not connect to PostgreSQL server at $HOST:$PORT"
  echo "The application may still start but might fail to connect to the database."
  echo "Please check your connection string and ensure the PostgreSQL server is running."
  exit 1
fi 