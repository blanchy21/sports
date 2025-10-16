#!/bin/bash

# Sports Development Server Startup Script
# Ensures the site always runs on localhost:3000

echo "🏈 Starting Sportsblock Development Server..."
echo "📋 Ensuring port 3000 is available..."

# Kill any processes using port 3000
echo "🔄 Checking for existing processes on port 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is in use. Killing existing processes..."
    lsof -ti:3000 | xargs kill -9
    echo "✅ Port 3000 is now free"
else
    echo "✅ Port 3000 is available"
fi

# Kill any processes using port 3001 (fallback port)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔄 Cleaning up port 3001..."
    lsof -ti:3001 | xargs kill -9
fi

# Start the development server on port 3000
echo "🚀 Starting development server on localhost:3000..."
PORT=3000 npm run dev
