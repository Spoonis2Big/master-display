#!/bin/bash

# Deployment script for Master Display
# Target: mdl.prengerfurniture.com (192.168.0.116)

SERVER="matt@192.168.0.116"
APP_DIR="/var/www/master-display"
PORT=3002

echo "🚀 Starting deployment to mdl.prengerfurniture.com..."

# Create directory on server
echo "📁 Creating application directory..."
ssh $SERVER "sudo mkdir -p $APP_DIR && sudo chown -R matt:matt $APP_DIR"

# Copy files to server (excluding node_modules, .git, database with data)
echo "📦 Copying files to server..."
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'database' \
           --exclude 'uploads' \
           --exclude 'logs' \
           --exclude 'create-admin.js' \
           ./ $SERVER:$APP_DIR/

# Install dependencies on server
echo "📥 Installing dependencies..."
ssh $SERVER "cd $APP_DIR && npm install --production"

# Create necessary directories
echo "📂 Creating necessary directories..."
ssh $SERVER "cd $APP_DIR && mkdir -p database uploads logs"

# Initialize database
echo "💾 Initializing database..."
ssh $SERVER "cd $APP_DIR && npm run init-db"

# Create admin user
echo "👤 Creating admin user..."
ssh $SERVER "cd $APP_DIR && node -e \"
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database/showroom.db');
const db = new sqlite3.Database(dbPath);

async function createUser() {
  const username = 'admin';
  const password = 'admin123';
  const email = 'admin@prengerfurniture.com';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email],
      function(err) {
        if (err && !err.message.includes('UNIQUE')) {
          console.log('❌ Error creating user:', err.message);
        } else {
          console.log('✅ Admin user ready');
        }
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
  }
}

createUser();
\""

# Create .env file
echo "⚙️  Configuring environment..."
ssh $SERVER "cd $APP_DIR && cat > .env << 'EOF'
NODE_ENV=production
PORT=$PORT
SESSION_SECRET=$(openssl rand -hex 32)
EOF"

# Check if PM2 is installed
echo "🔍 Checking PM2..."
if ! ssh $SERVER "which pm2 > /dev/null 2>&1"; then
    echo "📦 Installing PM2..."
    ssh $SERVER "sudo npm install -g pm2"
fi

# Update ecosystem.config.js with correct port
echo "📝 Updating PM2 configuration..."
ssh $SERVER "cd $APP_DIR && cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'master-display',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF"

# Stop existing instance if running
echo "🛑 Stopping existing instance..."
ssh $SERVER "cd $APP_DIR && pm2 stop master-display 2>/dev/null || true"

# Start application with PM2
echo "▶️  Starting application..."
ssh $SERVER "cd $APP_DIR && pm2 start ecosystem.config.js --env production"

# Save PM2 configuration
ssh $SERVER "pm2 save"

# Setup PM2 startup script
echo "🔧 Setting up PM2 startup..."
ssh $SERVER "pm2 startup systemd -u matt --hp /home/matt | grep 'sudo' | bash"

# Install certbot if not installed
echo "🔒 Checking for Certbot..."
if ! ssh $SERVER "which certbot > /dev/null 2>&1"; then
    echo "📦 Installing Certbot..."
    ssh $SERVER "sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx"
fi

# Configure NGINX
echo "🌐 Configuring NGINX..."
ssh $SERVER "sudo tee /etc/nginx/sites-available/master-display > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name mdl.prengerfurniture.com;

    access_log /var/log/nginx/master-display-access.log;
    error_log /var/log/nginx/master-display-error.log;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|webp)\$ {
        proxy_pass http://localhost:$PORT;
        expires 7d;
        add_header Cache-Control \"public, immutable\";
    }

    location /uploads/ {
        proxy_pass http://localhost:$PORT;
        expires 30d;
        add_header Cache-Control \"public, immutable\";
    }
}
EOF"

# Enable site
echo "✅ Enabling NGINX site..."
ssh $SERVER "sudo ln -sf /etc/nginx/sites-available/master-display /etc/nginx/sites-enabled/"

# Test NGINX configuration
echo "🧪 Testing NGINX configuration..."
ssh $SERVER "sudo nginx -t"

# Reload NGINX
echo "🔄 Reloading NGINX..."
ssh $SERVER "sudo systemctl reload nginx"

# Get SSL certificate
echo "🔐 Setting up SSL certificate..."
echo "Note: This requires your domain to be pointing to your server's public IP"
read -p "Do you want to set up SSL now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh $SERVER "sudo certbot --nginx -d mdl.prengerfurniture.com --non-interactive --agree-tos --email admin@prengerfurniture.com || echo 'SSL setup failed - you can run it manually later'"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   http://mdl.prengerfurniture.com"
echo "   http://mdl.prengerfurniture.com/admin.html"
echo "   http://mdl.prengerfurniture.com/display.html"
echo ""
echo "🔑 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - Check application status"
echo "   pm2 logs master-display - View application logs"
echo "   pm2 restart master-display - Restart application"
echo ""
