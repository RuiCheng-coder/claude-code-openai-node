# Deployment Guide

This guide covers various deployment options for the Claude Code OpenAI Node Server.

## 🚀 Quick Deployment

### Prerequisites
- Node.js 18+ installed
- Environment variables configured in `.env` file

### Basic Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🐳 Docker Deployment

### Using Docker

1. **Build the image**:
   ```bash
   docker build -t claude-proxy-server .
   ```

2. **Run the container**:
   ```bash
   docker run -p 8082:8082 --env-file .env claude-proxy-server
   ```

### Using Docker Compose

1. **Create `docker-compose.yml`**:
   ```yaml
   version: '3.8'
   services:
     claude-proxy:
       build: .
       ports:
         - "8082:8082"
       env_file:
         - .env
       restart: unless-stopped
       environment:
         - NODE_ENV=production
   ```

2. **Start the services**:
   ```bash
   docker-compose up -d
   ```

## ☁️ Cloud Deployment

### VPS Deployment (Ubuntu)

1. **Connect to your server**:
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup**:
   ```bash
   git clone https://github.com/your-repo/claude_proxy.git
   cd claude_proxy/server
   npm install
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your configuration
   ```

5. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start index.js --name "claude-proxy"
   pm2 startup
   pm2 save
   ```

### Using Nginx as Reverse Proxy

1. **Install Nginx**:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx configuration** (`/etc/nginx/sites-available/claude-proxy`):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:8082;
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

3. **Enable the site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/claude-proxy /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## 🔒 SSL/TLS Configuration

### Using Let's Encrypt with Certbot

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Get SSL certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal setup**:
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## 🚢 Container Registry Deployment

### Docker Hub

1. **Build and tag**:
   ```bash
   docker build -t your-username/claude-proxy-server:latest .
   ```

2. **Push to registry**:
   ```bash
   docker push your-username/claude-proxy-server:latest
   ```

3. **Pull and run on server**:
   ```bash
   docker run -p 8082:8082 --env-file .env your-username/claude-proxy-server:latest
   ```

## 🌐 Platform as a Service (PaaS)

### Heroku Deployment

1. **Install Heroku CLI**
2. **Create `Procfile`**:
   ```
   web: node index.js
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set BASE_URL=https://api.groq.com/openai/v1
   heroku config:set OPEN_AI_KEY=your-api-key
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

### Railway Deployment

1. **Connect GitHub repository**
2. **Set environment variables in Railway dashboard**
3. **Automatic deployment on git push**

## 🔧 Environment-Specific Configurations

### Development
```env
PORT=8082
NODE_ENV=development
BASE_URL=http://localhost:11434/v1
OPEN_AI_KEY=ollama
LOG_LEVEL=debug
```

### Staging
```env
PORT=3000
NODE_ENV=staging
BASE_URL=https://api.staging.example.com/v1
OPEN_AI_KEY=staging-api-key
LOG_LEVEL=info
```

### Production
```env
PORT=3000
NODE_ENV=production
BASE_URL=https://api.production.example.com/v1
OPEN_AI_KEY=production-api-key
LOG_LEVEL=warn
```

## 📊 Monitoring and Logging

### PM2 Monitoring
```bash
# View application status
pm2 status

# View logs
pm2 logs claude-proxy

# Monitor resources
pm2 monit
```

### Health Check Endpoint
```bash
curl https://your-domain.com/health
```

## 🔄 Zero-Downtime Deployment

### Using PM2
```bash
# Zero-downtime reload
pm2 reload claude-proxy

# Or restart with new environment
pm2 restart claude-proxy --update-env
```

### Using Docker
```bash
# Stop old container and start new one
docker stop claude-proxy
docker rm claude-proxy
docker run -d -p 8082:8082 --env-file .env --name claude-proxy claude-proxy-server:latest
```

## 🔍 Troubleshooting Deployment

### Common Issues

1. **Port conflicts**: Change `PORT` in `.env`
2. **Environment variables not loading**: Ensure `.env` file exists and is properly formatted
3. **Docker build failures**: Check Dockerfile and ensure all files are in context
4. **SSL certificate issues**: Verify domain configuration and DNS settings

### Logs Location
- **PM2**: `~/.pm2/logs/`
- **Docker**: `docker logs container-name`
- **Systemd**: `journalctl -u your-service-name`

## 📈 Scaling

### Horizontal Scaling
- Use load balancer (Nginx, HAProxy)
- Deploy multiple instances
- Use Redis for session storage if needed

### Vertical Scaling
- Increase server resources
- Optimize Node.js memory usage
- Use clustering for multi-core utilization

## 🔒 Security Considerations

- Use HTTPS in production
- Set appropriate CORS origins
- Implement rate limiting
- Use environment variables for sensitive data
- Regular security updates