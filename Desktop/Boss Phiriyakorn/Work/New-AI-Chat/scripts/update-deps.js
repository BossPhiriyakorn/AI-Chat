#!/usr/bin/env node

/**
 * Dependency Update Script for LINE AI Chatbot
 * 
 * This script helps update dependencies and check for security vulnerabilities.
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

function checkNpmVersion() {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    log(`✓ npm version: ${version}`, 'green');
    return version;
  } catch (error) {
    log('✗ npm not found', 'red');
    throw error;
  }
}

function checkNodeVersion() {
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    log(`✓ Node.js version: ${version}`, 'green');
    return version;
  } catch (error) {
    log('✗ Node.js not found', 'red');
    throw error;
  }
}

function checkOutdatedPackages() {
  try {
    log('\n📦 Checking for outdated packages...', 'blue');
    const output = execSync('npm outdated', { encoding: 'utf8', stdio: 'pipe' });
    
    if (output.trim()) {
      log('Outdated packages found:', 'yellow');
      log(output, 'cyan');
      return true;
    } else {
      log('✓ All packages are up to date', 'green');
      return false;
    }
  } catch (error) {
    // npm outdated returns exit code 1 when packages are outdated
    if (error.status === 1) {
      log('Outdated packages found:', 'yellow');
      log(error.stdout, 'cyan');
      return true;
    } else {
      log('Error checking outdated packages:', 'red');
      throw error;
    }
  }
}

function checkSecurityVulnerabilities() {
  try {
    log('\n🔒 Checking for security vulnerabilities...', 'blue');
    const output = execSync('npm audit', { encoding: 'utf8', stdio: 'pipe' });
    
    if (output.includes('found 0 vulnerabilities')) {
      log('✓ No security vulnerabilities found', 'green');
      return false;
    } else {
      log('Security vulnerabilities found:', 'yellow');
      log(output, 'cyan');
      return true;
    }
  } catch (error) {
    if (error.status === 1) {
      log('Security vulnerabilities found:', 'yellow');
      log(error.stdout, 'cyan');
      return true;
    } else {
      log('Error checking security vulnerabilities:', 'red');
      throw error;
    }
  }
}

function updateDependencies() {
  try {
    log('\n🔄 Updating dependencies...', 'blue');
    execCommand('npm update', 'Updating dependencies');
    return true;
  } catch (error) {
    log('Failed to update dependencies:', 'red');
    return false;
  }
}

function updateToLatest() {
  try {
    log('\n🚀 Updating to latest versions...', 'blue');
    execCommand('npm update --save', 'Updating to latest versions');
    return true;
  } catch (error) {
    log('Failed to update to latest versions:', 'red');
    return false;
  }
}

function fixSecurityVulnerabilities() {
  try {
    log('\n🔧 Fixing security vulnerabilities...', 'blue');
    execCommand('npm audit fix', 'Fixing security vulnerabilities');
    return true;
  } catch (error) {
    log('Failed to fix security vulnerabilities:', 'red');
    return false;
  }
}

function fixSecurityVulnerabilitiesForce() {
  try {
    log('\n🔧 Force fixing security vulnerabilities...', 'blue');
    execCommand('npm audit fix --force', 'Force fixing security vulnerabilities');
    return true;
  } catch (error) {
    log('Failed to force fix security vulnerabilities:', 'red');
    return false;
  }
}

function installDependencies() {
  try {
    log('\n📦 Installing dependencies...', 'blue');
    execCommand('npm install', 'Installing dependencies');
    return true;
  } catch (error) {
    log('Failed to install dependencies:', 'red');
    return false;
  }
}

function cleanInstall() {
  try {
    log('\n🧹 Performing clean install...', 'blue');
    
    // Remove node_modules and package-lock.json
    if (fs.existsSync('node_modules')) {
      execCommand('rm -rf node_modules', 'Removing node_modules');
    }
    
    if (fs.existsSync('package-lock.json')) {
      execCommand('rm package-lock.json', 'Removing package-lock.json');
    }
    
    // Install fresh
    execCommand('npm install', 'Installing fresh dependencies');
    return true;
  } catch (error) {
    log('Failed to perform clean install:', 'red');
    return false;
  }
}

function showDependencyInfo() {
  try {
    log('\n📊 Dependency Information:', 'blue');
    
    // Show installed packages
    execCommand('npm list --depth=0', 'Showing installed packages');
    
    // Show package.json info
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    log(`\nPackage: ${packageJson.name}`, 'cyan');
    log(`Version: ${packageJson.version}`, 'cyan');
    log(`Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`, 'cyan');
    log(`Dev Dependencies: ${Object.keys(packageJson.devDependencies || {}).length}`, 'cyan');
    
  } catch (error) {
    log('Failed to show dependency info:', 'red');
  }
}

function main() {
  const command = process.argv[2];
  
  log('📦 Dependency Update Script for LINE AI Chatbot', 'bright');
  log('==============================================', 'bright');
  
  try {
    // Check prerequisites
    checkNodeVersion();
    checkNpmVersion();
    
    switch (command) {
      case '--help':
      case '-h':
        log('Dependency Update Script for LINE AI Chatbot', 'bright');
        log('Usage: node scripts/update-deps.js [command]', 'cyan');
        log('', 'reset');
        log('Commands:', 'blue');
        log('  check         Check for outdated packages and vulnerabilities', 'cyan');
        log('  update        Update dependencies to latest compatible versions', 'cyan');
        log('  latest        Update to latest versions (may break compatibility)', 'cyan');
        log('  audit         Check for security vulnerabilities', 'cyan');
        log('  fix           Fix security vulnerabilities', 'cyan');
        log('  fix-force     Force fix security vulnerabilities', 'cyan');
        log('  install       Install dependencies', 'cyan');
        log('  clean         Perform clean install', 'cyan');
        log('  info          Show dependency information', 'cyan');
        log('  --help, -h    Show this help message', 'cyan');
        break;
        
      case 'check':
        checkOutdatedPackages();
        checkSecurityVulnerabilities();
        break;
        
      case 'update':
        updateDependencies();
        break;
        
      case 'latest':
        updateToLatest();
        break;
        
      case 'audit':
        checkSecurityVulnerabilities();
        break;
        
      case 'fix':
        fixSecurityVulnerabilities();
        break;
        
      case 'fix-force':
        fixSecurityVulnerabilitiesForce();
        break;
        
      case 'install':
        installDependencies();
        break;
        
      case 'clean':
        cleanInstall();
        break;
        
      case 'info':
        showDependencyInfo();
        break;
        
      default:
        log('No command specified. Running check...', 'yellow');
        checkOutdatedPackages();
        checkSecurityVulnerabilities();
        break;
    }
    
  } catch (error) {
    log(`\n❌ Script failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  checkOutdatedPackages,
  checkSecurityVulnerabilities,
  updateDependencies,
  updateToLatest,
  fixSecurityVulnerabilities,
  fixSecurityVulnerabilitiesForce,
  installDependencies,
  cleanInstall,
  showDependencyInfo
};
