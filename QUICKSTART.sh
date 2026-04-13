#!/bin/bash

# Alfred Camera Relay Server - Quick Start Script
# Run this script to set up and start the relay server locally

set -e

echo "================================"
echo "Alfred Camera Relay Server"
echo "Quick Start Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}1. Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"
echo ""

# Check npm
echo -e "${BLUE}2. Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"
echo ""

# Install dependencies
echo -e "${BLUE}3. Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

# Setup environment file
echo -e "${BLUE}4. Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Update .env with your database credentials before running migrations${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Check PostgreSQL
echo -e "${BLUE}5. Checking PostgreSQL...${NC}"
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL client found${NC}"

    # Try to connect (requires local PostgreSQL)
    if psql -l > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL server is running${NC}"

        # Check if database exists
        if psql -lqt | cut -d \| -f 1 | grep -qw alfred_relay; then
            echo -e "${GREEN}✓ Database 'alfred_relay' already exists${NC}"
        else
            echo -e "${YELLOW}⚠ Database 'alfred_relay' not found${NC}"
            echo "Create it manually or follow instructions in SETUP.md"
        fi
    else
        echo -e "${YELLOW}⚠ PostgreSQL server is not running${NC}"
        echo "Start PostgreSQL before running migrations"
    fi
else
    echo -e "${YELLOW}⚠ PostgreSQL client not found (optional for remote databases)${NC}"
fi
echo ""

# Show next steps
echo -e "${BLUE}6. Next Steps:${NC}"
echo ""
echo "For Local Development with Docker:"
echo -e "  ${GREEN}docker-compose up -d${NC}"
echo "  ${GREEN}docker-compose exec relay_server npm run migrate${NC}"
echo ""
echo "For Local Development without Docker:"
echo -e "  1. Create PostgreSQL database (see SETUP.md)"
echo -e "  ${GREEN}npm run migrate${NC}"
echo -e "  ${GREEN}npm run dev${NC}"
echo ""
echo "Then test with:"
echo -e "  ${GREEN}curl http://localhost:3000/api/health${NC}"
echo ""

# Offer to start server
echo -e "${BLUE}Would you like to start the development server now? (y/n)${NC}"
read -r -p ">> " response

if [[ "$response" == "y" || "$response" == "Y" ]]; then
    echo ""
    echo -e "${GREEN}Starting relay server...${NC}"
    npm run dev
else
    echo ""
    echo -e "${GREEN}✓ Setup complete!${NC}"
    echo ""
    echo "To start the server later, run:"
    echo -e "  ${GREEN}npm run dev${NC}"
    echo ""
    echo "For more information, see:"
    echo "  - README.md - Quick start guide"
    echo "  - SETUP.md - Detailed setup instructions"
    echo "  - API.md - API documentation"
fi
