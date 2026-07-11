@echo off
chcp 65001 > nul
if not exist node_modules (
  echo 正在安装依赖……
  call npm install
)
call npm run dev
pause
