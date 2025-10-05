# API Documentation

## Overview

LINE AI Chatbot API endpoints and service documentation.

## Endpoints

### Health Check

**GET** `/`

Returns the current status of the chatbot service.

**Response:**
```json
{
  "status": "OK",
  "message": "LINE AI Chatbot is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Webhook

**POST** `/webhook`

LINE Messaging API webhook endpoint for receiving messages.

**Headers:**
- `Content-Type: application/json`
- `X-Line-Signature: [signature]`

**Request Body:**
```json
{
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "text": "Hello"
      },
      "source": {
        "userId": "U1234567890"
      },
      "replyToken": "reply-token"
    }
  ]
}
```

**Response:**
```json
[
  {
    "type": "text",
    "text": "สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา"
  }
]
```

## Services

### GeminiService

Handles AI text generation using Google's Gemini API.

#### Methods

**generateResponse(userMessage, context, personality)**
- `userMessage` (string): User's input message
- `context` (string): Additional context from Google Docs
- `personality` (string): Bot personality description
- Returns: Promise<string> - AI generated response

**analyzeText(text)**
- `text` (string): Text to analyze
- Returns: Promise<Object> - Analysis result with keywords, question type, urgency, and intent

### GoogleDocsService

Manages Google Docs integration for bot personality and context.

#### Methods

**getDocumentContent()**
- Returns: Promise<string> - Full document content

**searchContent(query)**
- `query` (string): Search query
- Returns: Promise<string> - Relevant content matching the query

**getBotPersonality()**
- Returns: Promise<Object> - Bot personality, identity, and business information

### GoogleSheetsService

Handles Google Sheets integration for keyword-answer pairs.

#### Methods

**findMatchingKeyword(userMessage, threshold)**
- `userMessage` (string): User's message
- `threshold` (number): Similarity threshold (0-1)
- Returns: Object|null - Matching keyword and answer

**findMultipleMatches(userMessage, threshold, limit)**
- `userMessage` (string): User's message
- `threshold` (number): Similarity threshold (0-1)
- `limit` (number): Maximum number of results
- Returns: Array - Array of matching keywords

**getAllKeywords()**
- Returns: Array - All keywords data

**refreshData()**
- Returns: Promise<void> - Refreshes keywords data from Google Sheets

### NLPService

Provides natural language processing capabilities.

#### Methods

**preprocessText(text)**
- `text` (string): Text to preprocess
- Returns: Array - Preprocessed tokens

**calculateSimilarity(text1, text2)**
- `text1` (string): First text
- `text2` (string): Second text
- Returns: number - Similarity score (0-1)

**detectQuestionType(text)**
- `text` (string): Text to analyze
- Returns: Object - Question type and confidence

**extractKeywords(text, maxKeywords)**
- `text` (string): Text to extract keywords from
- `maxKeywords` (number): Maximum number of keywords
- Returns: Array - Extracted keywords

### ChatbotService

Main service that orchestrates all other services.

#### Methods

**processMessage(userMessage, userId)**
- `userMessage` (string): User's message
- `userId` (string): User ID
- Returns: Promise<string> - Bot response

**getStatus()**
- Returns: Promise<Object> - Current chatbot status

**refreshData()**
- Returns: Promise<void> - Refreshes all data sources

## Error Handling

All services include comprehensive error handling:

- **Service Unavailable**: Returns fallback responses when external services are down
- **Invalid Input**: Validates input parameters and returns appropriate error messages
- **Rate Limiting**: Handles API rate limits gracefully
- **Network Errors**: Retries failed requests with exponential backoff

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot channel access token | Yes | - |
| `LINE_CHANNEL_SECRET` | LINE Bot channel secret | Yes | - |
| `GEMINI_API_KEY` | Gemini AI API key | Yes | - |
| `GEMINI_MODEL` | Gemini model to use | No | gemini-1.5-flash |
| `GOOGLE_CREDENTIALS_PATH` | Path to Google credentials JSON | Yes | ./credentials.json |
| `GOOGLE_DOCS_ID` | Google Docs document ID | Yes | - |
| `GOOGLE_SHEETS_ID` | Google Sheets spreadsheet ID | Yes | - |
| `GOOGLE_SHEETS_RANGE` | Google Sheets range | No | Sheet1!B:C |
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment | No | development |
| `BOT_NAME` | Bot name | No | AI Assistant |
| `BOT_PERSONALITY` | Bot personality | No | helpful, friendly, professional |
| `DEFAULT_RESPONSE` | Default response when no match found | No | ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ |

## Rate Limits

- **Gemini AI**: 15 requests per minute (free tier)
- **Google APIs**: 100 requests per 100 seconds per user
- **LINE Messaging API**: 500 messages per second per channel

## Security

- All API keys are stored in environment variables
- Google credentials are stored in a separate JSON file
- Webhook signature verification for LINE messages
- Input validation and sanitization
- Error messages don't expose sensitive information

## Monitoring

The chatbot includes built-in monitoring:

- Service availability checks
- Request/response logging
- Error tracking
- Performance metrics
- Data refresh status

## Troubleshooting

### Common Issues

1. **"Google Docs service not initialized"**
   - Check `GOOGLE_DOCS_ID` environment variable
   - Verify `credentials.json` file exists and is valid
   - Ensure document is shared with service account

2. **"Gemini AI not available"**
   - Verify `GEMINI_API_KEY` is correct
   - Check API quota and rate limits
   - Ensure model name is valid

3. **"No keyword match found"**
   - Check Google Sheets data format
   - Verify `GOOGLE_SHEETS_RANGE` is correct
   - Ensure spreadsheet is shared with service account

4. **"LINE Bot not responding"**
   - Verify webhook URL is correct
   - Check Channel Access Token and Channel Secret
   - Ensure webhook is enabled in LINE Developer Console
