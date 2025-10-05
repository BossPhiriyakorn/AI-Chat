@echo off
REM Deployment script for LINE AI Chatbot
REM Usage: scripts\deploy.bat [environment]

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo Deploying to %ENVIRONMENT% environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is required but not installed. Aborting.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo npm is required but not installed. Aborting.
    exit /b 1
)

REM Install dependencies
echo Installing dependencies...
npm ci --only=production
if errorlevel 1 (
    echo Failed to install dependencies
    exit /b 1
)

REM Create logs directory
if not exist logs mkdir logs

REM Set environment
set NODE_ENV=%ENVIRONMENT%

REM Validate environment variables
echo Validating environment variables...
node -e "require('dotenv').config(); const ValidationUtils = require('./src/utils/validation'); try { ValidationUtils.validateAll(); console.log('Environment validation passed'); } catch (error) { console.error('Environment validation failed:', error.message); process.exit(1); }"
if errorlevel 1 (
    echo Environment validation failed
    exit /b 1
)

REM Start the application
echo Starting application...
if "%ENVIRONMENT%"=="production" (
    REM Use PM2 for production
    pm2 --version >nul 2>&1
    if errorlevel 1 (
        echo PM2 is required for production deployment. Install with: npm install -g pm2
        exit /b 1
    )
    
    pm2 start src/app.js --name "line-ai-chatbot" --instances max --env production
    pm2 save
    pm2 startup
) else (
    REM Use nodemon for development
    npm run dev
)

echo Deployment completed successfully!
