#!/bin/bash

# Debug script for Nginx 500 errors
# Run as root: sudo ./debug-nginx.sh

echo "🔍 Debugging Nginx 500 Internal Server Error"
echo "============================================="

# Get the domain and app directory from nginx config
DOMAIN=$(grep "server_name" /etc/nginx/sites-available/deployment-system | awk '{print $2}' | sed 's/;//')
APP_DIR=$(grep "root" /etc/nginx/sites-available/deployment-system | awk '{print $2}' | sed 's/;//' | sed 's|/dist||')
APP_DIR=$(grep "root" /etc/nginx/sites-available/deployment-system | awk '{print $2}' | sed 's/;//')

echo "Domain: $DOMAIN"
echo "App Directory: $APP_DIR"
echo ""

echo "1. Checking Nginx status:"
systemctl status nginx --no-pager -l

echo ""
echo "2. Checking Nginx error logs:"
echo "Last 20 lines of error log:"
tail -20 /var/log/nginx/error.log

echo ""
echo "3. Checking file permissions:"
echo "App directory permissions:"
ls -la $APP_DIR/

if [ -d "$APP_DIR/dist" ]; then
    echo ""
    echo "Dist directory permissions:"
    ls -la $APP_DIR/dist/
    
    echo ""
    echo "Index file check:"
    if [ -f "$APP_DIR/dist/index.html" ]; then
        echo "✅ index.html exists"
        ls -la $APP_DIR/dist/index.html
        echo "File size: $(wc -c < $APP_DIR/dist/index.html) bytes"
    else
        echo "❌ index.html missing"
    fi
else
    echo "❌ dist directory missing"
fi

echo ""
echo "4. Testing Nginx configuration:"
nginx -t

echo ""
echo "5. Checking if nginx can read the files:"
sudo -u www-data test -r $APP_DIR/dist/index.html && echo "✅ www-data can read index.html" || echo "❌ www-data cannot read index.html"

echo ""
echo "6. SELinux status (if applicable):"
if command -v getenforce &> /dev/null; then
    getenforce
else
    echo "SELinux not installed"
fi

echo ""
echo "7. Disk space:"
df -h $APP_DIR

echo ""
echo "8. Recent access log entries:"
if [ -f "/var/log/nginx/deployment-system_access.log" ]; then
    tail -10 /var/log/nginx/deployment-system_access.log
else
    echo "No specific access log found, checking main access log:"
    tail -10 /var/log/nginx/access.log | grep $DOMAIN
fi

echo ""
echo "🔧 Suggested fixes:"
echo "==================="
echo "1. Fix permissions: sudo chmod -R 755 $APP_DIR/dist"
echo "2. Fix ownership: sudo chown -R \$USER:www-data $APP_DIR/dist"
echo "3. Restart nginx: sudo systemctl restart nginx"
echo "4. Check logs: sudo tail -f /var/log/nginx/error.log"