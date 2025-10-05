const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
require('dotenv').config();

const lineHandler = require('./handlers/lineHandler');
const errorHandler = require('./utils/errorHandler');
const logger = require('./utils/logger');
const ValidationUtils = require('./utils/validation');
const healthCheck = require('./utils/healthCheck');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const status = await healthCheck.checkAll();
    const statusCode = healthCheck.isHealthy() ? 200 : 503;
    
    res.status(statusCode).json({
      ...status,
      service: 'LINE AI Chatbot',
      version: require('../package.json').version
    });
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple health check endpoint
app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// LINE Webhook endpoint
app.post('/webhook', lineHandler);

// Error handling middleware
app.use(errorHandler);

// Validate environment variables on startup
try {
  ValidationUtils.validateAll();
  logger.info('Environment validation passed');
} catch (error) {
  logger.error('Environment validation failed:', error.message);
  process.exit(1);
}

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start periodic health checks
  healthCheck.startPeriodicCheck();
});

module.exports = app;
