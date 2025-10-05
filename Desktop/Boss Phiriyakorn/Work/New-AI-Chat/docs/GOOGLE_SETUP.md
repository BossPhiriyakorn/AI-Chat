# Google Services Setup Guide

This guide will help you set up Google Cloud services required for the LINE AI Chatbot.

## Prerequisites

- Google account
- Google Cloud Platform access
- Basic understanding of APIs and credentials

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `line-ai-chatbot`
4. Click "Create"
5. Select the newly created project

## Step 2: Enable Required APIs

1. Go to "APIs & Services" → "Library"
2. Search and enable the following APIs:
   - **Google Docs API**
   - **Google Sheets API**
   - **Google AI (Generative AI) API**

### Enable Google Docs API
1. Search for "Google Docs API"
2. Click on it
3. Click "Enable"

### Enable Google Sheets API
1. Search for "Google Sheets API"
2. Click on it
3. Click "Enable"

### Enable Google AI API
1. Search for "Generative AI API"
2. Click on it
3. Click "Enable"

## Step 3: Create Service Account

1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Fill in details:
   - **Name**: `line-ai-chatbot-service`
   - **Description**: `Service account for LINE AI Chatbot`
4. Click "Create and Continue"
5. Grant roles:
   - **Viewer** (for Google Docs)
   - **Editor** (for Google Sheets)
6. Click "Continue" → "Done"

## Step 4: Generate Service Account Key

1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Click "Create"
6. Download the JSON file
7. **Keep this file secure!**

## Step 5: Place Credentials File

1. Rename the downloaded JSON file to `google-credentials.json`
2. Place it in the root directory of your project
3. The file should be in the same directory as `package.json`

## Step 6: Set Up Google Docs

1. Create a new Google Doc
2. Add your business information:
   - Company name and description
   - Products/services
   - Contact information
   - FAQ answers
   - Any other relevant information
3. Share the document with your service account email:
   - Click "Share"
   - Add: `line-ai-chatbot-service@your-project-id.iam.gserviceaccount.com`
   - Set permission to "Viewer"
4. Copy the document ID from the URL:
   ```
   https://docs.google.com/document/d/DOCUMENT_ID/edit
   ```

## Step 7: Set Up Google Sheets

1. Create a new Google Sheet
2. Set up columns:
   - **Column A**: ID (optional)
   - **Column B**: Keywords
   - **Column C**: Answers
3. Add sample data:
   ```
   A          | B (Keywords)    | C (Answers)
   1          | ราคา           | ราคาเริ่มต้นที่ 1,000 บาท
   2          | ชำระเงิน       | รับชำระเงินผ่าน...
   3          | ส่งสินค้า      | ส่งสินค้าภายใน 3-5 วันทำการ
   ```
4. Share the sheet with your service account email:
   - Click "Share"
   - Add: `line-ai-chatbot-service@your-project-id.iam.gserviceaccount.com`
   - Set permission to "Editor"
5. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

## Step 8: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Select your project
4. Copy the API key
5. **Keep this key secure!**

## Step 9: Configure Environment Variables

Create your `.env` file with the following variables:

```env
# Google AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Google Docs
GOOGLE_DOCS_ID=your_document_id_here
GOOGLE_CREDENTIALS_PATH=./google-credentials.json

# Google Sheets
GOOGLE_SHEETS_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_RANGE=Sheet1!B:C
```

## Step 10: Test Configuration

Run the application to test your configuration:

```bash
# Install dependencies
npm install

# Start the application
npm run dev

# Test health endpoint
curl http://localhost:3000/health
```

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure service account has proper roles
   - Check document/sheet sharing permissions
   - Verify service account email is correct

2. **"API not enabled" errors**
   - Ensure all required APIs are enabled
   - Wait a few minutes for API activation
   - Check billing is enabled for the project

3. **"Invalid credentials" errors**
   - Verify private key format (include newlines)
   - Check service account email
   - Ensure JSON key file is valid

4. **"Document not found" errors**
   - Verify document/sheet IDs are correct
   - Check sharing permissions
   - Ensure documents exist and are accessible

### Testing Individual Services

#### Test Google Docs Access
```javascript
const { google } = require('googleapis');
const config = require('./src/config');

async function testGoogleDocs() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: config.googleDocs.credentialsPath,
      scopes: ['https://www.googleapis.com/auth/documents.readonly'],
    });

    const docs = google.docs({ version: 'v1', auth });
    const response = await docs.documents.get({
      documentId: config.googleDocs.documentId,
    });
    
    console.log('Google Docs access successful!');
    console.log('Document title:', response.data.title);
  } catch (error) {
    console.error('Google Docs access failed:', error.message);
  }
}

testGoogleDocs();
```

#### Test Google Sheets Access
```javascript
const { google } = require('googleapis');
const config = require('./src/config');

async function testGoogleSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: config.googleDocs.credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.googleSheets.spreadsheetId,
      range: config.googleSheets.range,
    });
    
    console.log('Google Sheets access successful!');
    console.log('Data rows:', response.data.values?.length || 0);
  } catch (error) {
    console.error('Google Sheets access failed:', error.message);
  }
}

testGoogleSheets();
```

#### Test Gemini AI Access
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./src/config');

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const result = await model.generateContent('Hello, this is a test message.');
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini AI access successful!');
    console.log('Response:', text);
  } catch (error) {
    console.error('Gemini AI access failed:', error.message);
  }
}

testGemini();
```

## Security Best Practices

1. **Never commit credentials to version control**
2. **Use environment variables for all secrets**
3. **Rotate API keys regularly**
4. **Limit service account permissions**
5. **Monitor API usage and costs**
6. **Use least privilege principle**

## Cost Management

- Google Docs API: Free for most usage
- Google Sheets API: Free for most usage
- Gemini AI: Pay-per-use (check current pricing)
- Monitor usage in Google Cloud Console
- Set up billing alerts

## Next Steps

After completing this setup:

1. Configure LINE Official Account
2. Set up webhook URL
3. Test the complete flow
4. Deploy to production
5. Monitor and maintain

For more information, refer to the main [README.md](../README.md) and [DEPLOYMENT.md](DEPLOYMENT.md) files.
