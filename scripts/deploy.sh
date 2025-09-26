#!/bin/bash

# Deploy and test script for Inventory QR App
# Usage: ./scripts/deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Environment
ENV=${1:-development}

echo -e "${GREEN}🚀 Deploying Inventory QR App - Environment: $ENV${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Run linting
echo -e "${YELLOW}🔍 Running linter...${NC}"
npm run lint || true

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build

# Run tests if available
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo -e "${YELLOW}🧪 Running tests...${NC}"
    npm test || true
fi

# Environment specific deployment
case $ENV in
    "production")
        echo -e "${YELLOW}🌐 Deploying to production...${NC}"
        
        # Check for Vercel
        if command_exists vercel; then
            vercel --prod
        else
            echo -e "${YELLOW}Vercel CLI not found. Install with: npm i -g vercel${NC}"
            echo -e "${GREEN}Build complete. Ready for manual deployment.${NC}"
        fi
        ;;
        
    "staging")
        echo -e "${YELLOW}🎭 Deploying to staging...${NC}"
        
        if command_exists vercel; then
            vercel
        else
            echo -e "${YELLOW}Starting preview server...${NC}"
            npm start
        fi
        ;;
        
    "development")
        echo -e "${YELLOW}💻 Starting development server...${NC}"
        npm run dev
        ;;
        
    *)
        echo -e "${RED}❌ Unknown environment: $ENV${NC}"
        echo "Usage: $0 [development|staging|production]"
        exit 1
        ;;
esac

echo -e "${GREEN}✨ Deployment script completed!${NC}"
