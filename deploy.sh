#!/bin/bash

# Navigate to project directory
cd /Users/ngoctmn/Documents/development/inventory-qr-app

# Add all changes
git add .

# Commit with message
git commit -m "Fix QR scanner - improve sensitivity like banking apps"

# Push to remote
git push

echo "✅ Deployment complete! Check Vercel for build status."
