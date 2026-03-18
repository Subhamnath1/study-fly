@echo off
title Study Fly - DPP Upload Tool
echo ========================================
echo   Study Fly - DPP Upload Tool
echo ========================================
echo.
python "%~dp0upload_dpp.py"
if errorlevel 1 (
    echo.
    echo [ERROR] Python script failed. Make sure Python is installed.
    pause
)
