這是一份根據您提供的內容重新排版、加入 Markdown 結構標籤並優化可讀性的乾淨版本。這份文件完整保留了所有技術細節、代碼規範與邏輯說明。

---

# 🍻 迷霧酒館 (Misty Tavern) 開發者手冊

這是一款基於 Web 的高複雜度骰子策略對戰遊戲，支援單機 PvE 與 Firebase 聯網 PvP。採用「數據、邏輯、視圖」分離的模組化架構，以維護具備大量被動連鎖（Chain Effects）的對戰系統。

---

## 🧱 技術棧

* **前端**：原生 HTML / CSS / JavaScript（無框架）
* **資料庫**：Firebase Realtime Database（帳號、房間、對戰同步）
* **認證**：Firebase Authentication（匿名 + Google 登入）
* **樣式**：自訂 CSS 變數（style.css）、響應式設計（手機優先）
* **圖示**：純文字表情符號（⚔️🛡️🎲⋯）

---

## 🏗️ 核心架構

### 1. 數據層（game-state.js）

`window.gs` 為全域戰鬥狀態物件，核心欄位如下：

| 類別 | 欄位 | 說明 |
| --- | --- | --- |
| **模式** | `isSinglePlayer`, `isPvE` | 判斷當前對戰類型 |
| **血量** | `hp`, `dummyHp`, `maxHp`, `enemyMaxHp` | 雙方血量與上限 |
| **行動卡** | `pts`, `face`, `enemyPts`, `enemyFace` | 雙方能量與卡面（A=目標8點 / B=目標24點） |
| **計數器** | `flipCount`, `enemyFlipCount`, `statAtk`, `statHeal`, `statTurn` | 翻轉、攻擊、回血、回合數 |
| **骰子** | `dice`, `bonusDice`, `enemyBonusDice` | 骰子陣列與下回合額外骰數 |
| **配件** | `loadout`, `enemyLoadout`, `usedAccs`, `enemyUsedAccs`, `playerStored`, `enemyStored` | 裝備清單、冷卻清單、儲能帳本 |
| **特殊** | `medalRounds`, `enemyMedalRounds` | 獎章收集輪數 |
| **狀態** | `phase`, `rolled`, `isAIThinking`, `isGameOver` | 當前回合階段 |
| **聯網** | `currentTurnPlayer`, `lastProcessedActionId`, `diceActionId` | 回合歸屬與動作去重 |
| **命運** | `playerNextDie`, `enemyNextDie` | 命運干擾指定的下一顆骰子點數 |
| **復活** | `playerPhoenixUsed`, `enemyPhoenixUsed` | 不死鳥羽毛是否已使用 |
| **命名** | `myName`, `enemyName` | 戰鬥畫面顯示名稱 |

* `createBattleState(config)`：負責初始化 `gs`，建立儲能帳本並設定模式標記。

### 2. 原子邏輯層（battle-fx.js）

`window.FX` 包含所有改變 `gs` 數值的原子動作。執行後必須呼叫 `FX.notify()` 觸發更新。

| 函式 | 說明 |
| --- | --- |
| `FX.addPts(gs, who, n, label)` | 增加行動卡點數，顯示浮動數字 |
| `FX.stealPts(gs, who, n, label)` | 偷取對手點數（who 為獲益方），受害者端發起廣播 |
| `FX.clearPts(gs, who, label)` | 清空指定方的行動卡點數 |
| `FX.fillCard(gs, who)` | 直接填滿行動卡至上限 |
| `FX.damage(gs, target, n, label)` | 造成傷害，觸發 `playerTakeDamage` 並檢查不死鳥 |
| `FX.heal(gs, who, n, label)` | 恢復血量（受上限限制） |
| `FX.addDice(gs, who, n)` | 增加下回合骰子數 |
| `FX.rerollDie(gs, idx)` | 重骰指定骰子，觸發 `playerDieRolled` |
| `FX.splitDie(gs, targetDice, idx, who)` | 將一顆偶數骰子分裂為兩顆 |
| `FX.flipCard(gs, who)` | 翻面行動卡並遞增翻轉計數 |
| `FX.setFate(gs, targetWho, val)` | 設定對手下回合第一顆骰子點數 |

> **同步規範**：`FX.damage` 與 `FX.stealPts` 採用受害者權威模式。`victim` 使用 `window.myRole`（'host'/'guest'）而非 'player'/'enemy' 避免語意相反。

### 3. 配件配置層（accessories-config.js）

定義所有配件的靜態屬性與回呼。

* **主動配件 `trigger` 模式**：
* **固定配方**：`{ type: 'consume', faces: [1, 6] }`（如魔劍）。
* **單顆模式**：`{ type: 'consume', faces: [...], count: 1 }`（如鬧鐘、分裂符文）。
* **check 欄位**：額外的條件函式，如檢查是否已使用過該配件。


* **被動事件 `on` 監聽**：
* 包含 `playerTurnStart`, `playerDieRolled`, `playerFlip`, `playerUseCard`, `playerTakeDamage`, `playerDeath` 等。



### 4. 遊戲中樞（game-controller.js）

* **GameController**：中樞廣播塔，負責 `dispatchUpdate()` 與 `checkWin()`。
* **勝利檢查順序**：1. 不死鳥攔截 -> 2. 血量歸零 -> 3. 榮譽獎章 -> 4. 無限翻轉。


* **BattleCommander**：接收對手發來的聯網動作（`useDieOnCard`, `useDieOnAcc`, `useCard`, `steal`, `revive` 等）。

---

## 🔄 核心同步機制：權威事件流

聯網對戰採用**「受害者/受益者權威廣播」**模式：

1. **傷害與連鎖**：`FX.damage()` 雙端執行，但被動觸發（如反甲、不死鳥）只在 `isLocalTarget(target)` 為 true 的電腦上執行。
2. **能量守恆**：`steal` 廣播增量（amount）而非絕對值，避免覆蓋本地操作。
3. **快照同步**：回合結束時廣播 `finalPts` 與 `snapshot` 巢狀物件，供斷線重連還原。
4. **去重機制**：使用 `actionId` 與 `diceActionId` 避免 Firebase 重複觸發動作。

---

## 🌐 聯網房間與帳號管理

### 斷線處理與超時

* **心跳機制**：每 15 秒更新存活時間。
* **斷線判定**：`onDisconnect()` 標記離線；房主斷線則房間變為 `abandoned`。
* **重連恢復**：`attemptReconnect()` 從快照（snapshot）還原數值。
* **回合超時**：單回合計時 90 秒，超時兩次自動判負。

### 🛒 商店、抽獎與保護

* **抽獎機率**：1⭐(40%)、2⭐(30%)、3⭐(17%)、4⭐(10%)、5⭐(3%)。
* **重複補償**：轉化為造型碎片（2~10 片不等）。
* **多裝置保護**：登入後確認 `connectionId`，防止同帳號多處登入。

---

## ⚙️ 開發規範

1. **修改數據**：數值類欄位（hp, pts 等）**必須**呼叫 FX 函式；純統計欄位可直接修改 `gs`。
2. **非同步安全**：在 `setTimeout` 中務必檢查 `gameInstanceId` 是否改變。
3. **配件冷卻**：若配件需要每回合限一次，必須手動將 ID 加入 `index.html` 的 `perTurnAccs` 陣列。

---

**📝 結語**：請遵循模組化規範開發新功能，維持數據與視圖的純粹分離。拿起骰子，在迷霧酒館贏得榮耀！ 🍻🎲