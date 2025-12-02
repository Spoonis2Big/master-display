# Deployment Guide - Ubuntu Server

This guide will help you deploy Master Display on your Ubuntu server at **mdl.prengerfurniture.com**.

## Prerequisites

- Ubuntu Server 20.04 or newer
- SSH access to your server
- Domain pointing to your server IP (mdl.prengerfurniture.com)
- Root or sudo access

## Step 1: Install Node.js

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 2: Install PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

## Step 3: Install and Configure NGINX

```bash
# Install NGINX
sudo apt install -y nginx

# Check NGINX status
sudo systemctl status nginx

# Enable NGINX to start on boot
sudo systemctl enable nginx
```

## Step 4: Deploy Application

### Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /var/www/master-display
sudo chown -R $USER:$USER /var/www/master-display
cd /var/www/master-display
```

### Clone or Upload Your Application

**Option A: Using Git (recommended)**
```bash
git clone https://github.com/yourusername/MasterDisplay.git .
```

**Option B: Using SCP from your local machine**
```bash
# On your local machine:
scp -r /path/to/MasterDisplay/* user@your-server-ip:/var/www/master-display/
```

### Install Dependencies

```bash
cd /var/www/master-display
npm install --production
```

## Step 5: Initialize Database

```bash
# Create database directory if it doesn't exist
mkdir -p database

# Initialize database
npm run init-db
```

## Step 6: Create Admin User

```bash
# Create your first admin user
npm run create-user

# Follow the prompts:
# Username: admin
# Password: [choose a strong password]
# Email: [your email]
```

## Step 7: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following content (replace the secret with a random string):

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=CHANGE-THIS-TO-A-SECURE-RANDOM-STRING-AT-LEAST-32-CHARACTERS
```

Generate a secure session secret:
```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save and exit (Ctrl+X, then Y, then Enter).

## Step 8: Set Up SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d mdl.prengerfurniture.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 9: Configure NGINX

```bash
# Create NGINX configuration
sudo nano /etc/nginx/sites-available/master-display
```

Copy the contents from the `nginx.conf` file in the repository:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name mdl.prengerfurniture.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mdl.prengerfurniture.com;

    ssl_certificate /etc/letsencrypt/live/mdl.prengerfurniture.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mdl.prengerfurniture.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    access_log /var/log/nginx/master-display-access.log;
    error_log /var/log/nginx/master-display-error.log;

    client_max_body_size 10M;

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

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp)$ {
        proxy_pass http://localhost:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site and restart NGINX:

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/master-display /etc/nginx/sites-enabled/

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
sudo nginx -t

# Restart NGINX
sudo systemctl restart nginx
```

## Step 10: Start Application with PM2

```bash
cd /var/www/master-display

# Update ecosystem.config.js with your SESSION_SECRET
nano ecosystem.config.js

# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Run the command that PM2 outputs (it will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Verify application is running
pm2 status
pm2 logs master-display
```

## Step 11: Configure Firewall (UFW)

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check firewall status
sudo ufw status
```

## Step 12: Create Required Directories

```bash
# Create logs directory
mkdir -p /var/www/master-display/logs

# Ensure proper permissions
sudo chown -R $USER:$USER /var/www/master-display
chmod -R 755 /var/www/master-display
```

## Step 13: Access Your Application

Open your browser and navigate to:

- **Main site**: https://mdl.prengerfurniture.com
- **Admin Panel**: https://mdl.prengerfurniture.com/admin.html
- **Master Display**: https://mdl.prengerfurniture.com/display.html

Login with the credentials you created in Step 6.

## Useful PM2 Commands

```bash
# View application status
pm2 status

# View logs
pm2 logs master-display
pm2 logs master-display --lines 100

# Restart application
pm2 restart master-display

# Stop application
pm2 stop master-display

# Start application
pm2 start master-display

# Monitor application
pm2 monit

# Reload application (zero-downtime)
pm2 reload master-display
```

## Backup Strategy

### Backup Database

```bash
# Create backup directory
mkdir -p /var/www/master-display/backups

# Backup database
cp /var/www/master-display/database/showroom.db \
   /var/www/master-display/backups/showroom-$(date +%Y%m%d-%H%M%S).db

# Backup uploads
tar -czf /var/www/master-display/backups/uploads-$(date +%Y%m%d-%H%M%S).tar.gz \
   /var/www/master-display/uploads/
```

### Automated Daily Backup (Cron)

```bash
# Edit crontab
crontab -e

# Add this line to backup daily at 2 AM:
0 2 * * * cd /var/www/master-display && cp database/showroom.db backups/showroom-$(date +\%Y\%m\%d).db && tar -czf backups/uploads-$(date +\%Y\%m\%d).tar.gz uploads/ 2>&1
```

## Updating the Application

```bash
# Navigate to application directory
cd /var/www/master-display

# Pull latest changes (if using git)
git pull origin main

# Install any new dependencies
npm install --production

# Restart application
pm2 restart master-display

# Or for zero-downtime restart:
pm2 reload master-display
```

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs master-display --err

# Check if port 3000 is in use
sudo netstat -tulpn | grep 3000

# Kill process on port 3000 if needed
sudo kill -9 $(sudo lsof -t -i:3000)
```

### NGINX Issues

```bash
# Test NGINX configuration
sudo nginx -t

# View NGINX error log
sudo tail -f /var/log/nginx/error.log

# Restart NGINX
sudo systemctl restart nginx
```

### Database Issues

```bash
# Check if database file exists
ls -la /var/www/master-display/database/

# Re-initialize database if needed (WARNING: This will delete existing data)
npm run init-db
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername mdl.prengerfurniture.com \
  -connect mdl.prengerfurniture.com:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/master-display

# Fix permissions
chmod -R 755 /var/www/master-display
chmod 644 /var/www/master-display/database/showroom.db
```

## Security Recommendations

1. **Change default session secret** in `.env` file
2. **Use strong passwords** for admin accounts
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Enable automatic security updates**:
   ```bash
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure --priority=low unattended-upgrades
   ```
5. **Setup fail2ban** to prevent brute-force attacks:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

## Performance Optimization

### Enable Gzip Compression in NGINX

Add to your NGINX config inside the `server` block:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### Regular Maintenance

```bash
# Clean PM2 logs (weekly)
pm2 flush

# Clean old backups (keep last 30 days)
find /var/www/master-display/backups -name "*.db" -mtime +30 -delete
find /var/www/master-display/backups -name "*.tar.gz" -mtime +30 -delete
```

## Monitoring

### Setup Monitoring with PM2 Plus (Optional)

```bash
# Install PM2 Plus
pm2 plus

# Follow the prompts to create an account
# This provides a web dashboard for monitoring
```

### Check Application Health

```bash
# Check if application is responding
curl -I https://mdl.prengerfurniture.com

# Check application status
pm2 status

# View resource usage
pm2 monit
```

## Support

If you encounter issues:

1. Check the logs: `pm2 logs master-display`
2. Check NGINX logs: `sudo tail -f /var/log/nginx/master-display-error.log`
3. Verify database exists: `ls -la database/`
4. Check application permissions
5. Ensure port 3000 is not blocked

## Quick Reference

| Task | Command |
|------|---------|
| Start app | `pm2 start master-display` |
| Stop app | `pm2 stop master-display` |
| Restart app | `pm2 restart master-display` |
| View logs | `pm2 logs master-display` |
| App status | `pm2 status` |
| Create user | `npm run create-user` |
| Backup DB | `cp database/showroom.db backups/` |
| Test NGINX | `sudo nginx -t` |
| Restart NGINX | `sudo systemctl restart nginx` |
| Renew SSL | `sudo certbot renew` |

---

**Your Master Display should now be live at https://mdl.prengerfurniture.com!**
