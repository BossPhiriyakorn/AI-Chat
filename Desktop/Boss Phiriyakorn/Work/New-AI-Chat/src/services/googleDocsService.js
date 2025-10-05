const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');

class GoogleDocsService {
  constructor() {
    this.auth = null;
    this.docs = null;
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: config.googleDocs.credentialsPath,
        scopes: ['https://www.googleapis.com/auth/documents.readonly'],
      });

      this.docs = google.docs({ version: 'v1', auth: this.auth });
      logger.info('Google Docs service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Docs service:', error);
      throw error;
    }
  }

  async getDocumentContent() {
    try {
      if (!this.docs) {
        await this.initializeAuth();
      }

      const response = await this.docs.documents.get({
        documentId: config.googleDocs.documentId,
      });

      const document = response.data;
      const content = this.extractTextFromDocument(document);
      
      logger.info('Successfully retrieved document content');
      return content;
    } catch (error) {
      logger.error('Failed to get document content:', error);
      throw error;
    }
  }

  extractTextFromDocument(document) {
    let text = '';
    
    if (document.body && document.body.content) {
      for (const element of document.body.content) {
        if (element.paragraph) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun) {
              text += textElement.textRun.content;
            }
          }
          text += '\n';
        }
      }
    }

    return text.trim();
  }

  async getDocumentMetadata() {
    try {
      if (!this.docs) {
        await this.initializeAuth();
      }

      const response = await this.docs.documents.get({
        documentId: config.googleDocs.documentId,
      });

      const document = response.data;
      
      return {
        title: document.title,
        lastModified: document.modifiedTime,
        content: this.extractTextFromDocument(document)
      };
    } catch (error) {
      logger.error('Failed to get document metadata:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDocsService();
