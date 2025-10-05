const config = require('../config');
const logger = require('./logger');
const geminiService = require('../services/geminiService');
const googleDocsService = require('../services/googleDocsService');
const googleSheetsService = require('../services/googleSheetsService');
const lineService = require('../services/lineService');

class HealthCheck {
  constructor() {
    this.lastCheck = null;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.status = {
      overall: 'unknown',
      services: {
        gemini: 'unknown',
        googleDocs: 'unknown',
        googleSheets: 'unknown',
        line: 'unknown'
      },
      lastChecked: null,
      uptime: process.uptime()
    };
  }

  async checkAll() {
    try {
      logger.info('Starting health check...');
      
      const startTime = Date.now();
      const results = await Promise.allSettled([
        this.checkGemini(),
        this.checkGoogleDocs(),
        this.checkGoogleSheets(),
        this.checkLine()
      ]);

      const [geminiResult, docsResult, sheetsResult, lineResult] = results;

      this.status = {
        overall: this.determineOverallStatus(results),
        services: {
          gemini: this.getServiceStatus(geminiResult),
          googleDocs: this.getServiceStatus(docsResult),
          googleSheets: this.getServiceStatus(sheetsResult),
          line: this.getServiceStatus(lineResult)
        },
        lastChecked: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: Date.now() - startTime
      };

      this.lastCheck = Date.now();
      logger.info('Health check completed:', this.status);
      
      return this.status;
    } catch (error) {
      logger.error('Health check failed:', error);
      this.status.overall = 'error';
      this.status.lastChecked = new Date().toISOString();
      return this.status;
    }
  }

  async checkGemini() {
    try {
      // Test with a simple prompt
      const result = await geminiService.generateResponse('test', 'test context');
      return { status: 'healthy', response: 'Gemini AI is responding' };
    } catch (error) {
      logger.error('Gemini health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkGoogleDocs() {
    try {
      const content = await googleDocsService.getDocumentContent();
      return { 
        status: 'healthy', 
        response: `Document content retrieved (${content.length} characters)` 
      };
    } catch (error) {
      logger.error('Google Docs health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkGoogleSheets() {
    try {
      const keywords = await googleSheetsService.getAllKeywords();
      return { 
        status: 'healthy', 
        response: `Retrieved ${keywords.length} keywords` 
      };
    } catch (error) {
      logger.error('Google Sheets health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  async checkLine() {
    try {
      // Test LINE API with a simple request (this might fail if no valid token)
      // We'll just check if the configuration is present
      if (!config.line.channelAccessToken || !config.line.channelSecret) {
        return { status: 'unhealthy', error: 'Missing LINE credentials' };
      }
      
      return { status: 'healthy', response: 'LINE credentials configured' };
    } catch (error) {
      logger.error('LINE health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  getServiceStatus(result) {
    if (result.status === 'fulfilled') {
      return result.value.status;
    } else {
      return 'unhealthy';
    }
  }

  determineOverallStatus(results) {
    const unhealthyCount = results.filter(result => 
      result.status === 'rejected' || 
      (result.status === 'fulfilled' && result.value.status === 'unhealthy')
    ).length;

    if (unhealthyCount === 0) {
      return 'healthy';
    } else if (unhealthyCount < results.length) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  getStatus() {
    return this.status;
  }

  isHealthy() {
    return this.status.overall === 'healthy';
  }

  getUptime() {
    return {
      uptime: process.uptime(),
      uptimeFormatted: this.formatUptime(process.uptime()),
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  startPeriodicCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.checkAll();
    }, this.checkInterval);

    logger.info('Started periodic health checks');
  }

  stopPeriodicCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped periodic health checks');
    }
  }
}

module.exports = new HealthCheck();
