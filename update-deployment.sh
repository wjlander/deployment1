#!/bin/bash

# Deployment Management System Update Script
# Run as root: sudo ./update-deployment.sh

set -e  # Exit on any error

# Configuration
APP_DIR="/var/www/deployment-app"
SERVICE_NAME="deployment-system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Updating Deployment Management System${NC}"
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}❌ App directory $APP_DIR not found${NC}"
    echo "Please ensure the deployment system is installed first."
    exit 1
fi

# Get the current user who ran sudo
REAL_USER="$SUDO_USER"
if [ -z "$REAL_USER" ]; then
    REAL_USER=$(logname 2>/dev/null || echo "root")
fi

echo -e "${BLUE}📍 Configuration:${NC}"
echo "  App Directory: $APP_DIR"
echo "  User: $REAL_USER"
echo ""

cd $APP_DIR

echo -e "${BLUE}📥 Step 1: Pulling latest changes...${NC}"
if [ -d ".git" ]; then
    sudo -u $REAL_USER git pull origin main
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Git pull successful${NC}"
    else
        echo -e "${YELLOW}⚠️ Git pull failed or no changes${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Not a git repository - manual update required${NC}"
    echo "Please manually copy your updated files to $APP_DIR"
    read -p "Continue with build? (y/N): " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        echo "Update cancelled."
        exit 0
    fi
fi

echo -e "${BLUE}📦 Step 2: Installing dependencies...${NC}"
if [ -f "package.json" ]; then
    sudo -u $REAL_USER npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ package.json not found${NC}"
    exit 1
fi

echo -e "${BLUE}🔨 Step 3: Building application...${NC}"
sudo -u $REAL_USER npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Step 4: Setting permissions...${NC}"
chown -R $REAL_USER:www-data $APP_DIR
chmod -R 755 $APP_DIR
chown -R $REAL_USER:www-data $APP_DIR/dist
chmod -R 755 $APP_DIR/dist

# Verify dist directory and index.html exist
if [ ! -d "$APP_DIR/dist" ]; then
    echo -e "${RED}❌ dist directory not found after build${NC}"
    exit 1
fi

if [ ! -f "$APP_DIR/dist/index.html" ]; then
    echo -e "${RED}❌ index.html not found in dist directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Permissions set correctly${NC}"

echo -e "${BLUE}🧪 Step 5: Testing Nginx configuration...${NC}"
nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration error${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Step 6: Reloading Nginx...${NC}"
systemctl reload nginx
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload Nginx${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Step 7: Verifying deployment...${NC}"
sleep 2

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is not running${NC}"
    systemctl status nginx --no-pager -l
    exit 1
fi

# Get domain from nginx config
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/$SERVICE_NAME 2>/dev/null | awk '{print $2}' | sed 's/;//' || echo "localhost")

# Test local access
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo -e "${GREEN}✅ Local site is accessible (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️ Local site returned HTTP $HTTP_STATUS${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Update completed successfully!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "  📁 App Directory: $APP_DIR"
echo "  🌐 Domain: $DOMAIN"
echo "  📅 Updated: $(date)"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  - Check status: deployment-status"
echo "  - View logs: tail -f /var/log/nginx/error.log"
echo "  - Test config: nginx -t"
echo "  - Update again: update-deployment"
echo ""
echo -e "${GREEN}🌐 Your site should be available at: http://$DOMAIN${NC}"

# Final status check
echo -e "${BLUE}📋 Final Status Check:${NC}"
echo "===================="
systemctl is-active nginx >/dev/null 2>&1 && echo -e "${GREEN}✅ Nginx: Running${NC}" || echo -e "${RED}❌ Nginx: Not running${NC}"
[ -f "$APP_DIR/dist/index.html" ] && echo -e "${GREEN}✅ App files: Present${NC}" || echo -e "${RED}❌ App files: Missing${NC}"
[ -r "$APP_DIR/dist/index.html" ] && echo -e "${GREEN}✅ File permissions: OK${NC}" || echo -e "${RED}❌ File permissions: Issue${NC}"