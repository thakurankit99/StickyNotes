# PostgreSQL Setup for StickyNotes (Plik)

## Overview

This document outlines how PostgreSQL has been configured for the StickyNotes application (based on Plik) for deployment on Render.com.

## Configuration Changes

The following changes have been made to enable PostgreSQL support:

1. **Environment Variables in render.yaml**:
   - Added `PLIKD_METADATA_BACKEND_CONFIG_DRIVER=postgres` to specify PostgreSQL as the database driver
   - Added `PLIKD_METADATA_BACKEND_CONFIG_CONNECTION_STRING` with the provided connection string

2. **Docker Container Updates**:
   - Added PostgreSQL client libraries to the Docker image (`postgresql-client` package)
   - This enables the container to connect to PostgreSQL and run connection tests

3. **Initialization Script (render-init.sh)**:
   - Enhanced to display PostgreSQL connection information
   - Added connection testing using `pg_isready` to verify database connectivity before starting the application
   - Provides helpful error messages if the database cannot be reached

4. **Documentation**:
   - Created this guide and POSTGRES.md to document the PostgreSQL integration

## How It Works

The Plik application (which has been re-themed as StickyNotes) has built-in support for PostgreSQL as one of its metadata backends. The configuration works as follows:

1. Environment variables override the default configuration in `plikd.cfg`
2. At startup, the application connects to PostgreSQL using the provided connection string
3. Database tables are automatically created if they don't exist (schema migration is handled by the application)

## Verification

When the application starts on Render.com, you should see logs indicating:
- "Starting StickyNotes with PostgreSQL database"
- Connection test results to the PostgreSQL server
- Any database-related errors (if they occur)

## Troubleshooting

If the application fails to connect to PostgreSQL:

1. **Check connection string**: Verify the connection string is correctly formatted
2. **Check network access**: Ensure Render.com has network access to your PostgreSQL server
3. **Check database user permissions**: Ensure the database user has necessary privileges
4. **Check logs**: Review the Render.com logs for specific error messages

## Additional Information

- The application uses [GORM](https://gorm.io/) as its ORM layer
- Tables are automatically created and migrated during initial startup
- The schema structure is compatible with PostgreSQL, MySQL, and SQLite 