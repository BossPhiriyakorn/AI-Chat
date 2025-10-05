require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // LINE Messaging API
  line: {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  },
  
  // Google AI (Gemini)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
  
  // Google Docs
  googleDocs: {
    documentId: process.env.GOOGLE_DOCS_ID,
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './google-credentials.json',
  },
  
  // Google Sheets
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!B:C',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'GEMINI_API_KEY',
  'GOOGLE_DOCS_ID',
  'GOOGLE_SHEETS_ID',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

module.exports = config;
