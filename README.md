# Run and deploy your MCP Maps and MongoDB application

This project is designed to provide an interactive mapping experience using Google Maps and MongoDB. It leverages AI capabilities to answer geo-queries and display results on maps.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key.
3. Run the app:
   `npm run dev`

## Docker Instructions

To build and run the application using Docker:

1. Build the Docker image:
   `docker build -t mcp-maps-mongodb .`
2. Run the Docker container:
   `docker run -p 3000:3000 mcp-maps-mongodb`

To deploy your app to Google Cloud Run after setting up the local development environment, here are the steps:

## Configure Google Cloud

```bash

# Install Google Cloud SDK if not already installed
# Follow instructions at https://cloud.google.com/sdk/docs/install

# Authenticate with Google Cloud
gcloud auth login

# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Using Google Artifact Registry

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create itaca-app \
  --repository-format=docker \
  --location=us-central1

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and tag image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/itaca-repo/itaca-app:latest .

# Push to registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/itaca-repo/itaca-app:latest

# Deploy from registry
gcloud run deploy itaca-app \
  --image us-central1-docker.pkg.dev/$PROJECT_ID/itaca-repo/itaca-app:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=your-gemini-api-key-here" \
  --memory=512Mi \
  --cpu=1
```

## Optional - Secure Environment Variables (Recommended)

Instead of passing the API key directly, use Google Secret Manager:

```bash
# Create secret
echo -n "your-gemini-api-key-here" | gcloud secrets create gemini-api-key --data-file=-

# Deploy with secret
gcloud run deploy itaca-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --memory=512Mi \
  --cpu=1
```