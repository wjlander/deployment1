#!/bin/bash

# Server Setup Script for Ubuntu/Debian
# Run as root or with sudo

echo "🚀 Setting up Deployment Management System on Ubuntu/Debian..."

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install nginx
apt install -y nginx

# Install PM2 for process management
npm install -g pm2

# Create application user
useradd -m -s /bin/bash deployapp
mkdir -p /home/deployapp/app
chown -R deployapp:deployapp /home/deployapp/app

# Clone or copy your application files to /home/deployapp/app

echo "✅ Server setup complete!"
echo "Next steps:"
echo "1. Copy your application files to /home/deployapp/app"
echo "2. Run: cd /home/deployapp/app && npm install"
echo "3. Run: npm run build"
echo "4. Copy deployment/nginx.conf to /etc/nginx/sites-available/deployment"
echo "5. Run: ln -s /etc/nginx/sites-available/deployment /etc/nginx/sites-enabled/"
echo "6. Run: systemctl restart nginx"
