# FaceAttend - Deployment Guide

## 🚀 Production Deployment Guide

### Prerequisites

- Node.js 18+ dan npm
- PostgreSQL database
- Domain dengan SSL certificate
- Server Linux (Ubuntu 20.04+ recommended)

---

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration ⚠️ CRITICAL

**File: `.env`**

```bash
# Database (MUST CHANGE)
DATABASE_URL=postgresql://prod_user:secure_password@your-db-host:5432/faceattend_prod

# Server
PORT=5000
NODE_ENV=production

# JWT Authentication (MUST CHANGE)
JWT_SECRET=GENERATE_32+_CHARACTER_RANDOM_STRING_HERE
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session (MUST CHANGE)
SESSION_SECRET=GENERATE_32+_CHARACTER_RANDOM_STRING_HERE
SESSION_MAX_AGE=86400000

# CORS (MUST CHANGE)
CORS_ORIGIN=https://your-production-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# Face Recognition
FACE_RECOGNITION_THRESHOLD=0.6
FACE_RECOGNITION_DISTANCE_THRESHOLD=0.4

# Security
BCRYPT_ROUNDS=10

# Logging
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
```

### 2. Generate Secure Secrets

```bash
# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Session secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Change Default Passwords

**Update in your database or storage layer:**
```typescript
// Current defaults (FOR DEVELOPMENT ONLY):
admin / Admin@123
hrd / Hrd@123
emp / Emp@123

// Change to strong passwords (16+ characters):
admin / YourStrongPassword123!@#
hrd / AnotherStrongPassword456!@#
emp / EmployeeStrongPassword789!@#
```

### 4. Database Setup

```bash
# Create production database
createdb faceattend_prod

# Run migrations
npm run db:push

# Seed initial data (if needed)
# Note: Modify seed data in server/storage.ts first
```

### 5. Dependency Security

```bash
# Check for vulnerabilities
npm audit

# Fix non-breaking vulnerabilities
npm audit fix

# Review remaining vulnerabilities
npm audit fix --force  # Use with caution!
```

---

## 🖥️ Server Setup

### Option 1: PM2 (Recommended for Node.js apps)

#### Install PM2
```bash
npm install -g pm2
```

#### Create ecosystem file
**File: `ecosystem.config.js`**
```javascript
module.exports = {
  apps: [{
    name: 'faceattend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    max_memory_restart: '500M'
  }]
};
```

#### Build and start
```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

#### PM2 commands
```bash
# Check status
pm2 status

# View logs
pm2 logs faceattend

# Restart
pm2 restart faceattend

# Stop
pm2 stop faceattend

# Monitor
pm2 monit
```

### Option 2: Docker

#### Dockerfile
**File: `Dockerfile`**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/faceattend
    env_file:
      - .env
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=faceattend
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Docker commands
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Restart
docker-compose restart app

# Stop
docker-compose down
```

---

## 🌐 Nginx Configuration

### Install Nginx
```bash
sudo apt-get update
sudo apt-get install nginx
```

### Nginx config
**File: `/etc/nginx/sites-available/faceattend`**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files (if any)
    location /static {
        alias /var/www/faceattend/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API documentation
    location /api-docs {
        proxy_pass http://localhost:5000/api-docs;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }

    # Client max body size (for file uploads)
    client_max_body_size 10M;
}
```

### Enable site and restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/faceattend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 SSL Certificate (Let's Encrypt)

### Install Certbot
```bash
sudo apt-get install certbot python3-certbot-nginx
```

### Get certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot will automatically set up renewal cron job
```

---

## 📊 Monitoring & Logging

### Application Logs
```bash
# View logs (PM2)
pm2 logs faceattend --lines 100

# View error logs
tail -f logs/error.log

# View combined logs
tail -f logs/combined.log
```

### System Monitoring

#### Install monitoring tools
```bash
# Install htop
sudo apt-get install htop

# Install netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

### Log Rotation
**File: `/etc/logrotate.d/faceattend`**
```
/path/to/faceattend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🔄 Database Backup

### Automated PostgreSQL backup

**File: `/etc/cron.daily/backup-faceattend-db`**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/faceattend"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="faceattend_prod"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/faceattend_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "faceattend_*.sql.gz" -mtime +30 -delete

echo "Backup completed: faceattend_$DATE.sql.gz"
```

### Make executable
```bash
sudo chmod +x /etc/cron.daily/backup-faceattend-db
```

### Manual backup
```bash
pg_dump faceattend_prod > backup_$(date +%Y%m%d).sql
```

### Restore from backup
```bash
psql faceattend_prod < backup_20251118.sql
```

---

## 🚦 Health Monitoring

### Setup healthcheck monitoring
```bash
# Install uptime monitoring tool
npm install -g pm2-server-monit

# Configure monitoring
pm2 install pm2-server-monit
```

### External monitoring (recommended)
- UptimeRobot (https://uptimerobot.com/)
- Pingdom (https://www.pingdom.com/)
- StatusCake (https://www.statuscake.com/)

**Monitor endpoints:**
- https://your-domain.com/health
- https://your-domain.com/health/ready
- https://your-domain.com/health/live

---

## 🔧 Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs faceattend --err

# Check environment variables
pm2 env faceattend

# Check port availability
sudo lsof -i :5000
```

### Database connection issues
```bash
# Test database connection
psql -h your-db-host -U your-user -d faceattend_prod

# Check DATABASE_URL format
echo $DATABASE_URL
```

### High memory usage
```bash
# Check memory
pm2 monit

# Restart with memory limit
pm2 restart faceattend --max-memory-restart 500M
```

### SSL certificate issues
```bash
# Test certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check Nginx configuration
sudo nginx -t
```

---

## 📱 Post-Deployment Testing

### 1. Health checks
```bash
curl https://your-domain.com/health
curl https://your-domain.com/health/ready
curl https://your-domain.com/health/live
```

### 2. API endpoints
```bash
# Test login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourNewPassword"}'

# Test protected endpoint
curl https://your-domain.com/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Frontend access
```bash
# Test main page
curl -I https://your-domain.com/

# Test API documentation
curl -I https://your-domain.com/api-docs
```

### 4. Security headers
```bash
curl -I https://your-domain.com/ | grep -i "security\|frame\|xss"
```

---

## 📊 Performance Optimization

### Enable compression
```bash
# Already enabled in application (compression middleware)
# Additional Nginx gzip compression configured
```

### Enable caching
```nginx
# Add to Nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### Database optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_attendances_employee_date ON attendances(employee_id, date);
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_schedules_employee ON schedules(employee_id);
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Secure secrets generated
- [ ] Default passwords changed
- [ ] Database created and configured
- [ ] Dependencies audited
- [ ] Application built successfully
- [ ] Tests passed

### Deployment
- [ ] Application deployed (PM2/Docker)
- [ ] Nginx configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Logs configured
- [ ] Backup script set up
- [ ] Monitoring enabled

### Post-Deployment
- [ ] Health checks passing
- [ ] API endpoints accessible
- [ ] Frontend loading
- [ ] Login working
- [ ] JWT authentication working
- [ ] Database connections stable
- [ ] Logs being written
- [ ] Backups running

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] CORS configured correctly
- [ ] No default passwords in use
- [ ] npm audit clean
- [ ] Firewall rules configured

---

## 🆘 Support

### Logs location
- Application: `/path/to/faceattend/logs/`
- Nginx: `/var/log/nginx/`
- PM2: `~/.pm2/logs/`

### Important commands
```bash
# View application status
pm2 status

# Restart application
pm2 restart faceattend

# View logs
pm2 logs faceattend

# Check database
psql faceattend_prod -c "SELECT COUNT(*) FROM users;"

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

---

**Deployment Guide Version:** 1.0  
**Last Updated:** 2025-11-18  
**Recommended for:** Production environments with Ubuntu 20.04+
