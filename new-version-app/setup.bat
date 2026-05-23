@echo off
REM MathUp Mobile - Setup Script for Windows
REM This script automates the setup process

echo.
echo ========================================
echo    MathUp Mobile - Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/ (LTS version recommended)
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js detected: 
node --version

echo.
echo [1/3] Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed

echo.
echo [2/3] Checking .env file...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo ⚠️  Please edit .env with your Supabase credentials
    pause
) else (
    echo ✅ .env file exists
)

echo.
echo [3/3] Starting development server...
echo.
echo ========================================
echo    Ready to start!
echo    
echo    Press 'i' for iOS simulator
echo    Press 'a' for Android emulator
echo    Scan QR code for Expo Go
echo ========================================
echo.

npm start

pause
