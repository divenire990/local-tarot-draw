@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo 正在启动本地塔罗抽牌器...
echo 几秒后将自动打开 http://localhost:3000
echo 关闭此窗口即可停止服务。
echo.

start "TarotAppServer" cmd /k "cd /d %~dp0 && chcp 65001 >nul && npm run dev"
timeout /t 4 /nobreak >nul
start "" http://localhost:3000
