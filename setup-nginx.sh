#!/bin/bash
# NGINX Setup Script for Master Display

echo "🌐 Setting up NGINX for Master Display..."

# Copy configuration to sites-available
sudo cp /tmp/master-display-nginx.conf /etc/nginx/sites-available/master-display

# Create symbolic link to enable site
sudo ln -sf /etc/nginx/sites-available/master-display /etc/nginx/sites-enabled/

# Test NGINX configuration
echo "🧪 Testing NGINX configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ NGINX configuration is valid"
    echo "🔄 Reloading NGINX..."
    sudo systemctl reload nginx
    echo "✅ NGINX reloaded successfully"
else
    echo "❌ NGINX configuration test failed. Please check the errors above."
    exit 1
fi

echo ""
echo "✅ NGINX setup complete!"
echo "Your site should now be accessible at http://mdl.prengerfurniture.com"
echo ""
echo "Next step: Set up SSL certificate"
echo "Run: sudo certbot --nginx -d mdl.prengerfurniture.com"
