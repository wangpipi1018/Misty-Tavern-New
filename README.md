🍻 迷霧酒館 (Misty Tavern) 開發者手冊
這是一款基於 Web 的高複雜度骰子策略對戰遊戲，支援單機 PvE 與 Firebase 聯網 PvP。採用「數據、邏輯、視圖」分離的模組化架構，以維護具備大量被動連鎖（Chain Effects）的對戰系統。

🧱 技術棧

前端：原生 HTML / CSS / JavaScript（無框架）
資料庫：Firebase Realtime Database（帳號、房間、對戰同步）
認證：Firebase Authentication（匿名 + Google 登入）
樣式：自訂 CSS 變數（style.css）、響應式設計（手機優先）
圖示：純文字表情符號（⚔️🛡️🎲⋯）


🏗️ 核心架構
1. 數據層（game-state.js）
window.gs：全域戰鬥狀態物件，包含以下欄位：
類別欄位說明模式isSinglePlayer, isPvE判斷當前對戰類型血量hp, dummyHp, maxHp, enemyMaxHp雙方血量與上限行動卡pts, face, enemyPts, enemyFace雙方能量與卡面（A=目標8點 / B=目標24點）計數器flipCount, enemyFlipCount, statAtk, statHeal, statTurn翻轉、攻擊、回血、回合數骰子dice, bonusDice, enemyBonusDice骰子陣列與下回合額外骰數配件loadout, enemyLoadout, usedAccs, enemyUsedAccs, playerStored, enemyStored裝備清單、冷卻清單、儲能帳本特殊medalRounds, enemyMedalRounds獎章收集輪數狀態phase, rolled, isAIThinking, isGameOver當前回合階段聯網currentTurnPlayer, lastProcessedActionId, diceActionId回合歸屬與動作去重命運playerNextDie, enemyNextDie命運干擾指定的下一顆骰子點數復活playerPhoenixUsed, enemyPhoenixUsed不死鳥羽毛是否已使用命名myName, enemyName戰鬥畫面顯示名稱
createBattleState(config) 負責初始化 gs，建立雙方配件儲能帳本（playerStored / enemyStored），並設定模式標記。
2. 原子邏輯層（battle-fx.js）
window.FX：所有「會改變 gs 數值」的原子動作。每個函式執行後必須呼叫 FX.notify() 觸發畫面更新與廣播。
函式說明FX.addPts(gs, who, n, label)增加行動卡點數，並顯示浮動數字FX.stealPts(gs, who, n, label)偷取對手點數（who 為獲益方）。若為聯網模式，由受害者端發起廣播FX.clearPts(gs, who, label)清空指定方的行動卡點數FX.fillCard(gs, who)直接填滿行動卡至上限FX.damage(gs, target, n, label)造成傷害。執行後觸發 playerTakeDamage 事件，並檢查不死鳥復活FX.heal(gs, who, n, label)恢復血量（受上限限制）FX.addDice(gs, who, n)增加下回合骰子數（寫入 bonusDice / enemyBonusDice）FX.rerollDie(gs, idx)重骰指定骰子，觸發 playerDieRolled 事件FX.splitDie(gs, targetDice, idx, who)將一顆偶數骰子分裂為兩顆FX.flipCard(gs, who)翻面行動卡並遞增翻轉計數FX.setFate(gs, targetWho, val)設定對手下回合第一顆骰子點數
同步規範：FX.stealPts 包含聯網廣播邏輯（syncBattleAction({ type: 'steal', ... })）。其他需要廣播的場景（如不死鳥復活）由 FX.damage 內部發起。
3. 配件配置層（accessories-config.js）
window.ACCESSORIES：所有配件的靜態定義陣列。window.CATEGORIES：配件的 UI 分組顯示設定。
每個配件物件包含以下欄位：
javascript{
  id: 'my_sword',        // 唯一識別碼（字串）
  name: '我的劍',         // 顯示名稱
  icon: '⚔️',             // 圖示（純 emoji）
  rarity: 2,             // 稀有度 1~5（影響商店售價與抽獎機率）
  type: 'active',        // 'active'（主動）或 'passive'（被動）
  req: '⚀ + ⚁',          // UI 顯示的觸發條件說明（純文字）
  desc: '效果描述',       // UI 顯示的功能描述
  keepStored: true,      // （可選）true 表示回合結束時不清除儲能進度，例如獎章
  noRefund: true,        // （可選）true 表示不允許玩家點擊晶片退還骰子，例如獎章
  trigger: { ... },     // 主動配件的消耗條件（被動配件不需要）
  effect: (gs, who, dropIdx, aiDice) => { ... }, // 主動配件觸發時的回呼
  on: { ... }           // 被動配件的事件監聽物件
}
trigger 欄位格式
trigger 用於 canUseAccessory 和 useAccessory 的條件判斷：
javascript// 模式 A：固定配方（需要特定點數組合）
trigger: { type: 'consume', faces: [1, 6] }
// → 需要一顆1和一顆6（魔劍）

// 模式 B：單顆任意（count 為 1 時，骰子點數須在 faces 清單內）
trigger: { type: 'consume', faces: [1,2,3,4,5,6], count: 1 }
// → 任意一顆骰子（鬧鐘、命運干擾）

// 模式 C：單顆特定點數
trigger: { type: 'consume', faces: [2, 4, 6], count: 1 }
// → 任意偶數骰子（分裂符文）

// check 欄位：額外的條件函式
trigger: { 
  type: 'consume', faces: [...], count: 1,
  check: (gs, die, who) => !gs.usedAccs?.includes('my_id') 
}
// → 在 canUseAccessory 中會先執行 check，回傳 false 則無法使用

⚠️ 重要：trigger.count: 1 本身不會自動限制每回合一次。每回合限一次的限制是由 index.html 的 useAccessory 函式中的硬編碼陣列 perTurnAccs 控制（見下方說明）。count: 1 只影響觸發條件的判斷邏輯（單顆模式 vs 多顆模式），以及 UI 顯示的進度計數。

on 物件（被動事件監聽）
javascripton: {
  playerTurnStart:   (gs, actor) => { ... },        // 回合開始時（擲骰前）
  playerTurnEnd:     (gs, actor) => { ... },         // 回合結束時（按「結束回合」後）
  playerDieRolled:   (gs, actor, val, source) => {}, // 每擲出一顆骰子時
  playerFlip:        (gs, actor, flipCount) => {},   // 行動卡翻面時
  playerUseCard:     (gs, actor) => { ... },         // 玩家發動行動卡技能時
  playerTakeDamage:  (gs, victim, dmg) => { ... },   // 受到傷害時（victim 為受傷方）
  playerDeath:       (gs, victim) => { ... },        // 血量歸零時（victim 為死亡方）
                                                     // 回傳 true 表示阻止死亡（不死鳥）
}

說明：事件參數中的 actor / victim 代表觸發事件的角色，值為 'player'（己方）或 'enemy'（對手）。triggerEvent 會根據 actor 查找對應的裝備清單（gs.loadout 或 gs.enemyLoadout）並觸發監聽。

4. 遊戲中樞（game-controller.js）
window.GameController
方法說明dispatchUpdate()中樞廣播塔：觸發畫面渲染 → 廣播狀態給對手（聯網）→ 呼叫 checkWin()checkWin()掃描所有勝利條件，處理不死鳥攔截，觸發 endBattle()
checkWin() 的勝利條件掃描順序：

不死鳥復活攔截（若血量歸零但尚未使用不死鳥，暫緩宣告）
血量歸零（hp <= 0 或 dummyHp <= 0）
榮譽獎章（medalRounds >= 2）
無限翻轉（flipCount >= 10 且裝備了 infinite 配件）

window.BattleCommander
聯網動作的被動接收處理器（只處理對手發來的動作）。
dispatch(act) 是統一入口，根據 act.type 轉發：
act.type觸發時機說明useDieOnCard對手把骰子放上行動卡增加對手能量，將骰子標為已使用useDieOnAcc對手使用配件含鬧鐘重骰（source: 'reroll'）、分裂符文（source: 'split'）、一般配件三種分支useCard對手發動行動卡技能處理對手翻面、扣能量，執行傷害或治療refundAcc對手退還配件骰子將對手帳本中的骰子還原為可用狀態clearAccs對手結束回合清空對手帳本，同步 finalPts（含被動加點後的最終點數）steal對手反甲觸發更新雙方點數（由受害者端廣播，能量守恆）revive對手不死鳥觸發更新對手血量為 1，標記不死鳥已使用
5. 視圖與互動層（ui-render.js、ui-interaction.js）
window.UIRender
戰鬥畫面的渲染中樞。renderBattle() 一次呼叫所有子函式：
方法說明renderHP()更新雙方血量愛心顯示renderCard()更新行動卡點數、進度條、面別、攻擊/回血按鈕啟用狀態renderDice()重繪骰子托盤（含滾動動畫、鎖定狀態、拖曳事件綁定）renderAccBar()重繪雙方配件晶片列，呼叫 createAccChip()renderPhase()更新階段膠囊（擲骰 / 行動 / 結束）與頂部回合標籤renderStats()更新戰局面板數據（翻轉、攻擊、回血、回合數）renderTimer()更新回合計時器（己方倒數 / 對手思考時間）updateCtrl()更新擲骰、結束按鈕的啟用狀態與 pointerEventsupdateMedalDisplay(who)更新獎章晶片的收集進度顯示floatAt(txt, el, cls)在指定元素旁產生浮動數字特效log(msg, cls)輸出戰鬥紀錄（最多保留 20 條）。cls 值：'good'、'bad'、'system'、'spec'
window.UIInteraction
骰子拖曳互動系統。

init()：全域初始化，綁定 mousemove / mouseup / touchmove / touchend（只執行一次）
setupDrag(el, idx)：為指定骰子元素綁定拖曳起點事件
getTarget(x, y)：根據放開座標偵測目標（'card' 或配件 ID）
setDropHighlights(on)：拖曳時高亮可放置目標（呼叫 canUseAccessory 做亮框判斷）

6. 主入口與聯網監聽（index.html）
index.html 包含所有 UI 結構與核心邏輯函式：
核心全域函式
函式說明triggerEvent(event, actor, ...args)事件廣播中心：根據 actor 的裝備清單，觸發對應配件的被動監聽canUseAccessory(acc, dice, dropIdx, who)判斷骰子是否滿足配件的使用條件（亮框邏輯與投入前驗證共用）useAccessory(acc, dice, dropIdx, who)執行配件投入：管理儲能帳本、呼叫 acc.effect()、處理獎章特殊邏輯useDieOnCard(idx)玩家把骰子放上行動卡，聯網時廣播 useDieOnCarduseDieOnAcc(idx, accId)玩家把骰子拖到配件，呼叫 useAccessory()，聯網時廣播 useDieOnAccuseCard(type)玩家發動行動卡（'atk' 或 'heal'），觸發 playerFlip、playerUseCard 事件doRoll()擲骰：生成骰子陣列，觸發 playerTurnStart 與 playerDieRolled 事件，聯網時同步 lastDicedoEndTurn()結束回合：觸發 playerTurnEnd，廣播 clearAccs（含 finalPts），寫入 snapshot，清空冷卻清單doEnemyTurn()AI 回合（單機用）：模擬擲骰、配件使用、行動卡發動startBattle()單機戰鬥初始化（已廢棄，改用 startPvEBattle()）startPvEBattle()PvE 戰鬥初始化（從大廳進入）startOnlineBattle(roomData)PvP 戰鬥初始化，房主負責寫入 Firebase battle 節點listenToBattleActions()Firebase 戰鬥監聽器：處理對手動作、回合切換、骰子同步、斷線偵測resumeBattle(...)斷線重連後還原戰鬥狀態（從 snapshot 還原數值）endBattle(reason)結算：計算金幣獎勵、渲染結算畫面、清理 FirebasesyncBattle(data)將部分狀態更新寫入 Firebase battle 節點syncBattleAction(action)將單一動作寫入 Firebase battle/lastAction（對手端透過 BattleCommander.dispatch 接收）
每回合限一次冷卻機制
useAccessory() 內有一個硬編碼陣列管理每回合限一次的配件：
javascriptconst perTurnAccs = ['clock', 'fate', 'splitter'];

只有列在此陣列中的配件，使用後才會加入 gs.usedAccs（或 gs.enemyUsedAccs），並在下次嘗試使用時被擋下。
回合結束（doEndTurn()）時會同時清空 gs.usedAccs 和 gs.enemyUsedAccs。
新增需要每回合限一次的配件，必須手動將其 ID 加入 perTurnAccs 陣列。trigger 的 check 函式或 count: 1 欄位不能代替這個機制。


🔄 核心同步機制：權威事件流
聯網對戰捨棄簡單的數據覆寫，改用**「受害者/受益者權威廣播」**模式：
傷害與被動連鎖
FX.damage() 在雙端都會執行（玩家 A 攻擊 B，A 端和 B 端的 FX.damage 都會跑），但後續的被動效果只有「受害者端」有權廣播：

反甲：B 被打 → B 的 FX.stealPts 發出 steal 廣播 → A 收到後扣除能量
不死鳥：B 血量歸零 → B 的 FX.damage 觸發不死鳥 → B 廣播 revive → A 收到後同步 B 的血量為 1

能量守恆
steal 廣播傳送的是增量（amount），不是絕對值，避免覆蓋掉正在進行的本地操作。
回合結束快照
doEndTurn() 結束時會同時廣播兩件事：

clearAccs 動作（含 finalPts）：確保對手端看到的回合結束點數與被動觸發後一致
snapshot（巢狀物件）：以雙方角色名稱為 key，記錄當下所有核心數值，供斷線重連時還原

動作去重
每個廣播動作都帶有隨機 actionId，接收端用 gs.lastProcessedActionId 記錄最後處理過的 ID，避免 Firebase 重複觸發同一動作。
骰子同步
擲骰結果寫入 battle.lastDice，接收端用 gs.diceActionId 與 data.diceActionId 比對，確保不重複觸發被動效果。

🌐 聯網房間管理
Firebase 數據結構
rooms/{roomId}/
  host: uid
  host_name: string
  host_loadout: [id, ...]
  host_ready: boolean
  guest: uid
  guest_name: string
  guest_loadout: [id, ...]
  guest_ready: boolean
  status: 'waiting' | 'pre-battle' | 'battle' | 'abandoned'
  isQuickMatch: boolean
  timestamp: number
  battle/
    status: string
    currentTurnPlayer: 'host' | 'guest'
    turnCount: number
    lastAction: { type, actor, actionId, ... }
    lastDice: [{ v, u }, ...]
    diceActionId: number
    snapshot: { host: {...}, guest: {...}, medalRounds: {...}, statTurn: number }
    bonusDice: number
    remoteCountdown: number

users/{uid}/
  name: string
  gold: number
  level: number
  warehouse: [id, ...]
  unlockedAccessories: [id, ...]
  currentLoadout: [id, ...]
  shards: number
  lastLoginDate: string
  currentRoom: { roomId, role, lastSeen, online }
房間流程

快速配對：quickMatch() → findAvailableRoom() → 找到則以 guest 身份加入，找不到則 createQuickMatchWaitingRoom() 自己開房等待
手動加入：joinOnlineRoom() 輸入房號，房間不存在則自動建立
大廳（lobbyScreen）：雙方在此選擇配件（最多 5 件，各自看不到對手選了什麼），按準備後進入戰鬥
戰鬥（battleScreen）：由 listenToBattleActions() 監聽 Firebase 雙節點（房間根目錄 + battle 子節點）

斷線處理

心跳：每 15 秒更新 users/{uid}/currentRoom.lastSeen 與 rooms/{roomId}.timestamp
斷線標記：onDisconnect() 設定 users/{uid}/currentRoom.online = false；房主斷線則將房間 status 改為 abandoned
重連：頁面載入後 attemptReconnect() 檢查 currentRoom 記錄，若房間仍有效則自動恢復（大廳或戰鬥）。lastSeen 超過 60 秒視為過期記錄，自動清除
對手斷線：listenToBattleActions() 偵測到 guest 消失或 status === 'abandoned' 時啟動 60 秒倒數，倒數結束寫入勝負；對手重連則清除倒數

回合超時

每回合計時 90 秒（startTurnTimer()）
每 5 秒同步剩餘時間給對手（battle.remoteCountdown）
第一次超時：強制執行 doEndTurn()
第二次超時：寫入 battle/status: 'game-over'，判負


🔌 多裝置衝突保護
登入後約 6 秒，會透過 Firebase 確認 users/{uid}/connectionId 是否與本地一致，若不同（代表同帳號在其他裝置登入），則強制登出。

🛒 商店與抽獎

商店：顯示未擁有的配件，售價 = 稀有度 × 20 金幣
抽獎：花費 30 金幣，依稀有度機率抽出：1⭐(40%) / 2⭐(30%) / 3⭐(17%) / 4⭐(10%) / 5⭐(3%)
重複配件：轉化為造型碎片（playerAccount.shards），各稀有度碎片量：1⭐=2 / 2⭐=4 / 3⭐=6 / 4⭐=8 / 5⭐=10
每日獎勵：每天第一次登入獲得 15 金幣
新帳號：自動執行五連抽（從全配件池各抽一件，不重複）

帳號資料儲存於 playerAccount（記憶體）並同步至 users/{uid}（Firebase），包含 warehouse（擁有的配件）與 unlockedAccessories（圖鑑解鎖，兩者目前保持一致）。

📁 檔案結構與職責一覽
檔案職責index.html主入口：所有 UI 結構、Firebase 初始化、帳號系統、房間管理、配對、戰鬥核心流程（擲骰、行動、結束回合）、AI、勝負結算、商店、抽獎、工具函式game-state.js定義 gs 的資料結構與 createBattleState() 初始化函式battle-fx.js原子戰鬥邏輯（傷害、治療、偷取、翻面⋯）與聯網事件廣播accessories-config.js配件定義（主動 / 被動、效果、觸發條件）與分類顯示設定game-controller.js勝利條件檢查（GameController）、聯網動作接收器（BattleCommander）ui-render.js戰鬥畫面渲染（血量、能量、骰子、配件晶片⋯）ui-interaction.js骰子拖曳互動、幽靈骰子、目標偵測style.css全局樣式、CSS 變數色板、酒館主題、響應式設計

🧩 配件開發指南
新增主動配件
javascript{
  id: 'my_sword',
  name: '我的劍',
  icon: '⚔️',
  rarity: 2,
  type: 'active',
  req: '⚀ + ⚁',                         // UI 顯示文字（不影響邏輯）
  desc: '消耗骰子 1 與 2，造成 1 點傷害。',
  trigger: { type: 'consume', faces: [1, 2] },
  effect: (gs, who, dropIdx, aiDice) => {
    const target = (who === 'player') ? 'enemy' : 'player';
    FX.damage(gs, target, 1, "⚔️ 我的劍攻擊");
    if (who === 'player') gs.statAtk++;   // ✅ 純統計計數器可直接修改 gs
  }
}
effect 的參數：

gs：全域戰鬥狀態
who：使用者（'player' 或 'enemy'）
dropIdx：觸發骰子在 gs.dice 的索引（單顆模式）
aiDice：AI 回合時的骰子陣列（AI 使用配件時傳入，玩家使用時為 gs.dice）

儲能配件：若 faces 有多個值，系統會自動管理 playerStored[id]，收集足夠骰子後才呼叫 effect，不需自行處理帳本。
每回合限一次：若需要此限制，除了在 trigger 加上 check: (gs, die, who) => !gs.usedAccs?.includes('my_id') 以外，還必須將 ID 加入 index.html 的 perTurnAccs 陣列：
javascriptconst perTurnAccs = ['clock', 'fate', 'splitter', 'my_id']; // ← 在這裡加
新增被動配件
javascript{
  id: 'my_thorns',
  name: '荊棘',
  icon: '🌵',
  rarity: 3,
  type: 'passive',
  req: '受傷時',
  desc: '受到傷害時反彈 1 點傷害。',
  on: {
    playerTakeDamage: (gs, victim, dmg) => {
      if (victim === 'player') {
        const attacker = 'enemy';
        FX.damage(gs, attacker, 1, "🌵 荊棘反彈");
      }
    }
  }
}
完整事件清單
由 triggerEvent(event, actor, ...args) 發射：
事件名稱發射時機參數（gs 之後）備註playerTurnStart玩家擲骰時 / AI 回合開始時actorplayerTurnEnd玩家按「結束回合」後 / AI 回合結束時actorplayerDieRolled每顆骰子擲出時（含重骰）actor, val, sourcesource 為 'start'（正常擲骰）或 'reroll'（鬧鐘）playerFlip行動卡翻面時actor, flipCount包含主動翻面（useCard()）與被動翻面（chaos_mirror 等）playerUseCard玩家發動行動卡技能時actor在 playerFlip 之後觸發playerTakeDamage受到傷害時（在 FX.damage 內）victim, dmgvictim 為受傷方playerDeath血量歸零時（在 FX.damage 內）victim回傳 true 可阻止死亡（不死鳥機制）

⚙️ 開發規範（重要！）
修改數據

數值類欄位（hp, pts, dummyHp, enemyPts 等）：必須呼叫 FX 函式，禁止直接算術運算。這樣才能觸發副作用（被動事件、浮動數字、聯網廣播）。
純統計計數器（statAtk, statHeal, statTurn 等）：允許直接修改 gs，因為這些欄位不影響聯網同步路徑，也不觸發任何事件。
特殊狀態旗標（isGameOver, playerPhoenixUsed, usedAccs 等）：配件 effect / on 內允許直接修改，但需留意在兩端是否對稱。

正確範例：
javascript// ✅ 傷害透過 FX
FX.damage(gs, 'enemy', 2, "⚔️ 攻擊");

// ✅ 統計計數器直接改
gs.statAtk++;

// ❌ 禁止直接改數值類欄位
gs.hp -= 1;
gs.enemyPts = 0;
非同步回呼安全
在 setTimeout 或 async/await 回呼中，若有操作 gs 的邏輯，務必先檢查 gameInstanceId 是否已改變（代表新一局已開始），避免舊對局的回呼干擾：
javascriptconst currentId = gameInstanceId;
setTimeout(() => {
  if (currentId !== gameInstanceId) return; // 舊對局，放棄
  // 安全操作 gs ...
}, 1000);
渲染時機

每次邏輯執行後，FX 函式會透過 FX.notify() → GameController.dispatchUpdate() → UIRender.renderBattle() 自動觸發渲染。
若需要立即鎖定按鈕（如反甲偷點後防止對手二次攻擊），額外呼叫 window.UIRender.updateCtrl()。

聯網對稱性
開發新配件時，思考：

這個動作在攻擊者端和受害者端各會產生什麼數值變化？
哪一端有責任廣播？（通常是受益者或受害者端）
是否需要在 BattleCommander.actions 新增對應的接收處理？

除錯

使用 console.log('[' + myRole + '] ...') 標註聯網流程
戰鬥記錄透過 UIRender.log(msg, cls) 輸出，分類：'good'（玩家有利）、'bad'（玩家不利）、'system'（系統）、'spec'（特殊）
全域變數 gs, FX, FACES, ACCESSORIES, myRole, roomId 可直接在 DevTools 中存取


📝 結語
本專案採用高度模組化設計，確保複雜的被動連鎖與聯網同步能夠穩定運行。開發新功能時，請務必遵循上述規範，以維持程式碼一致性與可維護性。如有疑問，可參考既有配件（thorns、phoenix、storm）的實作方式。
現在，拿起你的骰子，在迷霧酒館中贏得榮耀吧！ 🍻🎲