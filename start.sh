#!/bin/bash
# Nami Network Monitor - 一鍵啟動腳本

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "🐳 Nami Network Monitor v2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

# 檢查是否在正確目錄
if [ ! -f "package.json" ]; then
    echo -e "${RED}請在專案根目錄執行此腳本${NC}"
    exit 1
fi

# 殺掉可能正在運行的舊程序
echo -e "${YELLOW}正在停止舊的服務...${NC}"
pkill -f "bun run.*apps/server" 2>/dev/null
pkill -f "bun run.*apps/web" 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# 詢問是否使用 sudo
echo ""
echo -e "${CYAN}選擇啟動模式:${NC}"
echo "  1) 普通模式 - 只能看到你的程序"
echo "  2) Root 模式 - 可以看到所有系統程序 (需要密碼)"
echo ""
read -p "請選擇 [1/2] (預設 1): " choice

case $choice in
    2)
        echo -e "${YELLOW}以 root 模式啟動...${NC}"
        echo ""
        # 用 sudo 啟動 server，普通模式啟動 web
        sudo bun run dev:server &
        SERVER_PID=$!
        sleep 2
        bun run dev:web &
        WEB_PID=$!
        ;;
    *)
        echo -e "${GREEN}以普通模式啟動...${NC}"
        echo ""
        bun run dev
        ;;
esac

echo ""
echo -e "${GREEN}✅ 服務已啟動${NC}"
echo -e "   🌐 打開: ${CYAN}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止所有服務${NC}"

# 等待終止信號
wait
