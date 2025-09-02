#!/bin/bash

# Full Deployment Script for Agro Mas
# This script orchestrates the complete deployment process

set -e

# Default environment
ENVIRONMENT="${1:-develop}"

echo "🌾 Agro Mas - Full Deployment Script"
echo "===================================="
echo "🎯 Environment: $ENVIRONMENT"
echo ""

# Check dependencies
echo "🔧 Checking dependencies..."
REQUIRED_TOOLS=("gcloud" "docker" "npm" "firebase" "jq")
for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v $tool &> /dev/null; then
        echo "❌ Required tool '$tool' is not installed"
        exit 1
    fi
done
echo "✅ All required tools are available"
echo ""

# Load configuration early to validate environment
CONFIG_FILE="deploy.config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file $CONFIG_FILE not found"
    exit 1
fi

# Validate environment
if ! jq -e ".environments.$ENVIRONMENT" "$CONFIG_FILE" > /dev/null; then
    echo "❌ Environment '$ENVIRONMENT' not found in configuration"
    echo "Available environments: $(jq -r '.environments | keys | join(", ")' $CONFIG_FILE)"
    exit 1
fi

# Verify authentication
echo "🔐 Verifying authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 > /dev/null; then
    echo "❌ Not authenticated with Google Cloud. Run: gcloud auth login"
    exit 1
fi

if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ Not authenticated with Firebase. Run: firebase login"
    exit 1
fi
echo "✅ Authentication verified"
echo ""

# Make scripts executable
chmod +x scripts/*.sh

# Deploy infrastructure
echo "1️⃣ DEPLOYING INFRASTRUCTURE ($ENVIRONMENT)"
echo "=========================================="
./scripts/deploy-infrastructure.sh $ENVIRONMENT
echo ""

# Deploy backend
echo "2️⃣ DEPLOYING BACKEND ($ENVIRONMENT)"
echo "================================="
./scripts/deploy-backend.sh $ENVIRONMENT
echo ""

# Deploy frontend
echo "3️⃣ DEPLOYING FRONTEND ($ENVIRONMENT)"
echo "==================================="
./scripts/deploy-frontend.sh $ENVIRONMENT
echo ""

echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "====================================="
echo ""

# Load config for final summary
GCP_PROJECT_ID=$(jq -r ".environments.$ENVIRONMENT.project.id" $CONFIG_FILE)
REGION=$(jq -r ".environments.$ENVIRONMENT.project.region" $CONFIG_FILE)
BACKEND_NAME=$(jq -r ".environments.$ENVIRONMENT.backend.name" $CONFIG_FILE)
FIREBASE_PROJECT=$(jq -r ".environments.$ENVIRONMENT.frontend.projectId" $CONFIG_FILE)

BACKEND_URL=$(gcloud run services describe $BACKEND_NAME --region=$REGION --format="value(status.url)" --project=$GCP_PROJECT_ID)
FRONTEND_URL="https://$FIREBASE_PROJECT.web.app"

echo "📋 DEPLOYMENT SUMMARY ($ENVIRONMENT)"
echo "=================================="
echo "🌐 Frontend: $FRONTEND_URL"
echo "🖥️ Backend:  $BACKEND_URL"
echo "🔍 Health:   $BACKEND_URL/health"
echo "📡 API:      $BACKEND_URL/api/v1"
echo ""
echo "🧪 INTEGRATION TEST"
echo "=================="

# Test backend health
if curl -f -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend health check: PASSED"
else
    echo "❌ Backend health check: FAILED"
fi

# Test frontend
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend accessibility: PASSED"
else
    echo "❌ Frontend accessibility: FAILED"
fi

# Test CORS integration
if curl -f -s -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Frontend-Backend integration: PASSED"
else
    echo "❌ Frontend-Backend integration: FAILED"
fi

echo ""
echo "🎯 Deployment completed! Visit: $FRONTEND_URL"
echo ""
echo "💡 Usage examples:"
echo "   Deploy to develop:   ./scripts/deploy-full.sh develop"
echo "   Deploy to production: ./scripts/deploy-full.sh production"