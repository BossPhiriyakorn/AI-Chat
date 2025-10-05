const logger = require('./logger');

class ValidationUtils {
  static validateEnvironmentVariables() {
    const requiredVars = [
      'LINE_CHANNEL_ACCESS_TOKEN',
      'LINE_CHANNEL_SECRET',
      'GEMINI_API_KEY',
      'GOOGLE_DOCS_ID',
      'GOOGLE_SHEETS_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const error = `Missing required environment variables: ${missingVars.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info('All required environment variables are present');
    return true;
  }

  static validateGoogleSheetsRange(range) {
    const rangePattern = /^[A-Za-z0-9_]+![A-Z]+[0-9]*:[A-Z]+[0-9]*$/;
    
    if (!rangePattern.test(range)) {
      const error = `Invalid Google Sheets range format: ${range}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`Google Sheets range is valid: ${range}`);
    return true;
  }

  static validateMessageText(text) {
    if (!text || typeof text !== 'string') {
      const error = 'Message text must be a non-empty string';
      logger.error(error);
      throw new Error(error);
    }

    if (text.length > 5000) {
      logger.warn(`Message text is very long: ${text.length} characters`);
    }

    if (text.trim().length === 0) {
      const error = 'Message text cannot be empty or only whitespace';
      logger.error(error);
      throw new Error(error);
    }

    return true;
  }

  static validateGoogleDocsId(docId) {
    const docIdPattern = /^[a-zA-Z0-9-_]+$/;
    
    if (!docIdPattern.test(docId)) {
      const error = `Invalid Google Docs ID format: ${docId}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`Google Docs ID is valid: ${docId}`);
    return true;
  }

  static validateGoogleSheetsId(sheetId) {
    const sheetIdPattern = /^[a-zA-Z0-9-_]+$/;
    
    if (!sheetIdPattern.test(sheetId)) {
      const error = `Invalid Google Sheets ID format: ${sheetId}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`Google Sheets ID is valid: ${sheetId}`);
    return true;
  }

  static validateGeminiApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      const error = 'Gemini API key must be a non-empty string';
      logger.error(error);
      throw new Error(error);
    }

    if (apiKey.length < 20) {
      const error = 'Gemini API key appears to be too short';
      logger.error(error);
      throw new Error(error);
    }

    logger.info('Gemini API key format is valid');
    return true;
  }

  static validateLineCredentials(accessToken, channelSecret) {
    if (!accessToken || typeof accessToken !== 'string') {
      const error = 'LINE Channel Access Token must be a non-empty string';
      logger.error(error);
      throw new Error(error);
    }

    if (!channelSecret || typeof channelSecret !== 'string') {
      const error = 'LINE Channel Secret must be a non-empty string';
      logger.error(error);
      throw new Error(error);
    }

    if (accessToken.length < 50) {
      const error = 'LINE Channel Access Token appears to be too short';
      logger.error(error);
      throw new Error(error);
    }

    if (channelSecret.length < 20) {
      const error = 'LINE Channel Secret appears to be too short';
      logger.error(error);
      throw new Error(error);
    }

    logger.info('LINE credentials format is valid');
    return true;
  }

  static validateCredentialsFile(credentialsPath) {
    const fs = require('fs');
    
    if (!credentialsPath || typeof credentialsPath !== 'string') {
      const error = 'Google Credentials Path must be a non-empty string';
      logger.error(error);
      throw new Error(error);
    }

    if (!fs.existsSync(credentialsPath)) {
      const error = `Google Credentials file not found: ${credentialsPath}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      if (!credentials.type || credentials.type !== 'service_account') {
        const error = 'Invalid Google Credentials file: not a service account key';
        logger.error(error);
        throw new Error(error);
      }

      if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
        const error = 'Invalid Google Credentials file: missing required fields';
        logger.error(error);
        throw new Error(error);
      }

      logger.info('Google Credentials file is valid');
      return true;
    } catch (error) {
      const errorMsg = `Invalid Google Credentials file: ${error.message}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  static validateAll() {
    try {
      this.validateEnvironmentVariables();
      this.validateGeminiApiKey(process.env.GEMINI_API_KEY);
      this.validateLineCredentials(process.env.LINE_CHANNEL_ACCESS_TOKEN, process.env.LINE_CHANNEL_SECRET);
      this.validateGoogleDocsId(process.env.GOOGLE_DOCS_ID);
      this.validateGoogleSheetsId(process.env.GOOGLE_SHEETS_ID);
      this.validateGoogleSheetsRange(process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!B:C');
      this.validateCredentialsFile(process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials.json');
      
      logger.info('All validations passed successfully');
      return true;
    } catch (error) {
      logger.error('Validation failed:', error.message);
      throw error;
    }
  }
}

module.exports = ValidationUtils;
