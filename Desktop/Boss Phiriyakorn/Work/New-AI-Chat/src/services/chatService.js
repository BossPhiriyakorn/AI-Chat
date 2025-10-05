const geminiService = require('./geminiService');
const googleDocsService = require('./googleDocsService');
const googleSheetsService = require('./googleSheetsService');
const logger = require('../utils/logger');

class ChatService {
  constructor() {
    this.cache = {
      documentContent: null,
      lastDocumentFetch: null,
      cacheExpiry: 5 * 60 * 1000 // 5 minutes
    };
  }

  async processMessage(userMessage) {
    try {
      logger.info(`Processing message: ${userMessage}`);

      // Step 1: Analyze intent using Gemini AI
      const intentAnalysis = await geminiService.analyzeIntent(userMessage);
      logger.info('Intent analysis result:', intentAnalysis);

      // Step 2: Route based on intent
      if (intentAnalysis.intent === 'keyword_based') {
        return await this.handleKeywordBasedQuery(userMessage, intentAnalysis);
      } else {
        return await this.handleGeneralInquiry(userMessage, intentAnalysis);
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      return await this.handleError(userMessage);
    }
  }

  async handleKeywordBasedQuery(userMessage, intentAnalysis) {
    try {
      logger.info('Handling keyword-based query');

      // Extract keywords using Gemini AI
      const keywordExtraction = await geminiService.extractKeywords(userMessage);
      logger.info('Keyword extraction result:', keywordExtraction);

      // Search for answer in Google Sheets
      const answer = await googleSheetsService.findAnswerByKeyword(userMessage);
      
      if (answer) {
        logger.info('Found answer in Google Sheets');
        return {
          success: true,
          answer: answer,
          source: 'google_sheets',
          intent: 'keyword_based',
          keywords: keywordExtraction.keywords
        };
      } else {
        // Fallback to general inquiry if no keyword match found
        logger.info('No keyword match found, falling back to general inquiry');
        return await this.handleGeneralInquiry(userMessage, intentAnalysis);
      }
    } catch (error) {
      logger.error('Error handling keyword-based query:', error);
      return await this.handleError(userMessage);
    }
  }

  async handleGeneralInquiry(userMessage, intentAnalysis) {
    try {
      logger.info('Handling general inquiry');

      // Get document content (with caching)
      const documentContent = await this.getDocumentContent();
      
      if (!documentContent) {
        logger.warn('No document content available, using fallback response');
        const fallbackResponse = await geminiService.generateFallbackResponse(userMessage);
        return {
          success: true,
          answer: fallbackResponse,
          source: 'fallback',
          intent: 'general_inquiry'
        };
      }

      // Generate response using Gemini AI with document context
      const response = await geminiService.generateResponse(userMessage, documentContent);
      
      logger.info('Generated response for general inquiry');
      return {
        success: true,
        answer: response,
        source: 'google_docs',
        intent: 'general_inquiry',
        context_used: true
      };
    } catch (error) {
      logger.error('Error handling general inquiry:', error);
      return await this.handleError(userMessage);
    }
  }

  async getDocumentContent() {
    try {
      const now = Date.now();
      
      // Check if we have cached content and it's still valid
      if (this.cache.documentContent && 
          this.cache.lastDocumentFetch && 
          (now - this.cache.lastDocumentFetch) < this.cacheExpiry) {
        logger.info('Using cached document content');
        return this.cache.documentContent;
      }

      // Fetch fresh content
      logger.info('Fetching fresh document content');
      const content = await googleDocsService.getDocumentContent();
      
      // Update cache
      this.cache.documentContent = content;
      this.cache.lastDocumentFetch = now;
      
      return content;
    } catch (error) {
      logger.error('Error getting document content:', error);
      return null;
    }
  }

  async handleError(userMessage) {
    try {
      logger.error('Handling error case');
      
      const fallbackResponse = await geminiService.generateFallbackResponse(userMessage);
      
      return {
        success: false,
        answer: fallbackResponse,
        source: 'error_fallback',
        error: true
      };
    } catch (error) {
      logger.error('Error in error handler:', error);
      
      return {
        success: false,
        answer: 'ขออภัยค่ะ เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งหรือติดต่อทีมงานเพื่อรับความช่วยเหลือค่ะ',
        source: 'system_error',
        error: true
      };
    }
  }

  async getAvailableKeywords() {
    try {
      return await googleSheetsService.getAllKeywords();
    } catch (error) {
      logger.error('Error getting available keywords:', error);
      return [];
    }
  }

  async refreshCache() {
    try {
      this.cache.documentContent = null;
      this.cache.lastDocumentFetch = null;
      logger.info('Cache refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing cache:', error);
    }
  }
}

module.exports = new ChatService();
