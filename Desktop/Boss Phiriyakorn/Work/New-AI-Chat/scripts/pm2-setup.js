#!/usr/bin/env node

/**
 * PM2 Setup Script for LINE AI Chatbot
 * 
 * This script helps set up PM2 for production deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function checkPM2Installed() {
  try {
    execSync('pm2 --version', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

function installPM2() {
  log('\n📦 Installing PM2...', 'blue');
  try {
    execCommand('npm install -g pm2', 'Installing PM2 globally');
    return true;
  } catch (error) {
    log('Failed to install PM2. Please install manually:', 'red');
    log('npm install -g pm2', 'cyan');
    return false;
  }
}

function setupPM2() {
  log('\n🔧 Setting up PM2...', 'blue');
  
  try {
    // Start the application
    execCommand('pm2 start ecosystem.config.js --env production', 'Starting application with PM2');
    
    // Save PM2 configuration
    execCommand('pm2 save', 'Saving PM2 configuration');
    
    // Set up startup script
    try {
      execCommand('pm2 startup', 'Setting up PM2 startup script');
      log('Please run the command shown above as root/sudo to enable auto-start', 'yellow');
    } catch (error) {
      log('PM2 startup setup failed. You may need to run it manually:', 'yellow');
      log('pm2 startup', 'cyan');
    }
    
    return true;
  } catch (error) {
    log('PM2 setup failed:', 'red');
    return false;
  }
}

function showPM2Status() {
  log('\n📊 PM2 Status:', 'blue');
  try {
    execCommand('pm2 status', 'Getting PM2 status');
  } catch (error) {
    log('Failed to get PM2 status', 'red');
  }
}

function showPM2Logs() {
  log('\n📝 Recent PM2 Logs:', 'blue');
  try {
    execCommand('pm2 logs line-ai-chatbot --lines 10', 'Getting recent logs');
  } catch (error) {
    log('Failed to get PM2 logs', 'red');
  }
}

function showPM2Info() {
  log('\nℹ️ PM2 Information:', 'blue');
  try {
    execCommand('pm2 info line-ai-chatbot', 'Getting PM2 info');
  } catch (error) {
    log('Failed to get PM2 info', 'red');
  }
}

function showUsefulCommands() {
  log('\n🔧 Useful PM2 Commands:', 'blue');
  log('  pm2 status                    - Show status of all processes', 'cyan');
  log('  pm2 logs line-ai-chatbot      - Show logs for the chatbot', 'cyan');
  log('  pm2 restart line-ai-chatbot   - Restart the chatbot', 'cyan');
  log('  pm2 reload line-ai-chatbot    - Reload the chatbot (zero-downtime)', 'cyan');
  log('  pm2 stop line-ai-chatbot      - Stop the chatbot', 'cyan');
  log('  pm2 delete line-ai-chatbot    - Delete the chatbot from PM2', 'cyan');
  log('  pm2 monit                     - Monitor resources in real-time', 'cyan');
  log('  pm2 save                      - Save current process list', 'cyan');
  log('  pm2 startup                   - Generate startup script', 'cyan');
  log('  pm2 unstartup                 - Remove startup script', 'cyan');
}

function main() {
  log('🚀 PM2 Setup Script for LINE AI Chatbot', 'bright');
  log('========================================', 'bright');
  
  // Check if PM2 is installed
  if (!checkPM2Installed()) {
    log('PM2 is not installed. Installing...', 'yellow');
    if (!installPM2()) {
      log('Failed to install PM2. Please install manually and try again.', 'red');
      process.exit(1);
    }
  } else {
    log('✓ PM2 is already installed', 'green');
  }
  
  // Check if ecosystem.config.js exists
  if (!fs.existsSync('ecosystem.config.js')) {
    log('ecosystem.config.js not found. Please ensure it exists.', 'red');
    process.exit(1);
  }
  
  // Check if .env file exists
  if (!fs.existsSync('.env')) {
    log('.env file not found. Please create it from env.example.', 'red');
    process.exit(1);
  }
  
  // Set up PM2
  if (setupPM2()) {
    log('\n✅ PM2 setup completed successfully!', 'green');
    
    showPM2Status();
    showPM2Logs();
    showPM2Info();
    showUsefulCommands();
    
    log('\n🎉 Your LINE AI Chatbot is now running with PM2!', 'green');
    log('The application will automatically restart if it crashes.', 'cyan');
    log('Use the commands above to manage your application.', 'cyan');
  } else {
    log('\n❌ PM2 setup failed. Please check the errors above.', 'red');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('PM2 Setup Script for LINE AI Chatbot', 'bright');
  log('Usage: node scripts/pm2-setup.js [options]', 'cyan');
  log('', 'reset');
  log('Options:', 'blue');
  log('  --help, -h     Show this help message', 'cyan');
  log('  --status       Show PM2 status only', 'cyan');
  log('  --logs         Show PM2 logs only', 'cyan');
  log('  --info         Show PM2 info only', 'cyan');
  process.exit(0);
}

if (process.argv.includes('--status')) {
  showPM2Status();
  process.exit(0);
}

if (process.argv.includes('--logs')) {
  showPM2Logs();
  process.exit(0);
}

if (process.argv.includes('--info')) {
  showPM2Info();
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  checkPM2Installed,
  installPM2,
  setupPM2,
  showPM2Status,
  showPM2Logs,
  showPM2Info
};