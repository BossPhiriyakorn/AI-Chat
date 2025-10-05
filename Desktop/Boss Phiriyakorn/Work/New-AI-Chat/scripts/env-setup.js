#!/usr/bin/env node

/**
 * Environment Setup Script for LINE AI Chatbot
 * 
 * This script helps set up the environment variables and validates the configuration.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function validateApiKey(key) {
  return key && key.length > 10;
}

function validateDocumentId(id) {
  return id && id.length > 10;
}

async function setupEnvironment() {
  log('🔧 Environment Setup for LINE AI Chatbot', 'bright');
  log('==========================================', 'bright');
  
  const rl = createReadlineInterface();
  
  try {
    // Check if .env already exists
    if (fs.existsSync('.env')) {
      const overwrite = await askQuestion(rl, '⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        log('Setup cancelled.', 'yellow');
        rl.close();
        return;
      }
    }
    
    log('\n📋 Please provide the following information:', 'blue');
    log('(Press Enter to skip optional fields)', 'cyan');
    
    // LINE Configuration
    log('\n💬 LINE Configuration:', 'blue');
    const lineChannelAccessToken = await askQuestion(rl, 'LINE Channel Access Token: ');
    const lineChannelSecret = await askQuestion(rl, 'LINE Channel Secret: ');
    
    // Google AI Configuration
    log('\n🤖 Google AI (Gemini) Configuration:', 'blue');
    const geminiApiKey = await askQuestion(rl, 'Gemini API Key: ');
    const geminiModel = await askQuestion(rl, 'Gemini Model (default: gemini-2.5-flash): ') || 'gemini-2.5-flash';
    
    // Google Docs Configuration
    log('\n📄 Google Docs Configuration:', 'blue');
    const googleDocsId = await askQuestion(rl, 'Google Docs ID: ');
    const googleCredentialsPath = await askQuestion(rl, 'Google Credentials JSON file path (default: ./google-credentials.json): ') || './google-credentials.json';
    
    // Google Sheets Configuration
    log('\n📊 Google Sheets Configuration:', 'blue');
    const googleSheetsId = await askQuestion(rl, 'Google Sheets ID: ');
    const googleSheetsRange = await askQuestion(rl, 'Google Sheets Range (default: Sheet1!B:C): ') || 'Sheet1!B:C';
    
    // Server Configuration
    log('\n🖥️  Server Configuration:', 'blue');
    const port = await askQuestion(rl, 'Port (default: 3000): ') || '3000';
    const nodeEnv = await askQuestion(rl, 'Node Environment (development/production, default: development): ') || 'development';
    const logLevel = await askQuestion(rl, 'Log Level (error/warn/info/debug, default: info): ') || 'info';
    
    rl.close();
    
    // Validate required fields
    const errors = [];
    
    if (!lineChannelAccessToken) errors.push('LINE Channel Access Token is required');
    if (!lineChannelSecret) errors.push('LINE Channel Secret is required');
    if (!geminiApiKey) errors.push('Gemini API Key is required');
    if (!googleDocsId) errors.push('Google Docs ID is required');
    if (!googleSheetsId) errors.push('Google Sheets ID is required');
    
    if (errors.length > 0) {
      log('\n❌ Validation errors:', 'red');
      errors.forEach(error => log(`  - ${error}`, 'red'));
      log('\nPlease run the setup again with all required fields.', 'yellow');
      return;
    }
    
    // Validate formats
    if (!validateApiKey(geminiApiKey)) {
      log('⚠️  Warning: Gemini API Key format may be invalid', 'yellow');
    }
    
    if (!validateDocumentId(googleDocsId)) {
      log('⚠️  Warning: Google Docs ID format may be invalid', 'yellow');
    }
    
    if (!validateDocumentId(googleSheetsId)) {
      log('⚠️  Warning: Google Sheets ID format may be invalid', 'yellow');
    }
    
    // Check if credentials file exists
    if (!fs.existsSync(googleCredentialsPath)) {
      log('⚠️  Warning: Google Credentials file not found. Please ensure the file exists.', 'yellow');
    }
    
    // Create .env file
    const envContent = `# LINE Messaging API Configuration
LINE_CHANNEL_ACCESS_TOKEN=${lineChannelAccessToken}
LINE_CHANNEL_SECRET=${lineChannelSecret}

# Google AI (Gemini) Configuration
GEMINI_API_KEY=${geminiApiKey}
GEMINI_MODEL=${geminiModel}

# Google Docs Configuration
GOOGLE_DOCS_ID=${googleDocsId}
GOOGLE_CREDENTIALS_PATH=${googleCredentialsPath}

# Google Sheets Configuration
GOOGLE_SHEETS_ID=${googleSheetsId}
GOOGLE_SHEETS_RANGE=${googleSheetsRange}

# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Logging
LOG_LEVEL=${logLevel}
`;
    
    fs.writeFileSync('.env', envContent);
    log('\n✅ .env file created successfully!', 'green');
    
    // Test the configuration
    log('\n🧪 Testing configuration...', 'blue');
    try {
      require('dotenv').config();
      const ValidationUtils = require('../src/utils/validation');
      ValidationUtils.validateAll();
      log('✅ Configuration validation passed!', 'green');
    } catch (error) {
      log('❌ Configuration validation failed:', 'red');
      log(`  ${error.message}`, 'red');
      log('\nPlease check your configuration and try again.', 'yellow');
      return;
    }
    
    log('\n🎉 Environment setup completed successfully!', 'green');
    log('\nNext steps:', 'blue');
    log('  1. Run: npm test', 'cyan');
    log('  2. Run: npm run dev', 'cyan');
    log('  3. Test your webhook with ngrok', 'cyan');
    
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    rl.close();
  }
}

function showCurrentConfig() {
  log('📋 Current Environment Configuration:', 'bright');
  log('====================================', 'bright');
  
  if (!fs.existsSync('.env')) {
    log('❌ .env file not found. Run setup first.', 'red');
    return;
  }
  
  try {
    require('dotenv').config();
    const config = require('../src/config');
    
    log(`\n💬 LINE Configuration:`, 'blue');
    log(`  Channel Access Token: ${config.line.channelAccessToken ? '✓ Set' : '✗ Not set'}`, 'cyan');
    log(`  Channel Secret: ${config.line.channelSecret ? '✓ Set' : '✗ Not set'}`, 'cyan');
    
    log(`\n🤖 Google AI Configuration:`, 'blue');
    log(`  API Key: ${config.gemini.apiKey ? '✓ Set' : '✗ Not set'}`, 'cyan');
    log(`  Model: ${config.gemini.model}`, 'cyan');
    
    log(`\n📄 Google Docs Configuration:`, 'blue');
    log(`  Document ID: ${config.googleDocs.documentId ? '✓ Set' : '✗ Not set'}`, 'cyan');
    log(`  Credentials Path: ${config.googleDocs.credentialsPath}`, 'cyan');
    
    log(`\n📊 Google Sheets Configuration:`, 'blue');
    log(`  Spreadsheet ID: ${config.googleSheets.spreadsheetId ? '✓ Set' : '✗ Not set'}`, 'cyan');
    log(`  Range: ${config.googleSheets.range}`, 'cyan');
    
    log(`\n🖥️  Server Configuration:`, 'blue');
    log(`  Port: ${config.port}`, 'cyan');
    log(`  Environment: ${config.nodeEnv}`, 'cyan');
    log(`  Log Level: ${config.logging.level}`, 'cyan');
    
  } catch (error) {
    log(`❌ Error reading configuration: ${error.message}`, 'red');
  }
}

function validateConfig() {
  log('🧪 Validating Environment Configuration:', 'bright');
  log('========================================', 'bright');
  
  if (!fs.existsSync('.env')) {
    log('❌ .env file not found. Run setup first.', 'red');
    return;
  }
  
  try {
    require('dotenv').config();
    const ValidationUtils = require('../src/utils/validation');
    ValidationUtils.validateAll();
    log('✅ All validations passed!', 'green');
  } catch (error) {
    log('❌ Validation failed:', 'red');
    log(`  ${error.message}`, 'red');
  }
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case '--help':
    case '-h':
      log('Environment Setup Script for LINE AI Chatbot', 'bright');
      log('Usage: node scripts/env-setup.js [command]', 'cyan');
      log('', 'reset');
      log('Commands:', 'blue');
      log('  setup        Interactive setup (default)', 'cyan');
      log('  show         Show current configuration', 'cyan');
      log('  validate     Validate current configuration', 'cyan');
      log('  --help, -h   Show this help message', 'cyan');
      break;
      
    case 'show':
      showCurrentConfig();
      break;
      
    case 'validate':
      validateConfig();
      break;
      
    case 'setup':
    default:
      setupEnvironment();
      break;
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  setupEnvironment,
  showCurrentConfig,
  validateConfig
};
