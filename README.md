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


🛡️ 函式宣告 (function)
函式名稱	簡要用途
loginToTavern	匿名登入
loginAsGuest	訪客登入
loginAsAdventurer	冒險者登入（預留）
continueJourney	登入後進入酒館
loadUserAccount	載入玩家雲端資料
performFiveUniqueGacha	新玩家五連抽
saveAccountToCloud	儲存玩家資料
setupPresence	設定房間在線狀態
syncAccountUI	同步顯示金幣/等級/名稱
createFilterUI	建立篩選器介面
setFilter	設定篩選條件
switchTab	切換分頁（背包/商店/戰鬥）
isOnlineMode	判斷是否為聯網對戰
syncOnlineAction	發送聯網動作
syncBattle	同步戰鬥資料
syncBattleAction	同步戰鬥動作
triggerEvent	觸發配件事件
clearAllLedgers	清空配件儲能（回合結束）
canUseAccessory	檢查能否使用配件
useAccessory	使用配件效果
checkStoredReady	檢查配件儲能是否完成
goTo	切換畫面
pauseAnimations	暫停背景動畫
resumeAnimations	恢復背景動畫
renderPrep	渲染準備畫面
renderSlots	渲染裝備槽
renderLibrary	渲染配件背包
renderShop	渲染商店
gachaPull	抽獎系統
showTavernMsg	顯示酒館提示訊息
showConfirmDialog	顯示確認對話框
buyItem	購買配件
addAcc	加入配件到裝備
removeAcc	移除裝備配件
syncLoadoutToCloud	同步裝備至雲端
updateBattleBtn	更新戰鬥按鈕狀態
startBattle	開始練習模式（舊版）
startPvELobby	進入練習模式大廳
startPvEBattle	開始練習模式戰鬥
renderBattle	渲染戰鬥畫面
renderHP	渲染血量
renderCard	渲染行動卡
renderAccBar	渲染配件欄
createAccChip	建立配件晶片
updateMedalDisplay	更新榮譽獎章顯示
renderEnemyAccIcons	渲染對手配件圖示
renderDice	渲染骰子
renderPhase	渲染回合階段
renderStats	渲染統計數據
updateCtrl	更新控制按鈕狀態
startTurnTimer	啟動回合倒數計時
clearTurnTimer	清除回合計時器
doRoll	執行擲骰
useDieOnCard	將骰子放入行動卡
useDieOnAcc	將骰子放入配件
useCard	使用行動卡（攻擊/治療）
checkWin	檢查勝利條件
doEndTurn	結束回合
endBattle	結束戰鬥並結算
prepareNewGame	準備下一局（清空戰場）
setupDrag	設定拖曳事件
setDropHighlights	設定拖曳目標高亮
clearDropHighlights	清除高亮
getTarget	取得拖曳目標
floatAt	顯示浮動文字
log	戰鬥紀錄
showTip	顯示配件說明
closeTip	關閉配件說明
sleep	暫停（毫秒）
showRules	顯示規則
closeRules	關閉規則
joinOnlineRoom	加入/建立房間
checkLoadoutAndQuickMatch	檢查並開始快速配對
quickMatch	快速配對流程
createQuickMatchWaitingRoom	建立快速配對等待房
cancelMatching	取消配對
findAvailableRoom	尋找可用的配對房間
createQuickMatchRoom	建立快速配對房間（舊）
enterLobby	進入戰前準備室
renderLobbyAccs	渲染大廳配件選擇區
selectLobbyAcc	選擇大廳配件
renderLobbySlots	渲染大廳裝備槽
toggleReady	切換準備狀態
updateLobbyUI	更新大廳介面
resumeBattle	恢復中斷的戰鬥
startOnlineBattle	開始聯網戰鬥
listenToBattleActions	監聽戰鬥動作
globalOff	清除所有監聽器
cleanupRoom	清理房間資源
quitRoom	離開房間
quitBattle	投降並離開戰鬥
exitBattleAndGoToPrep	結算後返回準備畫面
lockControlsIfNotMyTurn	若非當前回合則鎖定控制
showRenamePopup	顯示改名彈窗
closeRenamePopup	關閉改名彈窗
confirmRename	確認改名
📦 常數宣告 (const)
常數名稱	簡要用途
firebaseConfig	Firebase 設定
db	Firebase Realtime Database 實例
BattleCommander	戰鬥指令處理中心
auth	Firebase Auth 實例
ROOM_TIMEOUT	房間超時時間 (30秒)
TRIGGER	配件觸發條件檢查工具
ghost	拖曳鬼影元素
⚡ 非同步函式 (async function)
函式名稱	簡要用途
doEnemyTurn	AI 對手回合流程（非同步）
