@echo off
title Study Fly - Notes Upload Tool
echo ========================================
echo   Study Fly - Notes Upload Tool
echo ========================================
echo.
python "%~dp0upload_notes.py"
if errorlevel 1 (
    echo.
    echo [ERROR] Python script failed. Make sure Python is installed.
    pause
)
