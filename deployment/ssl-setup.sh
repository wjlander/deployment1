#!/bin/bash

# SSL Setup with Let's Encrypt
# Run after basic nginx setup

echo "🔒 Setting up SSL with Let's Encrypt..."

# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace your-domain.com with actual domain)
certbot --nginx -d your-domain.com

# Auto-renewal
systemctl enable certbot.timer

echo "✅ SSL setup complete!"
