#!/bin/bash

# Deploy Backend Script for Agro Mas
# This script builds and deploys the Go backend to Cloud Run

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
PROJECT_ID=$(jq -r ".environments.$ENVIRONMENT.project.id" $CONFIG_FILE)
REGION=$(jq -r ".environments.$ENVIRONMENT.project.region" $CONFIG_FILE)
BACKEND_NAME=$(jq -r ".environments.$ENVIRONMENT.backend.name" $CONFIG_FILE)
BACKEND_IMAGE=$(jq -r ".environments.$ENVIRONMENT.backend.image" $CONFIG_FILE)
BACKEND_PORT=$(jq -r ".environments.$ENVIRONMENT.backend.port" $CONFIG_FILE)
BACKEND_MEMORY=$(jq -r ".environments.$ENVIRONMENT.backend.memory" $CONFIG_FILE)
BACKEND_CPU=$(jq -r ".environments.$ENVIRONMENT.backend.cpu" $CONFIG_FILE)
MIN_INSTANCES=$(jq -r ".environments.$ENVIRONMENT.backend.minInstances" $CONFIG_FILE)
MAX_INSTANCES=$(jq -r ".environments.$ENVIRONMENT.backend.maxInstances" $CONFIG_FILE)
DB_INSTANCE=$(jq -r ".environments.$ENVIRONMENT.database.instance" $CONFIG_FILE)
DB_NAME=$(jq -r ".environments.$ENVIRONMENT.database.name" $CONFIG_FILE)
DB_USER=$(jq -r ".environments.$ENVIRONMENT.database.user" $CONFIG_FILE)
JWT_SECRET_NAME=$(jq -r ".environments.$ENVIRONMENT.secrets.jwt" $CONFIG_FILE)
DB_PASSWORD_SECRET_NAME=$(jq -r ".environments.$ENVIRONMENT.secrets.dbPassword" $CONFIG_FILE)

echo "🚀 Starting backend deployment for environment: $ENVIRONMENT"
echo "📋 Project: $PROJECT_ID"

# Set project
gcloud config set project $PROJECT_ID

# Get database IP
echo "🔍 Getting database connection info..."
DB_IP=$(gcloud sql instances describe $DB_INSTANCE --format="value(ipAddresses[0].ipAddress)")
DB_CONNECTION_NAME="$PROJECT_ID:$REGION:$DB_INSTANCE"

# Set environment mode based on deployment environment
ENV_MODE="release"
if [ "$ENVIRONMENT" == "develop" ]; then
    ENV_MODE="debug"
fi

echo "📋 Backend deployment configuration:"
echo "  🖥️ Service: $BACKEND_NAME"
echo "  🐳 Image: $BACKEND_IMAGE"
echo "  🗄️ Database IP: $DB_IP"
echo "  🔗 Connection: $DB_CONNECTION_NAME"
echo "  ⚙️ Mode: $ENV_MODE"

# Build and push Docker image
echo "🐳 Building Docker image..."
cd agro-mas-backend
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
IMAGE_TAG="$BACKEND_IMAGE:$COMMIT_SHA"

docker build -t $IMAGE_TAG -f Dockerfile .
docker tag $IMAGE_TAG $BACKEND_IMAGE:latest

echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_TAG
docker push $BACKEND_IMAGE:latest

# Run migrations
echo "🔄 Running database migrations..."
# Create temporary migration job
MIGRATION_JOB_NAME="agro-mas-migrate-$ENVIRONMENT"
gcloud run jobs create $MIGRATION_JOB_NAME \
    --image=$IMAGE_TAG \
    --region=$REGION \
    --set-env-vars="ENVIRONMENT=$ENVIRONMENT,GIN_MODE=$ENV_MODE,DB_HOST=$DB_IP,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,DB_SSL_MODE=disable" \
    --set-secrets="DB_PASSWORD=$DB_PASSWORD_SECRET_NAME:latest" \
    --command="./main" \
    --args="migrate" \
    --max-retries=1 \
    --task-timeout=300 \
    --parallelism=1 \
    --replace \
    --quiet || true

# Execute migration
gcloud run jobs execute $MIGRATION_JOB_NAME --region=$REGION --wait --quiet || echo "⚠️ Migration job may have failed - continuing with deployment"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $BACKEND_NAME \
    --image=$IMAGE_TAG \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --port=$BACKEND_PORT \
    --memory=$BACKEND_MEMORY \
    --cpu=$BACKEND_CPU \
    --min-instances=$MIN_INSTANCES \
    --max-instances=$MAX_INSTANCES \
    --set-env-vars="ENVIRONMENT=$ENVIRONMENT,GIN_MODE=$ENV_MODE,DB_HOST=$DB_IP,DB_PORT=5432,DB_NAME=$DB_NAME,DB_USER=$DB_USER,DB_SSL_MODE=disable" \
    --set-secrets="JWT_SECRET=$JWT_SECRET_NAME:latest,DB_PASSWORD=$DB_PASSWORD_SECRET_NAME:latest" \
    --quiet

# Get service URL
BACKEND_URL=$(gcloud run services describe $BACKEND_NAME --region=$REGION --format="value(status.url)")

echo "✅ Backend deployment completed successfully!"
echo ""
echo "📋 Backend Summary for $ENVIRONMENT:"
echo "  🌐 URL: $BACKEND_URL"
echo "  🔍 Health: $BACKEND_URL/health"
echo "  📡 API: $BACKEND_URL/api/v1"
echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -f -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend health check passed"
else
    echo "⚠️ Backend health check failed - please check logs"
fi

cd ..