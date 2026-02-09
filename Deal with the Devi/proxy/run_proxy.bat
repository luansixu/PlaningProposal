@echo off
setlocal

REM 运行前请先设置环境变量（只在本机生效）：
REM   set GEMINI_API_KEY=你的key
REM 或者在当前窗口临时设置：
REM   set GEMINI_API_KEY=AIza...

echo [proxy] GEMINI_API_KEY=%GEMINI_API_KEY%
if "%GEMINI_API_KEY%"=="" (
  echo [proxy] ERROR: GEMINI_API_KEY is empty.
  echo [proxy] Please run:  set GEMINI_API_KEY=YOUR_KEY
  pause
  exit /b 1
)

cd /d "%~dp0"
python proxy.py

