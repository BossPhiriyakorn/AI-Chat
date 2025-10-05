# Deployment Guide

## Overview

This guide covers deploying the LINE AI Chatbot to various platforms.

## Prerequisites

- Node.js 18.0.0 or higher
- Google Cloud Platform account
- LINE Developer account
- Domain with SSL certificate (for webhook)

## Deployment Options

### 1. Heroku

#### Setup

1. Install Heroku CLI
2. Login to Heroku
3. Create a new app

```bash
heroku login
heroku create your-app-name
```

#### Configuration

Set environment variables:

```bash
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
heroku config:set GEMINI_API_KEY=your_gemini_key
heroku config:set GOOGLE_DOCS_ID=your_docs_id
heroku config:set GOOGLE_SHEETS_ID=your_sheets_id
heroku config:set NODE_ENV=production
```

#### Deploy

```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

#### Add Google Credentials

```bash
# Create credentials.json file
echo '{"type":"service_account",...}' > credentials.json

# Add to Heroku
heroku config:set GOOGLE_CREDENTIALS="$(cat credentials.json)"
```

### 2. Railway

#### Setup

1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically

#### Environment Variables

```env
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
GEMINI_API_KEY=your_gemini_key
GOOGLE_DOCS_ID=your_docs_id
GOOGLE_SHEETS_ID=your_sheets_id
GOOGLE_CREDENTIALS={"type":"service_account",...}
NODE_ENV=production
```

### 3. VPS/Cloud Server

#### Setup

1. Install Node.js and PM2
2. Clone repository
3. Install dependencies
4. Configure environment

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <repository-url>
cd line-ai-chatbot

# Install dependencies
npm install --production

# Create .env file
cp env.example .env
# Edit .env with your configuration

# Create credentials.json
# Add your Google Cloud credentials

# Start with PM2
pm2 start index.js --name "line-ai-chatbot"
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Docker

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

#### Build and Run

```bash
# Build image
docker build -t line-ai-chatbot .

# Run container
docker run -d \
  --name line-ai-chatbot \
  -p 3000:3000 \
  -e LINE_CHANNEL_ACCESS_TOKEN=your_token \
  -e LINE_CHANNEL_SECRET=your_secret \
  -e GEMINI_API_KEY=your_gemini_key \
  -e GOOGLE_DOCS_ID=your_docs_id \
  -e GOOGLE_SHEETS_ID=your_sheets_id \
  -e NODE_ENV=production \
  -v $(pwd)/credentials.json:/app/credentials.json \
  line-ai-chatbot
```

#### Docker Compose

```yaml
version: '3.8'

services:
  line-ai-chatbot:
    build: .
    ports:
      - "3000:3000"
    environment:
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GOOGLE_DOCS_ID=${GOOGLE_DOCS_ID}
      - GOOGLE_SHEETS_ID=${GOOGLE_SHEETS_ID}
      - NODE_ENV=production
    volumes:
      - ./credentials.json:/app/credentials.json
    restart: unless-stopped
```

## SSL Certificate

### Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare

1. Add domain to Cloudflare
2. Change nameservers
3. Enable SSL/TLS encryption
4. Set SSL mode to "Full (strict)"

## Environment Configuration

### Production Environment Variables

```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_production_token
LINE_CHANNEL_SECRET=your_production_secret

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Google APIs Configuration
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_DOCS_ID=your_production_docs_id
GOOGLE_SHEETS_ID=your_production_sheets_id
GOOGLE_SHEETS_RANGE=Sheet1!B:C

# Server Configuration
PORT=3000
NODE_ENV=production

# Bot Configuration
BOT_NAME=Your Bot Name
BOT_PERSONALITY=helpful, friendly, professional
DEFAULT_RESPONSE=ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือเพิ่มเติม
```

## Monitoring

### PM2 Monitoring

```bash
# View logs
pm2 logs line-ai-chatbot

# Monitor
pm2 monit

# Restart
pm2 restart line-ai-chatbot

# Stop
pm2 stop line-ai-chatbot
```

### Health Check

```bash
# Check if service is running
curl https://your-domain.com/

# Expected response
{
  "status": "OK",
  "message": "LINE AI Chatbot is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Log Monitoring

```bash
# View application logs
tail -f /var/log/line-ai-chatbot.log

# View PM2 logs
pm2 logs line-ai-chatbot --lines 100
```

## Security

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Environment Security

- Never commit `.env` files
- Use strong, unique API keys
- Regularly rotate credentials
- Monitor access logs
- Use HTTPS for all communications

### Google Cloud Security

1. Enable API key restrictions
2. Set up service account with minimal permissions
3. Use IAM roles for access control
4. Enable audit logging

## Backup

### Database Backup

```bash
# Backup Google Sheets (if using as database)
# Use Google Sheets API to export data
# Or use Google Drive API to backup files
```

### Configuration Backup

```bash
# Backup environment variables
cp .env .env.backup

# Backup credentials
cp credentials.json credentials.json.backup
```

## Scaling

### Horizontal Scaling

1. Use load balancer (Nginx, HAProxy)
2. Deploy multiple instances
3. Use Redis for session storage
4. Implement health checks

### Vertical Scaling

1. Increase server resources
2. Optimize Node.js performance
3. Use PM2 cluster mode
4. Monitor resource usage

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Permission denied**
   ```bash
   sudo chown -R $USER:$USER /path/to/app
   chmod +x scripts/setup.js
   ```

3. **Environment variables not loaded**
   - Check `.env` file exists
   - Verify variable names
   - Restart application

4. **Google API errors**
   - Check credentials.json
   - Verify API quotas
   - Check service account permissions

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development npm start

# Or with PM2
pm2 start index.js --name "line-ai-chatbot" --env development
```

## Maintenance

### Regular Tasks

1. **Update dependencies**
   ```bash
   npm update
   npm audit fix
   ```

2. **Monitor logs**
   ```bash
   pm2 logs line-ai-chatbot --lines 1000
   ```

3. **Check service status**
   ```bash
   pm2 status
   curl https://your-domain.com/
   ```

4. **Backup data**
   - Export Google Sheets data
   - Backup configuration files
   - Test restore procedures

### Updates

1. **Code updates**
   ```bash
   git pull origin main
   npm install
   pm2 restart line-ai-chatbot
   ```

2. **Configuration updates**
   - Update environment variables
   - Restart services
   - Test functionality

## Performance Optimization

### Node.js Optimization

1. **Enable clustering**
   ```bash
   pm2 start index.js -i max --name "line-ai-chatbot"
   ```

2. **Memory management**
   - Monitor memory usage
   - Set memory limits
   - Use garbage collection flags

3. **Caching**
   - Cache Google Sheets data
   - Implement response caching
   - Use Redis for session storage

### Database Optimization

1. **Google Sheets optimization**
   - Limit data range
   - Use efficient queries
   - Implement data pagination

2. **API optimization**
   - Batch API requests
   - Implement retry logic
   - Use connection pooling
