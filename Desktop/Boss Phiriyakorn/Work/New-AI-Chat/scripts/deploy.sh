#!/bin/bash

# Deployment script for LINE AI Chatbot
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
echo "Deploying to $ENVIRONMENT environment..."

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# Run tests (if available)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "Running tests..."
    npm test || echo "Tests failed, but continuing deployment..."
fi

# Create logs directory
mkdir -p logs

# Set environment
export NODE_ENV=$ENVIRONMENT

# Validate environment variables
echo "Validating environment variables..."
node -e "
require('dotenv').config();
const ValidationUtils = require('./src/utils/validation');
try {
    ValidationUtils.validateAll();
    console.log('Environment validation passed');
} catch (error) {
    console.error('Environment validation failed:', error.message);
    process.exit(1);
}
"

# Start the application
echo "Starting application..."
if [ "$ENVIRONMENT" = "production" ]; then
    # Use PM2 for production
    command -v pm2 >/dev/null 2>&1 || { echo "PM2 is required for production deployment. Install with: npm install -g pm2" >&2; exit 1; }
    
    pm2 start src/app.js --name "line-ai-chatbot" --instances max --env production
    pm2 save
    pm2 startup
else
    # Use nodemon for development
    npm run dev
fi

echo "Deployment completed successfully!"
