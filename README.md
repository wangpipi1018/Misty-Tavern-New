📄 Misty Tavern 開發者手冊 (README.md)
1. 專案概述
本專案為一個基於網頁的卡牌對戰遊戲《迷霧酒館》。採用模組化結構，將數據、邏輯與配置分離，以維護 5000+ 行的大型專案。

2. 檔案架構與職責
index.html (主入口/UI層)

負責：DOM 結構、Firebase 聯網監聽、所有的 UI 渲染函式（如 renderBattle, floatAt, log）。

注意：所有外部 JS 檔案皆可透過全域呼叫這裡的 UI 函式。

game-state.js (數據層)

核心變數：window.gs

內容：包含玩家與對手的血量 (hp, dummyHp)、點數 (pts, enemyPts)、骰子池 (dice)、裝備清單 (loadout) 等。

battle-fx.js (邏輯層)

核心物件：window.FX

內容：定義了所有變更 gs 的動作。包含 damage, heal, addPts, splitDie, rerollDie 等。

工具：包含全域工具 rand(a, b) 與骰子面常量 FACES。

accessories-config.js (配置層)

核心變數：window.ACCESSORIES

內容：定義所有配件的 ID、名稱與觸發效果（Callback）。

規範：此檔案不應直接修改 gs，必須透過呼叫 window.FX 來執行變更。

3. 核心開發規範 (給 AI 的指令)
修改數據：一律優先檢查 window.FX 是否已有對應函式，禁止直接在其他檔案撰寫重複的扣血或加點邏輯。

變數引用：引用 gs、FX、FACES 時，請確保使用全域名稱，避免重複宣告。

渲染機制：執行完數據修改後，必須呼叫 renderBattle() 或 renderCard() 以確保畫面同步。