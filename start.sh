#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting build process..."

# 1. Build the React frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Install Python dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# 3. Start the FastAPI server
echo "Starting FastAPI server..."
python main.py
