#!/bin/bash
# MathUp Mobile - Setup Script for macOS/Linux

echo ""
echo "========================================"
echo "   MathUp Mobile - Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please download and install Node.js from:"
    echo "https://nodejs.org/ (LTS version recommended)"
    echo ""
    exit 1
fi

echo "✅ Node.js detected:"
node --version

echo ""
echo "[1/3] Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

echo ""
echo "[2/3] Checking .env file..."
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your Supabase credentials"
    echo "Press Enter to continue..."
    read
else
    echo "✅ .env file exists"
fi

echo ""
echo "[3/3] Starting development server..."
echo ""
echo "========================================"
echo "   Ready to start!"
echo "   "
echo "   Press 'i' for iOS simulator"
echo "   Press 'a' for Android emulator"
echo "   Scan QR code for Expo Go"
echo "========================================"
echo ""

npm start
