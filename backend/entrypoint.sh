#!/bin/sh
set -e

echo "Running migrations..."
npm run migrate:up

echo "Initializing admin user..."
node scripts/init-admin.js

echo "Starting server..."
exec node index.js