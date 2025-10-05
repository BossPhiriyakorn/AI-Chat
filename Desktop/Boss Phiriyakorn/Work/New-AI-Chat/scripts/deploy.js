#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`\n${colors.cyan}${description}...${colors.reset}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`${colors.green}✓ ${description} completed${colors.reset}`);
    return output;
  } catch (error) {
    log(`${colors.red}✗ ${description} failed: ${error.message}${colors.reset}`);
    throw error;
  }
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'blue');
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      throw new Error(`Node.js version 18+ required, found ${nodeVersion}`);
    }
    log(`✓ Node.js ${nodeVersion}`, 'green');
  } catch (error) {
    log(`✗ Node.js check failed: ${error.message}`, 'red');
    process.exit(1);
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`✓ npm ${npmVersion}`, 'green');
  } catch (error) {
    log(`✗ npm check failed: ${error.message}`, 'red');
    process.exit(1);
  }

  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    log('⚠️  .env file not found. Please create it from env.example', 'yellow');
    process.exit(1);
  }
  log('✓ .env file found', 'green');
}

function installDependencies() {
  log('\n📦 Installing dependencies...', 'blue');
  execCommand('npm ci --only=production', 'Installing production dependencies');
}

function validateEnvironment() {
  log('\n🔧 Validating environment...', 'blue');
  
  try {
    require('dotenv').config();
    const ValidationUtils = require('../src/utils/validation');
    ValidationUtils.validateAll();
    log('✓ Environment validation passed', 'green');
  } catch (error) {
    log(`✗ Environment validation failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function createDirectories() {
  log('\n📁 Creating directories...', 'blue');
  
  const directories = ['logs'];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✓ Created directory: ${dir}`, 'green');
    } else {
      log(`✓ Directory exists: ${dir}`, 'green');
    }
  });
}

function startApplication() {
  const environment = process.env.NODE_ENV || 'production';
  
  log(`\n🚀 Starting application in ${environment} mode...`, 'blue');
  
  if (environment === 'production') {
    // Check if PM2 is available
    try {
      execSync('pm2 --version', { encoding: 'utf8', stdio: 'pipe' });
      log('✓ PM2 found, starting with PM2', 'green');
      execCommand('pm2 start ecosystem.config.js --env production', 'Starting with PM2');
    } catch (error) {
      log('⚠️  PM2 not found, starting with Node.js directly', 'yellow');
      log('To install PM2: npm install -g pm2', 'yellow');
      execCommand('node src/app.js', 'Starting application');
    }
  } else {
    log('✓ Starting in development mode', 'green');
    execCommand('npm run dev', 'Starting development server');
  }
}

function showDeploymentInfo() {
  log('\n🎉 Deployment completed successfully!', 'green');
  log('\n📋 Deployment Information:', 'blue');
  log(`   Environment: ${process.env.NODE_ENV || 'production'}`, 'cyan');
  log(`   Port: ${process.env.PORT || 3000}`, 'cyan');
  log(`   Health Check: http://localhost:${process.env.PORT || 3000}/health`, 'cyan');
  log(`   Ping: http://localhost:${process.env.PORT || 3000}/ping`, 'cyan');
  
  log('\n🔧 Useful Commands:', 'blue');
  log('   Health Check: npm run health', 'cyan');
  log('   View Logs: npm run pm2:logs', 'cyan');
  log('   Monitor: npm run pm2:monit', 'cyan');
  log('   Restart: npm run pm2:restart', 'cyan');
  log('   Stop: npm run pm2:stop', 'cyan');
}

function main() {
  const environment = process.argv[2] || 'production';
  
  log('🚀 LINE AI Chatbot Deployment Script', 'bright');
  log(`   Environment: ${environment}`, 'cyan');
  log(`   Time: ${new Date().toISOString()}`, 'cyan');
  
  try {
    checkPrerequisites();
    installDependencies();
    validateEnvironment();
    createDirectories();
    startApplication();
    showDeploymentInfo();
  } catch (error) {
    log(`\n💥 Deployment failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n⚠️  Deployment interrupted by user', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  Deployment terminated', 'yellow');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  checkPrerequisites,
  installDependencies,
  validateEnvironment,
  createDirectories,
  startApplication
};
