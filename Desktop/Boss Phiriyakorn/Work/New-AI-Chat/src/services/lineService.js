const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class LineService {
  constructor() {
    this.baseURL = 'https://api.line.me/v2/bot';
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.line.channelAccessToken}`
    };
  }

  async replyMessage(replyToken, messageText) {
    try {
      const url = `${this.baseURL}/message/reply`;
      
      const payload = {
        replyToken: replyToken,
        messages: [
          {
            type: 'text',
            text: messageText
          }
        ]
      };

      const response = await axios.post(url, payload, {
        headers: this.headers
      });

      logger.info('Message sent successfully:', {
        status: response.status,
        messageLength: messageText.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send message:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async pushMessage(userId, messageText) {
    try {
      const url = `${this.baseURL}/message/push`;
      
      const payload = {
        to: userId,
        messages: [
          {
            type: 'text',
            text: messageText
          }
        ]
      };

      const response = await axios.post(url, payload, {
        headers: this.headers
      });

      logger.info('Push message sent successfully:', {
        userId,
        status: response.status,
        messageLength: messageText.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send push message:', {
        error: error.message,
        userId,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const url = `${this.baseURL}/profile/${userId}`;
      
      const response = await axios.get(url, {
        headers: this.headers
      });

      logger.info('Profile retrieved successfully:', {
        userId,
        displayName: response.data.displayName
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get profile:', {
        error: error.message,
        userId,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  async sendTextMessage(userId, messageText) {
    try {
      // Check if message is too long for LINE (max 5000 characters)
      if (messageText.length > 5000) {
        // Split message into chunks
        const chunks = this.splitMessage(messageText, 5000);
        
        for (const chunk of chunks) {
          await this.pushMessage(userId, chunk);
          // Add small delay between messages
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        await this.pushMessage(userId, messageText);
      }

      logger.info('Text message sent successfully:', {
        userId,
        messageLength: messageText.length
      });
    } catch (error) {
      logger.error('Failed to send text message:', error);
      throw error;
    }
  }

  splitMessage(message, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const lines = message.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 <= maxLength) {
        currentChunk += (currentChunk ? '\n' : '') + line;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          // Line is too long, split by words
          const words = line.split(' ');
          let currentWordChunk = '';
          
          for (const word of words) {
            if (currentWordChunk.length + word.length + 1 <= maxLength) {
              currentWordChunk += (currentWordChunk ? ' ' : '') + word;
            } else {
              if (currentWordChunk) {
                chunks.push(currentWordChunk);
                currentWordChunk = word;
              } else {
                // Word is too long, split by characters
                chunks.push(word.substring(0, maxLength));
                currentWordChunk = word.substring(maxLength);
              }
            }
          }
          
          if (currentWordChunk) {
            currentChunk = currentWordChunk;
          }
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  async validateWebhook(body, signature) {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha256', config.line.channelSecret)
        .update(JSON.stringify(body))
        .digest('base64');

      return hash === signature;
    } catch (error) {
      logger.error('Failed to validate webhook:', error);
      return false;
    }
  }
}

module.exports = new LineService();
