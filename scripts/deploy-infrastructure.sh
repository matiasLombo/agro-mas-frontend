#!/bin/bash

# Deploy Infrastructure Script for Agro Mas
# This script creates all the necessary Google Cloud infrastructure

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
DB_INSTANCE=$(jq -r ".environments.$ENVIRONMENT.database.instance" $CONFIG_FILE)
DB_NAME=$(jq -r ".environments.$ENVIRONMENT.database.name" $CONFIG_FILE)
DB_USER=$(jq -r ".environments.$ENVIRONMENT.database.user" $CONFIG_FILE)
DB_VERSION=$(jq -r ".environments.$ENVIRONMENT.database.version" $CONFIG_FILE)
DB_TIER=$(jq -r ".environments.$ENVIRONMENT.database.tier" $CONFIG_FILE)
DB_DISK_SIZE=$(jq -r ".environments.$ENVIRONMENT.database.diskSize" $CONFIG_FILE)
STORAGE_BUCKET=$(jq -r ".environments.$ENVIRONMENT.storage.bucket" $CONFIG_FILE)
JWT_SECRET_NAME=$(jq -r ".environments.$ENVIRONMENT.secrets.jwt" $CONFIG_FILE)
DB_PASSWORD_SECRET_NAME=$(jq -r ".environments.$ENVIRONMENT.secrets.dbPassword" $CONFIG_FILE)

echo "🚀 Starting infrastructure deployment for environment: $ENVIRONMENT"
echo "📋 Project: $PROJECT_ID"

# Set project
echo "📋 Setting Google Cloud project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    storage.googleapis.com \
    --quiet

# Create Cloud SQL instance
echo "🗄️ Creating Cloud SQL instance..."
if ! gcloud sql instances describe $DB_INSTANCE --quiet > /dev/null 2>&1; then
    gcloud sql instances create $DB_INSTANCE \
        --database-version=$DB_VERSION \
        --tier=$DB_TIER \
        --region=$REGION \
        --storage-size=$DB_DISK_SIZE \
        --storage-type=SSD \
        --backup \
        --backup-location=$REGION \
        --authorized-networks=0.0.0.0/0 \
        --quiet
    
    echo "⏳ Waiting for Cloud SQL instance to be ready..."
    while [[ "$(gcloud sql instances describe $DB_INSTANCE --format='value(state)')" != "RUNNABLE" ]]; do
        echo "  Still creating database instance..."
        sleep 10
    done
    echo "✅ Cloud SQL instance ready"
else
    echo "ℹ️ Cloud SQL instance already exists"
fi

# Create database
echo "📊 Creating database..."
if ! gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE --quiet > /dev/null 2>&1; then
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE --quiet
    echo "✅ Database created"
else
    echo "ℹ️ Database already exists"
fi

# Create database user
echo "👤 Creating database user..."
if ! gcloud sql users describe $DB_USER --instance=$DB_INSTANCE --quiet > /dev/null 2>&1; then
    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE \
        --password="$DB_PASSWORD" \
        --quiet
    echo "✅ Database user created"
    
    # Store password in Secret Manager
    echo "🔐 Storing database password in Secret Manager..."
    echo -n "$DB_PASSWORD" | gcloud secrets create $DB_PASSWORD_SECRET_NAME --data-file=- --quiet || \
    echo -n "$DB_PASSWORD" | gcloud secrets versions add $DB_PASSWORD_SECRET_NAME --data-file=- --quiet
    echo "✅ Database password stored in Secret Manager"
else
    echo "ℹ️ Database user already exists"
fi

# Create JWT secret
echo "🔑 Creating JWT secret..."
if ! gcloud secrets describe $JWT_SECRET_NAME --quiet > /dev/null 2>&1; then
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    echo -n "$JWT_SECRET" | gcloud secrets create $JWT_SECRET_NAME --data-file=- --quiet
    echo "✅ JWT secret created"
else
    echo "ℹ️ JWT secret already exists"
fi

# Create storage bucket
echo "📦 Creating storage bucket..."
if ! gsutil ls gs://$STORAGE_BUCKET > /dev/null 2>&1; then
    gcloud storage buckets create gs://$STORAGE_BUCKET --location=$REGION --quiet
    echo "✅ Storage bucket created"
else
    echo "ℹ️ Storage bucket already exists"
fi

# Grant permissions to compute service account
echo "🔒 Setting up IAM permissions..."
COMPUTE_SA="${PROJECT_ID//[^0-9]/}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet

echo "✅ Infrastructure deployment completed successfully!"
echo ""
echo "📋 Infrastructure Summary for $ENVIRONMENT:"
echo "  🗄️ Database: $DB_INSTANCE"
echo "  📊 Database Name: $DB_NAME"
echo "  👤 Database User: $DB_USER"
echo "  🔐 Secrets: $JWT_SECRET_NAME, $DB_PASSWORD_SECRET_NAME"
echo "  📦 Storage: gs://$STORAGE_BUCKET"
echo ""