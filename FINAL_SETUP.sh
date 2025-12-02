#!/bin/bash
# Final Setup Script for Master Display
# Run this script to complete the deployment

echo "=========================================="
echo "Master Display - Final Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Setting up NGINX configuration...${NC}"
sudo cp /tmp/master-display-nginx.conf /etc/nginx/sites-available/master-display
sudo ln -sf /etc/nginx/sites-available/master-display /etc/nginx/sites-enabled/

echo -e "${BLUE}Step 2: Testing NGINX configuration...${NC}"
sudo nginx -t

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}NGINX configuration test failed. Please check the errors above.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 3: Reloading NGINX...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}✅ NGINX configured successfully!${NC}"
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo -e "${BLUE}Step 4: Installing Certbot for SSL...${NC}"
    sudo apt-get update
    sudo apt-get install -y certbot python3-certbot-nginx
fi

echo ""
echo -e "${BLUE}Step 5: Setting up SSL certificate...${NC}"
echo -e "${YELLOW}This will obtain a free SSL certificate from Let's Encrypt${NC}"
echo ""

# Get SSL certificate
sudo certbot --nginx -d mdl.prengerfurniture.com --non-interactive --agree-tos --register-unsafely-without-email --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate installed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  SSL setup encountered an issue. You can run it manually later with:${NC}"
    echo "   sudo certbot --nginx -d mdl.prengerfurniture.com"
fi

echo ""
echo -e "${BLUE}Step 6: Setting up PM2 to start on boot...${NC}"
pm2 startup systemd -u matt --hp /home/matt | grep 'sudo' | bash
pm2 save

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Master Display Setup Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${GREEN}🌐 Your application is now live at:${NC}"
echo "   https://mdl.prengerfurniture.com"
echo "   https://mdl.prengerfurniture.com/admin.html"
echo "   https://mdl.prengerfurniture.com/display.html"
echo ""
echo -e "${GREEN}🔑 Login Credentials:${NC}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo -e "${BLUE}📊 Useful Commands:${NC}"
echo "   pm2 status              - Check application status"
echo "   pm2 logs master-display - View application logs"
echo "   pm2 restart master-display - Restart application"
echo "   pm2 monit               - Monitor application"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "   1. Change the default admin password after first login"
echo "   2. Keep your server updated: sudo apt update && sudo apt upgrade"
echo "   3. SSL certificates auto-renew, but check: sudo certbot renew --dry-run"
echo ""
