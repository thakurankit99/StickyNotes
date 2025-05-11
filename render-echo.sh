#!/bin/bash

# Helper script to send cron job output to Render logs
# Since cron jobs run in a different environment, they need help to get output to the main logs

# Obtain the Render process ID (to redirect to the main process stdout)
RENDER_PID=$(ps -ef | grep "plikd" | grep -v grep | awk '{print $1}')

# Read from stdin and direct to the main process stdout
while read line; do
  if [ -n "$RENDER_PID" ] && [ -e "/proc/$RENDER_PID/fd/1" ]; then
    # If plikd is running, redirect to its stdout
    echo "$line" > "/proc/$RENDER_PID/fd/1"
  else
    # Just in case standard process is not found, log to docker's stdout
    echo "$line" > /proc/1/fd/1
  fi
done 