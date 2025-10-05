#!/usr/bin/env node

/**
 * Log Rotation Script for LINE AI Chatbot
 * 
 * This script handles log rotation to prevent log files from growing too large.
 * It can be run manually or via cron job.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const LOG_DIR = 'logs';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

function rotateLogFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    if (fileSize < MAX_FILE_SIZE) {
      log(`File ${path.basename(filePath)} is ${(fileSize / 1024 / 1024).toFixed(2)}MB, no rotation needed`, 'cyan');
      return false;
    }
    
    log(`Rotating ${path.basename(filePath)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`, 'yellow');
    
    // Rotate existing files
    for (let i = MAX_FILES - 1; i > 0; i--) {
      const oldFile = `${filePath}.${i}`;
      const newFile = `${filePath}.${i + 1}`;
      
      if (fs.existsSync(oldFile)) {
        if (i === MAX_FILES - 1) {
          // Delete the oldest file
          fs.unlinkSync(oldFile);
          log(`Deleted old log file: ${path.basename(oldFile)}`, 'red');
        } else {
          // Move to next number
          fs.renameSync(oldFile, newFile);
          log(`Moved ${path.basename(oldFile)} to ${path.basename(newFile)}`, 'cyan');
        }
      }
    }
    
    // Move current file to .1
    fs.renameSync(filePath, `${filePath}.1`);
    log(`Moved ${path.basename(filePath)} to ${path.basename(filePath)}.1`, 'green');
    
    // Create new empty file
    fs.writeFileSync(filePath, '');
    log(`Created new log file: ${path.basename(filePath)}`, 'green');
    
    return true;
  } catch (error) {
    log(`Error rotating ${path.basename(filePath)}: ${error.message}`, 'red');
    return false;
  }
}

function compressOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const logFiles = files.filter(file => 
      file.endsWith('.log.1') || 
      file.endsWith('.log.2') || 
      file.endsWith('.log.3') || 
      file.endsWith('.log.4')
    );
    
    for (const file of logFiles) {
      const filePath = path.join(LOG_DIR, file);
      const compressedPath = `${filePath}.gz`;
      
      if (!fs.existsSync(compressedPath)) {
        try {
          execSync(`gzip "${filePath}"`, { stdio: 'pipe' });
          log(`Compressed ${file}`, 'green');
        } catch (error) {
          log(`Failed to compress ${file}: ${error.message}`, 'yellow');
        }
      }
    }
  } catch (error) {
    log(`Error compressing logs: ${error.message}`, 'red');
  }
}

function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const oldFiles = files.filter(file => 
      file.endsWith('.log.gz') && 
      file.match(/\.log\.\d+\.gz$/)
    );
    
    // Keep only the most recent compressed files
    const filesToDelete = oldFiles.slice(MAX_FILES);
    
    for (const file of filesToDelete) {
      const filePath = path.join(LOG_DIR, file);
      fs.unlinkSync(filePath);
      log(`Deleted old compressed log: ${file}`, 'red');
    }
  } catch (error) {
    log(`Error cleaning up old logs: ${error.message}`, 'red');
  }
}

function getLogStats() {
  try {
    const files = fs.readdirSync(LOG_DIR);
    const logFiles = files.filter(file => file.endsWith('.log'));
    
    let totalSize = 0;
    let fileCount = 0;
    
    for (const file of logFiles) {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      fileCount++;
    }
    
    return {
      totalSize,
      fileCount,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  } catch (error) {
    log(`Error getting log stats: ${error.message}`, 'red');
    return { totalSize: 0, fileCount: 0, totalSizeMB: '0.00' };
  }
}

function main() {
  log('🔄 Log Rotation Script for LINE AI Chatbot', 'bright');
  log('==========================================', 'bright');
  
  // Check if logs directory exists
  if (!fs.existsSync(LOG_DIR)) {
    log(`Logs directory not found: ${LOG_DIR}`, 'red');
    process.exit(1);
  }
  
  // Get initial stats
  const initialStats = getLogStats();
  log(`\n📊 Initial log stats:`, 'blue');
  log(`   Files: ${initialStats.fileCount}`, 'cyan');
  log(`   Total size: ${initialStats.totalSizeMB}MB`, 'cyan');
  
  // Rotate log files
  log('\n🔄 Rotating log files...', 'blue');
  const logFiles = ['combined.log', 'error.log'];
  let rotatedCount = 0;
  
  for (const logFile of logFiles) {
    const filePath = path.join(LOG_DIR, logFile);
    if (fs.existsSync(filePath)) {
      if (rotateLogFile(filePath)) {
        rotatedCount++;
      }
    }
  }
  
  // Compress old logs
  log('\n🗜️ Compressing old logs...', 'blue');
  compressOldLogs();
  
  // Cleanup old compressed logs
  log('\n🧹 Cleaning up old compressed logs...', 'blue');
  cleanupOldLogs();
  
  // Get final stats
  const finalStats = getLogStats();
  log(`\n📊 Final log stats:`, 'blue');
  log(`   Files: ${finalStats.fileCount}`, 'cyan');
  log(`   Total size: ${finalStats.totalSizeMB}MB`, 'cyan');
  
  // Summary
  log(`\n✅ Log rotation completed!`, 'green');
  log(`   Files rotated: ${rotatedCount}`, 'cyan');
  log(`   Size reduction: ${(parseFloat(initialStats.totalSizeMB) - parseFloat(finalStats.totalSizeMB)).toFixed(2)}MB`, 'cyan');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('Log Rotation Script for LINE AI Chatbot', 'bright');
  log('Usage: node scripts/log-rotation.js [options]', 'cyan');
  log('', 'reset');
  log('Options:', 'blue');
  log('  --help, -h     Show this help message', 'cyan');
  log('  --stats        Show log statistics only', 'cyan');
  log('  --compress     Compress old logs only', 'cyan');
  log('  --cleanup      Cleanup old logs only', 'cyan');
  process.exit(0);
}

if (process.argv.includes('--stats')) {
  const stats = getLogStats();
  log('📊 Log Statistics', 'bright');
  log('================', 'bright');
  log(`Files: ${stats.fileCount}`, 'cyan');
  log(`Total size: ${stats.totalSizeMB}MB`, 'cyan');
  process.exit(0);
}

if (process.argv.includes('--compress')) {
  log('🗜️ Compressing old logs...', 'blue');
  compressOldLogs();
  log('✅ Compression completed!', 'green');
  process.exit(0);
}

if (process.argv.includes('--cleanup')) {
  log('🧹 Cleaning up old logs...', 'blue');
  cleanupOldLogs();
  log('✅ Cleanup completed!', 'green');
  process.exit(0);
}

// Run main function
if (require.main === module) {
  main();
}

module.exports = {
  rotateLogFile,
  compressOldLogs,
  cleanupOldLogs,
  getLogStats
};
