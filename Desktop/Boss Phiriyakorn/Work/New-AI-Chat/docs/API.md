# API Documentation

## Overview

This document describes the API endpoints available in the LINE AI Chatbot service.

## Base URL

```
https://your-domain.com
```

## Authentication

The webhook endpoint uses LINE signature verification for security.

## Endpoints

### Health Check

#### GET /health

Comprehensive health check endpoint that verifies all services.

**Response:**
```json
{
  "overall": "healthy",
  "services": {
    "gemini": "healthy",
    "googleDocs": "healthy",
    "googleSheets": "healthy",
    "line": "healthy"
  },
  "lastChecked": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "responseTime": 150,
  "service": "LINE AI Chatbot",
  "version": "1.0.0"
}
```

**Status Codes:**
- `200`: All services healthy
- `503`: One or more services unhealthy

#### GET /ping

Simple health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### Webhook

#### POST /webhook

LINE webhook endpoint for receiving messages.

**Headers:**
```
Content-Type: application/json
X-Line-Signature: <signature>
```

**Request Body:**
```json
{
  "events": [
    {
      "type": "message",
      "source": {
        "type": "user",
        "userId": "U1234567890abcdef"
      },
      "replyToken": "reply-token",
      "message": {
        "type": "text",
        "text": "Hello, bot!"
      }
    }
  ]
}
```

**Response:**
```json
{
  "message": "OK"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Invalid signature",
    "status": 400,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "Internal Server Error",
    "status": 500,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Rate Limiting

The service implements rate limiting to prevent abuse:

- **Per User**: 10 requests per minute
- **Global**: 100 requests per minute

When rate limits are exceeded, requests are silently dropped.

## Monitoring

### Health Check Monitoring

Monitor the `/health` endpoint to ensure service availability:

```bash
# Check health
curl -f https://your-domain.com/health

# Simple ping
curl -f https://your-domain.com/ping
```

### Log Monitoring

Logs are written to:
- `logs/error.log`: Error logs only
- `logs/combined.log`: All logs

### Metrics

The service provides the following metrics:
- Request count per user
- Response times
- Error rates
- Service health status

## Webhook Security

The webhook endpoint verifies LINE signatures to ensure requests are legitimate:

1. Extract signature from `X-Line-Signature` header
2. Create HMAC-SHA256 hash of request body using channel secret
3. Compare signatures

## Testing

### Test Webhook Locally

Use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000

# Use the ngrok URL as your webhook URL in LINE Developers Console
```

### Test with curl

```bash
# Test health endpoint
curl -X GET https://your-domain.com/health

# Test ping endpoint
curl -X GET https://your-domain.com/ping
```

## Troubleshooting

### Common Issues

1. **Webhook not receiving messages**
   - Check webhook URL in LINE Developers Console
   - Verify SSL certificate
   - Check firewall settings

2. **Google API errors**
   - Verify service account credentials
   - Check API permissions
   - Verify document/sheet IDs

3. **Gemini AI not responding**
   - Check API key validity
   - Verify quota limits
   - Check internet connectivity

### Debug Mode

Set `NODE_ENV=development` to enable debug logging:

```bash
NODE_ENV=development npm run dev
```

### Log Levels

Available log levels:
- `error`: Error messages only
- `warn`: Warning and error messages
- `info`: Informational messages (default)
- `debug`: All messages including debug information

Set log level via `LOG_LEVEL` environment variable.
