const chalk = require('chalk');

class TerminalDisplayService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * แสดงหัวข้อหลัก
   * @param {string} title - หัวข้อ
   * @param {string} emoji - ไอคอน
   */
  showMainTitle(title, emoji = '🚀') {
    if (this.isProduction) return;
    
    console.log('\n' + '='.repeat(60));
    console.log(`${emoji} ${title}`);
    console.log('='.repeat(60));
  }

  /**
   * แสดงหัวข้อย่อย
   * @param {string} title - หัวข้อ
   * @param {string} emoji - ไอคอน
   */
  showSubTitle(title, emoji = '📋') {
    if (this.isProduction) return;
    
    console.log(`\n${emoji} ${title}`);
    console.log('-'.repeat(40));
  }

  /**
   * แสดงสถานะ API
   * @param {string} serviceName - ชื่อ service
   * @param {boolean} isAvailable - สถานะการใช้งาน
   * @param {string} details - รายละเอียดเพิ่มเติม
   */
  showApiStatus(serviceName, isAvailable, details = '') {
    if (this.isProduction) return;
    
    const status = isAvailable ? '✅ ใช้งานได้' : '❌ ไม่สามารถใช้งานได้';
    const color = isAvailable ? chalk.green : chalk.red;
    
    console.log('  ' + serviceName.padEnd(20) + ' : ' + color(status) + ' ' + details);
  }

  /**
   * แสดงข้อมูลที่ดึงมา
   * @param {string} source - แหล่งข้อมูล
   * @param {string} dataType - ประเภทข้อมูล
   * @param {number} count - จำนวนข้อมูล
   * @param {string} details - รายละเอียด
   */
  showDataInfo(source, dataType, count, details = '') {
    if (this.isProduction) return;
    
    const countText = count > 0 ? chalk.green(count + ' รายการ') : chalk.red('0 รายการ');
    console.log('  📊 ' + source.padEnd(15) + ' : ' + dataType.padEnd(20) + ' ' + countText + ' ' + details);
  }

  /**
   * แสดงข้อความแจ้งเตือน
   * @param {string} message - ข้อความ
   * @param {string} type - ประเภท (info, warning, error, success)
   */
  showMessage(message, type = 'info') {
    if (this.isProduction) return;
    
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };
    
    const colors = {
      info: chalk.blue,
      warning: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    
    console.log('  ' + icons[type] + ' ' + colors[type](message));
  }

  /**
   * แสดงข้อมูล Bot Configuration
   * @param {Object} config - ข้อมูล configuration
   */
  showBotConfig(config) {
    if (this.isProduction) return;
    
    this.showSubTitle('🤖 Bot Configuration', '🤖');
    
    if (config.botName) {
      console.log('  ชื่อบอท        : ' + chalk.cyan(config.botName));
    }
    
    if (config.personality) {
      const personality = config.personality.length > 50 
        ? config.personality.substring(0, 50) + '...' 
        : config.personality;
      console.log('  บุคลิกภาพ      : ' + chalk.cyan(personality));
    }
    
    if (config.language) {
      console.log('  ภาษา          : ' + chalk.cyan(config.language));
    }
    
    if (config.tone) {
      console.log('  โทนเสียง       : ' + chalk.cyan(config.tone));
    }
    
    if (config.businessInfo) {
      const businessInfo = config.businessInfo.length > 80 
        ? config.businessInfo.substring(0, 80) + '...' 
        : config.businessInfo;
      console.log('  ข้อมูลธุรกิจ    : ' + chalk.cyan(businessInfo));
    }
  }

  /**
   * แสดงข้อมูล Google Sheets
   * @param {Array} keywords - ข้อมูลคีย์เวิร์ด
   * @param {Array} sheetNames - ชื่อหน้า
   */
  showSheetsInfo(keywords, sheetNames) {
    if (this.isProduction) return;
    
    this.showSubTitle('📊 Google Sheets Data', '📊');
    
    if (sheetNames && sheetNames.length > 0) {
      console.log('  จำนวนหน้า     : ' + chalk.cyan(sheetNames.length) + ' หน้า');
      console.log('  ชื่อหน้า       : ' + chalk.cyan(sheetNames.join(', ')));
    }
    
    if (keywords && keywords.length > 0) {
      console.log('  จำนวนคีย์เวิร์ด : ' + chalk.green(keywords.length) + ' รายการ');
      
      // แสดงตัวอย่างคีย์เวิร์ด
      const sampleKeywords = keywords.slice(0, 5).map(k => k.keyword);
      if (sampleKeywords.length > 0) {
        console.log('  ตัวอย่างคีย์เวิร์ด : ' + chalk.cyan(sampleKeywords.join(', ')));
      }
    } else {
      console.log('  จำนวนคีย์เวิร์ด : ' + chalk.red('0 รายการ'));
    }
  }

  /**
   * แสดงข้อมูล Google Docs
   * @param {Object} docsData - ข้อมูลจาก Google Docs
   */
  showDocsInfo(docsData) {
    if (this.isProduction) return;
    
    this.showSubTitle('📄 Google Docs Data', '📄');
    
    if (docsData && docsData.fullContent) {
      const contentLength = docsData.fullContent.length;
      console.log('  ขนาดเอกสาร     : ' + chalk.cyan(contentLength.toLocaleString()) + ' ตัวอักษร');
      
      if (docsData.botName) {
        console.log('  ชื่อบอท        : ' + chalk.cyan(docsData.botName));
      }
      
      if (docsData.personality) {
        const personality = docsData.personality.length > 60 
          ? docsData.personality.substring(0, 60) + '...' 
          : docsData.personality;
        console.log('  บุคลิกภาพ      : ' + chalk.cyan(personality));
      }
      
      if (docsData.businessInfo) {
        const businessInfo = docsData.businessInfo.length > 60 
          ? docsData.businessInfo.substring(0, 60) + '...' 
          : docsData.businessInfo;
        console.log('  ข้อมูลธุรกิจ    : ' + chalk.cyan(businessInfo));
      }
    } else {
      console.log('  ข้อมูลเอกสาร     : ' + chalk.red('ไม่พบข้อมูล'));
    }
  }

  /**
   * แสดงสถานะการเชื่อมต่อ
   * @param {Object} status - สถานะการเชื่อมต่อ
   */
  showConnectionStatus(status) {
    if (this.isProduction) return;
    
    this.showSubTitle('🔗 API Connection Status', '🔗');
    
    this.showApiStatus('Gemini AI', status.gemini, 'Text Generation');
    this.showApiStatus('Google Docs', status.googleDocs, 'Bot Configuration');
    this.showApiStatus('Google Sheets', status.googleSheets, 'Keywords Database');
    this.showApiStatus('LINE Bot', status.lineBot, 'Messaging API');
  }

  /**
   * แสดงข้อมูลการประมวลผลข้อความ
   * @param {string} userId - User ID
   * @param {string} message - ข้อความ
   * @param {string} response - คำตอบ
   * @param {string} source - แหล่งที่มาของคำตอบ
   */
  showMessageProcessing(userId, message, response, source) {
    if (this.isProduction) return;
    
    console.log('\n' + chalk.blue('💬 Message Processing'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('  👤 User ID     : ' + chalk.cyan(userId));
    console.log('  📝 Message     : ' + chalk.yellow(message));
    console.log('  🤖 Response    : ' + chalk.green(response.substring(0, 100)) + (response.length > 100 ? '...' : ''));
    console.log('  📍 Source      : ' + chalk.magenta(source));
  }

  /**
   * แสดงข้อมูลการเริ่มต้นระบบ
   * @param {Object} initData - ข้อมูลการเริ่มต้น
   */
  showInitialization(initData) {
    if (this.isProduction) return;
    
    this.showMainTitle('LINE AI Chatbot Initialization', '🚀');
    
    // แสดงข้อมูลเซิร์ฟเวอร์
    this.showSubTitle('🖥️ Server Information', '🖥️');
    console.log('  Port          : ' + chalk.cyan(process.env.PORT || 3000));
    console.log('  Environment   : ' + chalk.cyan(process.env.NODE_ENV || 'development'));
    console.log('  Node Version  : ' + chalk.cyan(process.version));
    
    // แสดงสถานะการเชื่อมต่อ
    if (initData.connectionStatus) {
      this.showConnectionStatus(initData.connectionStatus);
    }
    
    // แสดงข้อมูล Bot Configuration
    if (initData.botConfig) {
      this.showBotConfig(initData.botConfig);
    }
    
    // แสดงข้อมูล Google Sheets
    if (initData.sheetsData) {
      this.showSheetsInfo(initData.sheetsData.keywords, initData.sheetsData.sheetNames);
    }
    
    // แสดงข้อมูล Google Docs
    if (initData.docsData) {
      this.showDocsInfo(initData.docsData);
    }
    
    // แสดงข้อมูล Auto Refresh
    if (initData.autoRefresh) {
      this.showSubTitle('🔄 Auto Refresh Service', '🔄');
      console.log('  Status        : ' + chalk.green('Active'));
      console.log('  Interval      : ' + chalk.cyan('1 minute'));
      console.log('  Next Refresh  : ' + chalk.cyan(new Date(Date.now() + 60000).toLocaleTimeString()));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(chalk.green('✅ System Ready!') + ' ' + chalk.gray('Waiting for messages...'));
    console.log('='.repeat(60) + '\n');
  }

  /**
   * แสดงข้อความข้อผิดพลาด
   * @param {string} service - ชื่อ service
   * @param {Error} error - ข้อผิดพลาด
   */
  showError(service, error) {
    if (this.isProduction) return;
    
    console.log('\n' + chalk.red('❌ Error in ' + service));
    console.log(chalk.red('─'.repeat(50)));
    console.log('  Service       : ' + chalk.red(service));
    console.log('  Error         : ' + chalk.red(error.message));
    console.log('  Time          : ' + chalk.gray(new Date().toLocaleString()));
  }

  /**
   * แสดงข้อความสำเร็จ
   * @param {string} message - ข้อความ
   * @param {string} details - รายละเอียด
   */
  showSuccess(message, details = '') {
    if (this.isProduction) return;
    
    console.log('\n' + chalk.green('✅ ' + message) + (details ? ' ' + chalk.gray(details) : ''));
  }

  /**
   * แสดงข้อความแจ้งเตือน
   * @param {string} message - ข้อความ
   * @param {string} details - รายละเอียด
   */
  showWarning(message, details = '') {
    if (this.isProduction) return;
    
    console.log('\n' + chalk.yellow('⚠️ ' + message) + (details ? ' ' + chalk.gray(details) : ''));
  }
}

module.exports = { TerminalDisplayService };
