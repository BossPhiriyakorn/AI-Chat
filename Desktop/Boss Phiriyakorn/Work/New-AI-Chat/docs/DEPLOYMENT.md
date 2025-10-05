# Deployment Guide

This guide covers various deployment options for the LINE AI Chatbot.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud Platform account
- LINE Developers account
- Domain name (for production)

## Environment Setup

### 1. Google Cloud Platform

1. Create a new project or select existing one
2. Enable the following APIs:
   - Google Docs API
   - Google Sheets API
3. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file
   - Extract credentials for `.env` file

### 2. Google AI (Gemini)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create new API key
3. Add to `.env` file

### 3. LINE Official Account

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create new channel
3. Enable Messaging API
4. Get Channel Access Token and Channel Secret
5. Set webhook URL (after deployment)

## Deployment Options

### Option 1: Local Development

```bash
# Clone repository
git clone <repository-url>
cd line-ai-chatbot

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your credentials
# Start development server
npm run dev
```

### Option 2: PM2 (Recommended for VPS)

```bash
# Install PM2 globally
npm install -g pm2

# Install dependencies
npm install

# Start with PM2
npm run pm2:start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Docker

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
npm run docker:compose

# Or run directly
npm run docker:run
```

### Option 4: Cloud Platforms

#### Heroku

1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   heroku create your-app-name
   ```
3. Set environment variables:
   ```bash
   heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
   heroku config:set LINE_CHANNEL_SECRET=your_secret
   heroku config:set GEMINI_API_KEY=your_key
   # ... set other variables
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

#### Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
2. Login and create project:
   ```bash
   railway login
   railway init
   ```
3. Set environment variables:
   ```bash
   railway variables set LINE_CHANNEL_ACCESS_TOKEN=your_token
   # ... set other variables
   ```
4. Deploy:
   ```bash
   railway up
   ```

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy automatically on push

## Production Checklist

### Security

- [ ] Use HTTPS for webhook URL
- [ ] Keep environment variables secure
- [ ] Enable rate limiting
- [ ] Monitor logs for suspicious activity
- [ ] Regular security updates

### Performance

- [ ] Use PM2 cluster mode
- [ ] Enable caching for Google Docs
- [ ] Monitor memory usage
- [ ] Set up log rotation
- [ ] Configure health checks

### Monitoring

- [ ] Set up health check monitoring
- [ ] Configure log aggregation
- [ ] Set up alerts for failures
- [ ] Monitor API quotas
- [ ] Track response times

## Environment Variables

### Required Variables

```env
# LINE Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Google AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Google Docs
GOOGLE_DOCS_ID=your_google_docs_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_PRIVATE_KEY=your_private_key
GOOGLE_PROJECT_ID=your_project_id

# Google Sheets
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_SHEETS_RANGE=Sheet1!B:C
```

### Optional Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info
```

## SSL Certificate

For production deployment, you need SSL certificate for webhook URL.

### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare (Recommended)

1. Add your domain to Cloudflare
2. Set DNS records
3. Enable SSL/TLS encryption
4. Use Cloudflare's SSL certificate

## Monitoring Setup

### Health Check Monitoring

Set up monitoring for health endpoints:

```bash
# Simple health check
curl -f https://yourdomain.com/health

# Ping check
curl -f https://yourdomain.com/ping
```

### Log Monitoring

Use tools like:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Grafana + Loki**: Lightweight log aggregation
- **Papertrail**: Cloud-based log management
- **LogDNA**: Cloud logging service

### Uptime Monitoring

Services:
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring
- **StatusCake**: Simple monitoring
- **Better Uptime**: Modern monitoring

## Backup Strategy

### Code Backup

- Use Git for version control
- Regular commits and pushes
- Tag releases for rollback

### Data Backup

- Google Docs: Version history enabled
- Google Sheets: Version history enabled
- Environment variables: Store securely

### Configuration Backup

- Backup `.env` file securely
- Document all configuration changes
- Keep deployment scripts in version control

## Troubleshooting

### Common Issues

1. **Webhook not working**
   - Check webhook URL in LINE console
   - Verify SSL certificate
   - Check firewall settings

2. **Google API errors**
   - Verify service account permissions
   - Check API quotas
   - Verify document/sheet access

3. **High memory usage**
   - Enable PM2 cluster mode
   - Set memory limits
   - Monitor for memory leaks

4. **Slow responses**
   - Check network connectivity
   - Monitor API response times
   - Enable caching

### Debug Commands

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs line-ai-chatbot

# Monitor resources
pm2 monit

# Restart application
pm2 restart line-ai-chatbot

# Health check
curl -f https://yourdomain.com/health
```

### Log Analysis

```bash
# View error logs
tail -f logs/error.log

# Search for specific errors
grep "ERROR" logs/combined.log

# Monitor real-time logs
tail -f logs/combined.log
```

## Scaling

### Horizontal Scaling

- Use load balancer
- Deploy multiple instances
- Use PM2 cluster mode
- Consider container orchestration

### Vertical Scaling

- Increase server resources
- Optimize memory usage
- Use faster storage
- Upgrade to better hardware

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Monitor log files
- [ ] Check API quotas
- [ ] Review error logs
- [ ] Update documentation

### Security Updates

- [ ] Update Node.js regularly
- [ ] Update npm packages
- [ ] Review security advisories
- [ ] Test updates in staging

### Performance Optimization

- [ ] Monitor response times
- [ ] Optimize database queries
- [ ] Enable caching
- [ ] Review memory usage
- [ ] Profile application performance
