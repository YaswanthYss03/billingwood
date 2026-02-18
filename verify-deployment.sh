#!/bin/bash

# BlitzPOS - Quick Deployment Verification Script
# Run this after deployment to verify everything works

echo "🚀 BlitzPOS Deployment Verification"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Read URLs
read -p "Enter your Render backend URL (e.g., https://blitzpos-backend.onrender.com): " BACKEND_URL
read -p "Enter your Vercel frontend URL (e.g., https://blitzpos.vercel.app): " FRONTEND_URL

echo ""
echo "Testing Deployment..."
echo ""

# Test 1: Backend Health Check
echo -n "1️⃣  Testing backend health... "
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/api/v1/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test 2: Backend API Documentation
echo -n "2️⃣  Testing API docs... "
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs")
if [ "$DOCS_STATUS" = "200" ] || [ "$DOCS_STATUS" = "404" ]; then
    if [ "$DOCS_STATUS" = "404" ]; then
        echo -e "${YELLOW}⚠️  SKIPPED (disabled in production)${NC}"
    else
        echo -e "${GREEN}✅ PASS${NC}"
    fi
else
    echo -e "${RED}❌ FAIL (Status: $DOCS_STATUS)${NC}"
fi

# Test 3: Frontend Accessibility
echo -n "3️⃣  Testing frontend... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL (Status: $FRONTEND_STATUS)${NC}"
fi

# Test 4: CORS Check
echo -n "4️⃣  Testing CORS... "
CORS_TEST=$(curl -s -H "Origin: ${FRONTEND_URL}" -H "Access-Control-Request-Method: GET" -X OPTIONS "${BACKEND_URL}/api/v1/health" -i | grep -i "access-control-allow-origin")
if [ ! -z "$CORS_TEST" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL - CORS not configured${NC}"
    echo -e "${YELLOW}   Fix: Update CORS_ORIGIN in Render to: ${FRONTEND_URL}${NC}"
fi

echo ""
echo "===================================="
echo "📊 Summary:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo ""
echo "Next Steps:"
echo "1. Visit $FRONTEND_URL"
echo "2. Try logging in"
echo "3. Check browser console for errors"
echo ""
echo "Need help? Check DEPLOYMENT_GUIDE.md"
