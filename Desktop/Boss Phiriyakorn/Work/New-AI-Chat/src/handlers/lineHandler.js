const crypto = require('crypto');
const config = require('../config');
const chatService = require('../services/chatService');
const lineService = require('../services/lineService');
const logger = require('../utils/logger');
const rateLimiter = require('../utils/rateLimiter');

const lineHandler = async (req, res) => {
  try {
    // Verify LINE signature
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      logger.warn('No LINE signature found');
      return res.status(400).json({ error: 'No signature' });
    }

    const body = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', config.line.channelSecret)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      logger.warn('Invalid LINE signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process webhook events
    const events = req.body.events;
    if (!events || events.length === 0) {
      logger.info('No events to process');
      return res.status(200).json({ message: 'No events' });
    }

    // Process each event
    for (const event of events) {
      // Check rate limit for each user
      const userId = event.source?.userId;
      if (userId) {
        const rateLimitResult = rateLimiter.isAllowed(userId);
        if (!rateLimitResult.allowed) {
          logger.warn(`Rate limit exceeded for user ${userId}:`, rateLimitResult);
          continue; // Skip processing this event
        }
      }
      
      await processEvent(event);
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    logger.error('Error in LINE webhook handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function processEvent(event) {
  try {
    logger.info('Processing event:', {
      type: event.type,
      source: event.source?.type,
      userId: event.source?.userId
    });

    // Only process message events
    if (event.type !== 'message') {
      logger.info('Ignoring non-message event:', event.type);
      return;
    }

    // Only process text messages
    if (event.message.type !== 'text') {
      logger.info('Ignoring non-text message:', event.message.type);
      return;
    }

    const userMessage = event.message.text;
    const userId = event.source.userId;
    const replyToken = event.replyToken;

    logger.info(`Received message from user ${userId}: ${userMessage}`);

    // Process message with AI
    const result = await chatService.processMessage(userMessage);

    if (result.success) {
      // Send response back to user
      await lineService.replyMessage(replyToken, result.answer);
      
      logger.info('Response sent successfully:', {
        userId,
        source: result.source,
        intent: result.intent,
        answerLength: result.answer.length
      });
    } else {
      // Send error response
      await lineService.replyMessage(replyToken, result.answer);
      
      logger.warn('Error response sent:', {
        userId,
        error: result.error,
        answerLength: result.answer.length
      });
    }
  } catch (error) {
    logger.error('Error processing event:', error);
    
    // Try to send error message to user
    try {
      if (event.replyToken) {
        await lineService.replyMessage(
          event.replyToken, 
          'ขออภัยค่ะ เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งค่ะ'
        );
      }
    } catch (replyError) {
      logger.error('Failed to send error reply:', replyError);
    }
  }
}

module.exports = lineHandler;
