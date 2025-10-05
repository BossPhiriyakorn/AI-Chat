const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: config.googleDocs.credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      logger.info('Google Sheets service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service:', error);
      throw error;
    }
  }

  async getKeywordsAndAnswers() {
    try {
      if (!this.sheets) {
        await this.initializeAuth();
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.googleSheets.spreadsheetId,
        range: config.googleSheets.range,
      });

      const rows = response.data.values || [];
      const keywordsData = [];

      // Skip header row if exists
      const dataRows = rows.slice(1);

      for (const row of dataRows) {
        if (row.length >= 2 && row[0] && row[1]) {
          keywordsData.push({
            keyword: row[0].trim(),
            answer: row[1].trim()
          });
        }
      }

      logger.info(`Successfully retrieved ${keywordsData.length} keyword-answer pairs`);
      return keywordsData;
    } catch (error) {
      logger.error('Failed to get keywords and answers:', error);
      throw error;
    }
  }

  async findAnswerByKeyword(userMessage) {
    try {
      const keywordsData = await this.getKeywordsAndAnswers();
      
      // Normalize user message for comparison
      const normalizedMessage = userMessage.toLowerCase().trim();
      
      // Find exact match first
      let exactMatch = keywordsData.find(item => 
        item.keyword.toLowerCase() === normalizedMessage
      );
      
      if (exactMatch) {
        logger.info(`Found exact match for keyword: ${exactMatch.keyword}`);
        return exactMatch.answer;
      }

      // Find partial match
      let partialMatch = keywordsData.find(item => 
        normalizedMessage.includes(item.keyword.toLowerCase()) ||
        item.keyword.toLowerCase().includes(normalizedMessage)
      );
      
      if (partialMatch) {
        logger.info(`Found partial match for keyword: ${partialMatch.keyword}`);
        return partialMatch.answer;
      }

      // Find fuzzy match (simple word-based matching)
      const userWords = normalizedMessage.split(/\s+/);
      let bestMatch = null;
      let maxMatches = 0;

      for (const item of keywordsData) {
        const keywordWords = item.keyword.toLowerCase().split(/\s+/);
        const matches = userWords.filter(word => 
          keywordWords.some(keywordWord => 
            keywordWord.includes(word) || word.includes(keywordWord)
          )
        ).length;

        if (matches > maxMatches) {
          maxMatches = matches;
          bestMatch = item;
        }
      }

      if (bestMatch && maxMatches > 0) {
        logger.info(`Found fuzzy match for keyword: ${bestMatch.keyword} (${maxMatches} word matches)`);
        return bestMatch.answer;
      }

      logger.info('No keyword match found');
      return null;
    } catch (error) {
      logger.error('Failed to find answer by keyword:', error);
      throw error;
    }
  }

  async getAllKeywords() {
    try {
      const keywordsData = await this.getKeywordsAndAnswers();
      return keywordsData.map(item => item.keyword);
    } catch (error) {
      logger.error('Failed to get all keywords:', error);
      throw error;
    }
  }
}

module.exports = new GoogleSheetsService();
