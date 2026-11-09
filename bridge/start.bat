@echo off
chcp 65001 >nul
cd /d "%~dp0"
title San Nhay - cau noi qua TikTok

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Chua cai Node.js.
  echo   Vao https://nodejs.org , tai ban LTS, cai xong roi chay lai file nay.
  echo.
  pause
  exit /b
)

if not exist node_modules (
  echo.
  echo   Lan dau chay - dang cai thu vien, cho khoang 30 giay...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   Cai thu vien that bai. Kiem tra ket noi mang roi thu lai.
    pause
    exit /b
  )
)

node server.js
echo.
echo   Cau noi da dung. Nhan phim bat ky de dong cua so.
pause >nul
