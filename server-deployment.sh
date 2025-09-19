#!/bin/bash

# Automated Deployment Management System Setup Script
# Run as root: sudo ./setup-server.sh

set -e  # Exit on any error

DOMAIN="deploy.ringing.org.uk"
APP_USER="deployapp"
APP_DIR="/home/$APP_USER/app"
GITHUB_REPO="https://github.com/YOUR_USERNAME/deployment-management-system.git"  # Update this!

echo "🚀 Starting automated setup for Deployment Management System..."
echo "📍 Domain: $DOMAIN"
echo "👤 App User: $APP_USER"
echo "📁 App Directory: $APP_DIR"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release git nginx certbot python3-certbot-nginx ufw

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installations
echo "✅ Verifying installations..."
node --version
npm --version
nginx -v

# Create application user
echo "👤 Creating application user: $APP_USER..."
if id "$APP_USER" &>/dev/null; then
    echo "User $APP_USER already exists"
else
    useradd -m -s /bin/bash $APP_USER
    echo "Created user $APP_USER"
fi

# Create application directory
echo "📁 Setting up application directory..."
mkdir -p $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# Clone or download application files
echo "📥 Downloading application files..."
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd $APP_DIR
    sudo -u $APP_USER git pull
else
    echo "❓ Application source method:"
    echo "1. Clone from GitHub repository"
    echo "2. I'll manually copy files later"
    read -p "Choose option (1 or 2): " SOURCE_METHOD
    
    if [ "$SOURCE_METHOD" = "1" ]; then
        read -p "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git): " GITHUB_REPO
        echo "Cloning from: $GITHUB_REPO"
        sudo -u $APP_USER git clone $GITHUB_REPO $APP_DIR
    else
        echo "📋 Manual setup - you'll need to copy your files to $APP_DIR later"
        # Create basic structure for manual copying
        sudo -u $APP_USER mkdir -p $APP_DIR/src/components
        sudo -u $APP_USER mkdir -p $APP_DIR/deployment
        echo "Created basic directory structure in $APP_DIR"
    fi
fi

# Install dependencies and build (only if package.json exists)
if [ -f "$APP_DIR/package.json" ]; then
    echo "📦 Installing npm dependencies..."
    cd $APP_DIR
    sudo -u $APP_USER npm install
    
    echo "🔨 Building application..."
    sudo -u $APP_USER npm run build
else
    echo "⚠️ No package.json found. You'll need to copy your application files first."
fi

# Configure Nginx
echo "🌐 Configuring Nginx..."

# Create nginx configuration
cat > /etc/nginx/sites-available/deployment << EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $APP_DIR/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Hide server tokens
    server_tokens off;
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
if [ -L "/etc/nginx/sites-enabled/deployment" ]; then
    echo "Site already enabled"
else
    ln -s /etc/nginx/sites-available/deployment /etc/nginx/sites-enabled/
fi

# Remove default nginx site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️ Removing default Nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    systemctl restart nginx
    systemctl enable nginx
    echo "🔄 Nginx restarted and enabled"
else
    echo "❌ Nginx configuration error"
    exit 1
fi

# Configure firewall
echo "🛡️ Configuring firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable

# Setup SSL with Let's Encrypt
echo "🔒 Setting up SSL certificate for $DOMAIN..."

# Check if domain resolves to this server
echo "🔍 Checking DNS resolution for $DOMAIN..."
DOMAIN_IP=$(dig +short $DOMAIN)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
    echo "✅ DNS is correctly configured"
    
    # Get SSL certificate
    echo "📜 Obtaining SSL certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@ringing.org.uk --redirect
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate obtained successfully"
        
        # Setup auto-renewal
        systemctl enable certbot.timer
        echo "🔄 SSL auto-renewal enabled"
    else
        echo "❌ Failed to obtain SSL certificate"
        echo "You may need to:"
        echo "1. Ensure $DOMAIN points to this server ($SERVER_IP)"
        echo "2. Check firewall settings"
        echo "3. Run certbot manually: certbot --nginx -d $DOMAIN"
    fi
else
    echo "⚠️ DNS not configured correctly"
    echo "Current domain IP: $DOMAIN_IP"
    echo "Server IP: $SERVER_IP"
    echo "Please update your DNS records to point $DOMAIN to $SERVER_IP"
    echo "Then run: certbot --nginx -d $DOMAIN"
fi

# Create deployment script for easy updates
echo "📝 Creating deployment update script..."
cat > /home/$APP_USER/update-deployment.sh << 'EOF'
#!/bin/bash

# Update script for deployment management system
# Run as deployapp user

cd /home/deployapp/app

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting nginx..."
sudo systemctl reload nginx

echo "✅ Deployment updated successfully!"
echo "🌐 Visit: https://deploy.ringing.org.uk"
EOF

chown $APP_USER:$APP_USER /home/$APP_USER/update-deployment.sh
chmod +x /home/$APP_USER/update-deployment.sh

# Add deployapp user to sudo for nginx reload
echo "$APP_USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx, /usr/bin/systemctl restart nginx" >> /etc/sudoers.d/deployapp

# Final status check
echo ""
echo "🎉 Setup complete!"
echo ""
echo "📊 System Status:"
echo "=================="
echo "🌐 Domain: https://$DOMAIN"
echo "📁 App Directory: $APP_DIR"
echo "👤 App User: $APP_USER"
echo "🔒 SSL: $(if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then echo "✅ Enabled"; else echo "⚠️ Manual setup required"; fi)"
echo "🛡️ Firewall: $(ufw status | head -1)"
echo ""

# Show service status
echo "🔧 Service Status:"
echo "=================="
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Not running"
systemctl is-enabled nginx && echo "✅ Nginx: Auto-start enabled" || echo "❌ Nginx: Auto-start disabled"

echo ""
echo "📋 Next Steps:"
echo "=============="
if [ ! -f "$APP_DIR/package.json" ]; then
    echo "1. Copy your application files to: $APP_DIR"
    echo "2. Run as $APP_USER: cd $APP_DIR && npm install && npm run build"
    echo "3. Restart nginx: sudo systemctl restart nginx"
fi

echo "4. Test your deployment: https://$DOMAIN"
echo "5. To update later, run as $APP_USER: /home/$APP_USER/update-deployment.sh"
echo ""
echo "📁 Important files:"
echo "  - App files: $APP_DIR"
echo "  - Nginx config: /etc/nginx/sites-available/deployment"
echo "  - SSL certificates: /etc/letsencrypt/live/$DOMAIN/"
echo "  - Update script: /home/$APP_USER/update-deployment.sh"
echo ""
echo "🔧 Useful commands:"
echo "  - Check nginx status: systemctl status nginx"
echo "  - Check SSL status: certbot certificates"
echo "  - View nginx logs: tail -f /var/log/nginx/error.log"
echo "  - Test nginx config: nginx -t"

# Create a simple status check script
cat > /usr/local/bin/deployment-status << 'EOF'
#!/bin/bash
echo "🚀 Deployment Management System Status"
echo "======================================"
echo "🌐 Domain: https://deploy.ringing.org.uk"
echo "📅 Last updated: $(date)"
echo ""
echo "Services:"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Not running"
echo ""
echo "SSL Certificate:"
if [ -f /etc/letsencrypt/live/deploy.ringing.org.uk/fullchain.pem ]; then
    echo "✅ SSL Certificate: Active"
    echo "📅 Expires: $(certbot certificates 2>/dev/null | grep -A2 deploy.ringing.org.uk | grep "Expiry Date" | awk '{print $3, $4}')"
else
    echo "❌ SSL Certificate: Not found"
fi
echo ""
echo "🌐 Test access: curl -I https://deploy.ringing.org.uk"
EOF

chmod +x /usr/local/bin/deployment-status

echo "💡 Pro tip: Run 'deployment-status' anytime to check system status"
echo "🎯 Your deployment should be available at: https://$DOMAIN"