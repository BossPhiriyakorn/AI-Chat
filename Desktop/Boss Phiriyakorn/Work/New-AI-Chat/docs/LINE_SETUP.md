# LINE Official Account Setup Guide

This guide will help you set up a LINE Official Account and configure it to work with the AI Chatbot.

## Prerequisites

- LINE account
- Business information
- Domain name (for webhook URL)
- SSL certificate (for production)

## Step 1: Create LINE Official Account

1. Go to [LINE Official Account Manager](https://manager.line.biz/)
2. Click "Create Account"
3. Choose account type:
   - **Personal**: For individual use
   - **Business**: For business use (recommended)
4. Fill in required information:
   - Account name
   - Category
   - Description
   - Profile picture
   - Cover image
5. Complete verification process

## Step 2: Create LINE Channel

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Click "Create" → "Create a new channel"
3. Select "Messaging API"
4. Fill in channel information:
   - **Channel name**: Your bot name
   - **Channel description**: Bot description
   - **Category**: Select appropriate category
   - **Subcategory**: Select appropriate subcategory
5. Agree to terms and conditions
6. Click "Create"

## Step 3: Configure Channel Settings

### Basic Information
1. Go to "Basic settings" tab
2. Update channel information:
   - **Channel name**: Display name for users
   - **Channel description**: What your bot does
   - **Channel icon**: Upload bot avatar
   - **Welcome message**: Message shown when users add the bot

### Messaging API Settings
1. Go to "Messaging API" tab
2. Configure webhook settings:
   - **Webhook URL**: `https://yourdomain.com/webhook`
   - **Use webhook**: Enable
   - **Webhook events**: Select "Message"
3. Configure reply settings:
   - **Auto-reply messages**: Disable (we'll handle with bot)
   - **Greeting messages**: Disable (we'll handle with bot)
4. Configure response settings:
   - **Response mode**: Bot
   - **Allow bot to join group chats**: Enable if needed
   - **Allow bot to read messages**: Enable

## Step 4: Get Channel Credentials

1. Go to "Messaging API" tab
2. Copy the following credentials:
   - **Channel Access Token**: Long-lived token for API calls
   - **Channel Secret**: Secret for webhook verification
3. Add these to your `.env` file:

```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here
```

## Step 5: Set Up Webhook URL

### For Development (Local Testing)

1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Start your local server:
   ```bash
   npm run dev
   ```

3. In another terminal, expose port 3000:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Set webhook URL in LINE Developers Console:
   - Go to "Messaging API" tab
   - Set webhook URL: `https://abc123.ngrok.io/webhook`
   - Click "Update"
   - Click "Verify" to test

### For Production

1. Deploy your application to a server with HTTPS
2. Set webhook URL: `https://yourdomain.com/webhook`
3. Click "Update"
4. Click "Verify" to test

## Step 6: Test Webhook Connection

1. In LINE Developers Console, click "Verify" next to webhook URL
2. You should see "Success" if everything is configured correctly
3. If it fails, check:
   - Server is running
   - Webhook URL is correct
   - SSL certificate is valid
   - Firewall allows incoming connections

## Step 7: Configure Bot Settings

### Auto-Reply Settings
1. Go to "Auto-reply messages" tab
2. Disable auto-reply messages (we'll handle with bot)
3. Save settings

### Greeting Messages
1. Go to "Greeting messages" tab
2. Disable greeting messages (we'll handle with bot)
3. Save settings

### Response Settings
1. Go to "Response settings" tab
2. Set "Response mode" to "Bot"
3. Save settings

## Step 8: Test the Bot

1. Add your bot as a friend using the QR code or LINE ID
2. Send a test message
3. Check if the bot responds correctly
4. Monitor logs for any errors

## Step 9: Publish the Bot

### For Testing
- Bot is automatically available for testing
- Share QR code or LINE ID with test users

### For Public Use
1. Go to "Account settings" tab
2. Click "Publish"
3. Complete verification process
4. Bot will be available publicly

## Webhook Security

The webhook endpoint verifies LINE signatures for security:

```javascript
const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}
```

## Message Types Supported

The bot currently supports:
- **Text messages**: Main functionality
- **Sticker messages**: Detected but not processed
- **Image messages**: Detected but not processed
- **Other message types**: Detected but not processed

## Rate Limits

LINE has rate limits for messaging:
- **Reply messages**: 500 messages per user per month
- **Push messages**: 500 messages per user per month
- **Broadcast messages**: 1 message per day

## Troubleshooting

### Common Issues

1. **Webhook verification fails**
   - Check webhook URL is accessible
   - Verify SSL certificate
   - Check server logs for errors
   - Ensure webhook endpoint returns 200 status

2. **Bot doesn't respond**
   - Check if webhook is enabled
   - Verify response mode is set to "Bot"
   - Check server logs for errors
   - Ensure auto-reply is disabled

3. **Messages not received**
   - Check webhook URL configuration
   - Verify LINE signature validation
   - Check server is running
   - Monitor network connectivity

4. **Rate limit exceeded**
   - Monitor message counts
   - Implement rate limiting
   - Use push messages sparingly

### Debug Commands

```bash
# Check webhook endpoint
curl -X POST https://yourdomain.com/webhook \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test" \
  -d '{"events":[]}'

# Test health endpoint
curl https://yourdomain.com/health

# Check logs
tail -f logs/combined.log
```

### Log Analysis

Look for these log entries:
- `Processing event`: Message received
- `Intent analysis result`: AI analysis
- `Response sent successfully`: Bot replied
- `Rate limit exceeded`: Too many requests
- `Error processing event`: Processing failed

## Advanced Configuration

### Rich Menus
1. Go to "Rich menus" tab
2. Create rich menu with buttons
3. Set as default or assign to users
4. Handle rich menu interactions in webhook

### Quick Replies
1. Implement quick reply functionality
2. Add quick reply buttons to messages
3. Handle quick reply responses

### Flex Messages
1. Create attractive message layouts
2. Use LINE's Flex Message format
3. Enhance user experience

## Monitoring and Analytics

### LINE Official Account Manager
- View message statistics
- Monitor user interactions
- Track bot performance

### Custom Analytics
- Log user interactions
- Track response times
- Monitor error rates
- Analyze user behavior

## Best Practices

1. **User Experience**
   - Respond quickly to messages
   - Use clear and helpful responses
   - Handle errors gracefully
   - Provide fallback responses

2. **Security**
   - Validate all webhook requests
   - Implement rate limiting
   - Monitor for abuse
   - Keep credentials secure

3. **Performance**
   - Optimize response times
   - Cache frequently used data
   - Monitor server resources
   - Handle high traffic

4. **Maintenance**
   - Regular testing
   - Monitor logs
   - Update dependencies
   - Backup configurations

## Next Steps

After completing LINE setup:

1. Test all functionality
2. Deploy to production
3. Monitor performance
4. Gather user feedback
5. Iterate and improve

For more information, refer to:
- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Official Account Manager](https://manager.line.biz/)
- Main [README.md](../README.md) file
