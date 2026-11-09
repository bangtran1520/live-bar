#!/bin/bash
cd "$(dirname "$0")" || exit 1
echo ""
echo "  SÀN NHẢY — cầu nối quà TikTok LIVE"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  Chưa cài Node.js. Vào https://nodejs.org tải bản LTS, cài xong rồi chạy lại file này."
  read -r -p "  Nhấn Enter để đóng..." _
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Lần đầu chạy — đang cài thư viện, chờ khoảng 30 giây..."
  npm install --no-audit --no-fund || { echo "  Cài thư viện thất bại, kiểm tra mạng rồi thử lại."; read -r -p "  Nhấn Enter..."; exit 1; }
fi

node server.js
echo ""
read -r -p "  Cầu nối đã dừng. Nhấn Enter để đóng..." _
