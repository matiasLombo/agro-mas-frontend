#!/bin/bash

# Deploy Frontend Script for Agro Mas
# This script builds and deploys the Angular frontend to Firebase

set -e

# Default environment
ENVIRONMENT="${1:-develop}"

# Load configuration
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

# Extract values from config
GCP_PROJECT_ID=$(jq -r ".environments.$ENVIRONMENT.project.id" $CONFIG_FILE)
REGION=$(jq -r ".environments.$ENVIRONMENT.project.region" $CONFIG_FILE)
BACKEND_NAME=$(jq -r ".environments.$ENVIRONMENT.backend.name" $CONFIG_FILE)
FIREBASE_PROJECT=$(jq -r ".environments.$ENVIRONMENT.frontend.projectId" $CONFIG_FILE)

echo "🚀 Starting frontend deployment for environment: $ENVIRONMENT"
echo "📋 Firebase Project: $FIREBASE_PROJECT"

# Get backend URL
echo "🔍 Getting backend URL..."
BACKEND_URL=$(gcloud run services describe $BACKEND_NAME --region=$REGION --format="value(status.url)" --project=$GCP_PROJECT_ID)

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Could not get backend URL. Make sure backend is deployed first."
    exit 1
fi

echo "📋 Frontend deployment configuration:"
echo "  🔥 Firebase Project: $FIREBASE_PROJECT"
echo "  🔗 Backend URL: $BACKEND_URL"

# Update environment configuration
echo "⚙️ Updating environment configuration..."
cd agro-mas-frontend

# Set build configuration based on environment
BUILD_CONFIG="production"
if [ "$ENVIRONMENT" == "develop" ]; then
    BUILD_CONFIG="development"
fi

# Update environment.prod.ts with the actual backend URL
cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: $([ "$ENVIRONMENT" == "production" ] && echo "true" || echo "false"),
  apiUrl: '$BACKEND_URL/api/v1',
  firebaseConfig: {
    apiKey: 'your-firebase-api-key',
    authDomain: '$FIREBASE_PROJECT.firebaseapp.com',
    projectId: '$FIREBASE_PROJECT',
    storageBucket: '$FIREBASE_PROJECT.appspot.com',
    messagingSenderId: '123456789',
    appId: 'your-firebase-app-id'
  }
};
EOF

# Update environment.ts for development
if [ "$ENVIRONMENT" == "develop" ]; then
    cat > src/environments/environment.ts << EOF
export const environment = {
  production: false,
  apiUrl: '$BACKEND_URL/api/v1',
  firebaseConfig: {
    apiKey: 'your-firebase-api-key',
    authDomain: '$FIREBASE_PROJECT.firebaseapp.com',
    projectId: '$FIREBASE_PROJECT',
    storageBucket: '$FIREBASE_PROJECT.appspot.com',
    messagingSenderId: '123456789',
    appId: 'your-firebase-app-id'
  }
};
EOF
fi

echo "✅ Environment configuration updated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --silent

# Build for the appropriate environment
echo "🔨 Building frontend for $ENVIRONMENT..."
if [ "$ENVIRONMENT" == "production" ]; then
    npm run build:prod
else
    npm run build
fi

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase use $FIREBASE_PROJECT --quiet
firebase deploy --only hosting --quiet

FRONTEND_URL="https://$FIREBASE_PROJECT.web.app"

echo "✅ Frontend deployment completed successfully!"
echo ""
echo "📋 Frontend Summary for $ENVIRONMENT:"
echo "  🌐 URL: $FRONTEND_URL"
echo "  🔗 API URL: $BACKEND_URL/api/v1"
echo "  ⚙️ Build Config: $BUILD_CONFIG"
echo ""

# Test frontend
echo "🧪 Testing frontend..."
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend accessibility test passed"
else
    echo "⚠️ Frontend accessibility test failed"
fi

cd ..