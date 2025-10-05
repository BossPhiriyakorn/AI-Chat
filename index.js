const express = require('express');
const line = require('@line/bot-sdk');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { GeminiService } = require('./services/geminiService');
const { GoogleDocsService } = require('./services/googleDocsService');
const { GoogleSheetsService } = require('./services/googleSheetsService');
const { NLPService } = require('./services/nlpService');
const { ChatbotService } = require('./services/chatbotService');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Parse JSON bodies
app.use(express.json({ verify: (req, res, buf) => {
  req.rawBody = buf;
}}));

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// Initialize services
const geminiService = new GeminiService();
const googleDocsService = new GoogleDocsService();
const googleSheetsService = new GoogleSheetsService();
const nlpService = new NLPService();
const chatbotService = new ChatbotService(
  geminiService,
  googleDocsService,
  googleSheetsService,
  nlpService
);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'LINE AI Chatbot is running',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint for LINE
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling webhook:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

// Handle LINE events
async function handleEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return Promise.resolve(null);
    }

    const userId = event.source.userId;
    const messageText = event.message.text;
    
    console.log(`\n📨 Received message from ${userId}: ${messageText}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);

    // Get response from chatbot service
    const response = await chatbotService.processMessage(messageText, userId);
    
    console.log(`📤 Sending response to ${userId}`);
    
    // Send response back to user
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: response
    });

  } catch (error) {
    console.error('❌ Error handling event:', error);
    
    // Send error message to user
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: process.env.DEFAULT_RESPONSE || 'ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    });
  }
}

// API endpoint for force refresh
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('🔄 Force refresh requested via API');
    await chatbotService.forceRefresh();
    res.json({ 
      success: true, 
      message: 'Data refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh data',
      message: error.message
    });
  }
});

// API endpoint for auto refresh status
app.get('/api/refresh/status', (req, res) => {
  try {
    const status = chatbotService.getAutoRefreshStatus();
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting refresh status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get refresh status',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LINE AI Chatbot server is running on port ${PORT}`);
  console.log(`📱 Webhook URL: https://your-domain.com/webhook`);
  console.log(`🤖 Bot Name: ${process.env.BOT_NAME || 'AI Assistant'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

module.exports = app;
