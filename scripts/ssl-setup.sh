#!/bin/bash

# SSL Setup Script for MIS Work Permit System
# This script helps you obtain and configure SSL certificates from Let's Encrypt

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  MIS - SSL Certificate Setup Script${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    echo "Usage: ./ssl-setup.sh your-domain.com [email@example.com]"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

echo -e "${YELLOW}Domain: ${NC}$DOMAIN"
echo -e "${YELLOW}Email: ${NC}$EMAIL"
echo ""

# Create required directories
echo -e "${GREEN}[1/6] Creating directories...${NC}"
mkdir -p certbot/www
mkdir -p certbot/conf
mkdir -p nginx/ssl

# Update nginx config with domain
echo -e "${GREEN}[2/6] Updating nginx configuration...${NC}"
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.ssl.conf

# Update .env file with domain
echo -e "${GREEN}[3/6] Updating environment variables...${NC}"
if [ -f .env ]; then
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" .env
else
    echo "FRONTEND_URL=https://$DOMAIN" >> .env
fi

# Start services with initial nginx config (HTTP only)
echo -e "${GREEN}[4/6] Starting services with HTTP...${NC}"
cp nginx/nginx.init.conf nginx/nginx.conf.temp

# Create temporary docker-compose for initial setup
cat > docker-compose.init.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: permit_db
    environment:
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-postgres}
      POSTGRES_DB: \${DB_NAME:-permit_management}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - permit_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: permit_backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://\${DB_USER:-postgres}:\${DB_PASSWORD:-postgres}@postgres:5432/\${DB_NAME:-permit_management}?schema=public
      JWT_SECRET: \${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      JWT_EXPIRES_IN: \${JWT_EXPIRES_IN:-24h}
      FRONTEND_URL: https://$DOMAIN
    networks:
      - permit_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: permit_frontend
    depends_on:
      - backend
    networks:
      - permit_network

  nginx:
    image: nginx:alpine
    container_name: permit_nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.init.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - permit_network

volumes:
  postgres_data:

networks:
  permit_network:
EOF

docker-compose -f docker-compose.init.yml up -d

echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Obtain SSL certificate
echo -e "${GREEN}[5/6] Obtaining SSL certificate from Let's Encrypt...${NC}"
docker run -it --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Stop initial setup
echo -e "${GREEN}[6/6] Switching to SSL configuration...${NC}"
docker-compose -f docker-compose.init.yml down

# Start with full SSL config
docker-compose -f docker-compose.ssl.yml up -d

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"
sleep 5
docker-compose -f docker-compose.ssl.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.ssl.yml exec backend npm run prisma:seed

# Cleanup
rm docker-compose.init.yml
rm nginx/nginx.conf.temp 2>/dev/null || true

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  SSL Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Your MIS system is now available at:"
echo -e "${GREEN}  https://$DOMAIN${NC}"
echo ""
echo -e "Default credentials:"
echo -e "  Admin: admin@permitmanager.com / admin123"
echo -e "  Safety Officer: safety@permitmanager.com / safety123"
echo -e "  Requestor: requestor@permitmanager.com / user123"
echo ""
echo -e "${RED}IMPORTANT: Change default passwords immediately!${NC}"
echo ""
echo -e "SSL certificates will auto-renew via certbot container."
echo ""
