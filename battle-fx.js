// battle-fx.js - 戰鬥邏輯與工具函式庫
// 此檔案為戰鬥邏輯層，定義了 window.FX 物件。依賴於 window.gs (game-state.js)

const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
window.rand = function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a};

window.FX = {
  // 點數操作
// ⚡ 點數操作：加入身分檢查與自動同步
  addPts: (gs, who, n, label) => {
    const val = parseInt(n) || 0;
    if (who === 'player') {
      gs.pts = (gs.pts || 0) + val;
      if (window.floatAt) window.floatAt(`+${val}`, document.getElementById('myCard'), 'pts');
    } else {
      gs.enemyPts = (gs.enemyPts || 0) + val;
      const enemyCardWrap = document.querySelector('.card-wrap:last-child .action-card');
      if (enemyCardWrap && window.floatAt) window.floatAt(`+${val}`, enemyCardWrap, 'pts');
    }

    // ⚡ 核心修正：只有「發起者」負責同步
    if (window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
      window.syncBattle({ pts: gs.pts, enemyPts: gs.enemyPts });
    }

    if (label && window.log) window.log(label, who === 'player' ? 'good' : 'bad');
    if (window.renderCard) window.renderCard();
  },
  
stealPts: (gs, who, n, label = "奪取") => {
    // 1. 安全檢查與數值計算
    if (typeof gs.pts !== 'number' || isNaN(gs.pts)) gs.pts = 0;
    if (typeof gs.enemyPts !== 'number' || isNaN(gs.enemyPts)) gs.enemyPts = 0;
    
    const from = who === 'player' ? 'enemy' : 'player';
    const currentFromPts = (from === 'player' ? gs.pts : gs.enemyPts);
    const stolen = Math.min(n, currentFromPts);
    
    if (stolen <= 0) {
      if (window.log) window.log(`${label}：目標能量已空，未能奪取。`, 'system');
      return;
    }

    // 2. 數據修改
    if (from === 'player') gs.pts -= stolen; else gs.enemyPts -= stolen;
    if (who === 'player') gs.pts += stolen; else gs.enemyPts += stolen;
    
    // 3. ⚡ 視覺與 Log 連動 (補回你最在意的部分)
    // 這裡我們根據 who 是誰，決定 Log 的文字與顏色
    const isMe = (who === 'player');
    const logText = isMe 
        ? `${label}：從對手偷了 ${stolen} 點！` 
        : `${label}：偷了你的 ${stolen} 點！`;
    const logType = isMe ? 'good' : 'bad';
    
    if (window.log) window.log(logText, logType);

    // 4. 跳字特效
    const myEl = document.getElementById('myCard');
    const enemyEl = document.querySelector('.card-wrap:last-child .action-card');
    if (window.floatAt) {
      window.floatAt(`-${stolen}`, (from === 'player' ? myEl : enemyEl), 'pts');
      window.floatAt(`+${stolen}`, (who === 'player' ? myEl : enemyEl), 'pts');
    }

    // 5. 聯網同步 (只有發起者端發送)
    if (window.isOnlineMode && window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
      window.syncBattle({ pts: gs.pts, enemyPts: gs.enemyPts });
    }
    
    if (window.renderBattle) window.renderBattle();
  },
  
  clearPts: (gs, who) => {
    if(who==='player') gs.pts = 0;
    else gs.enemyPts = 0;
    log(`${who==='player'?'⚔':'🤖'} 行動卡點數被清空！`, who==='player'?'bad':'good');
  },
  
  fillCard: (gs, who) => {
    const max = (who==='player'?gs.face:gs.enemyFace)==='A'?8:24;
    if(who==='player') gs.pts = max;
    else gs.enemyPts = max;
    log(`${who==='player'?'✨':'🤖'} 行動卡直接填滿！`, who==='player'?'good':'bad');
  },

splitDie: (gs, targetDice, idx, who) => {
    // 🛡️ 第一層：確保 targetDice 存在，若不存在則嘗試回退到 gs.dice
    const dicePool = targetDice || (gs ? gs.dice : null);
    if (!dicePool) {
        console.warn("⚠️ splitDie: 找不到骰子池");
        return;
    }

   // 🛡️ 第二層：確保該索引的骰子真的存在
    const die = dicePool[idx];
    if (!die || typeof die.v === 'undefined') {
        // ⚡ 改成這樣，不要報錯，直接默默退出
        console.warn(`⚠️ splitDie 同步中...`);
        return;
    }
    
    const half = Math.floor(die.v / 2); // 確保是整數
    if (half < 1) return; // 點數 1 不能再分裂

    const label = (who === 'player') ? '👤 你' : '🤖 對手';
    
    // 🛡️ 第三層：安全讀取 FACES，防止 faceIndex 為負數
    const faceIndex = Math.max(0, die.v - 1);
    const halfIndex = Math.max(0, half - 1);
    
    log(`${label} 將 ${FACES[faceIndex]} 分裂為兩個 ${FACES[halfIndex]}！`, 'spec');

    // 執行分裂邏輯
    die.u = true; 
    dicePool.push(
        { v: half, u: false, rolling: true }, 
        { v: half, u: false, rolling: true }
    );

    // 550ms 後移除動畫標記
    setTimeout(() => {
        // 這裡同樣要確保 gs.dice 存在，避免異步回調時對象已被銷毀
        if (gs && gs.dice) {
            gs.dice.forEach(d => { if(d) d.rolling = false; });
            renderBattle();
        }
    }, 550);
},
  // ⚡ 傷害處理：保留不死鳥與特效，並修正聯網勝負判定
  damage: (gs, target, n, label = "攻擊") => {
    // 1. 本地扣血與跳字 (💀) - 保留你原本的邏輯
    if (target === 'enemy') {
      gs.dummyHp = Math.max(0, (gs.dummyHp || 0) - n);
      const heartEl = document.getElementById('dummyHearts');
      if (heartEl && window.floatAt) window.floatAt(`-${n}💀`, heartEl, 'dmg');
    } else {
      gs.hp = Math.max(0, (gs.hp || 0) - n);
      const heartEl = document.getElementById('hpHearts');
      if (heartEl && window.floatAt) window.floatAt(`-${n}💀`, heartEl, 'dmg');
    }
    
    if (window.log) window.log(`${label}：${target === 'enemy' ? '對手' : '你'} 受到 ${n} 點傷害！`, target === 'enemy' ? 'good' : 'bad');

    // 2. 觸發受傷配件 (例如：反甲)
    if (window.triggerEvent) window.triggerEvent('playerTakeDamage', target, n);

    // 3. 檢查不死鳥復活 (保留你的攔截邏輯)
    const currentHp = (target === 'player') ? gs.hp : gs.dummyHp;
    if (currentHp <= 0) {
      let saved = false;
      const loadout = (target === 'player') ? gs.loadout : gs.enemyLoadout;
      loadout?.forEach(id => {
        const acc = window.ACCESSORIES?.find(a => a.id === id);
        if (acc?.on?.playerDeath && acc.on.playerDeath(gs, target)) {
          saved = true;
        }
      });
      if (saved) {
        if (window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
          window.syncBattle({ hp: gs.hp, dummyHp: gs.dummyHp, playerPhoenixUsed: gs.playerPhoenixUsed, enemyPhoenixUsed: gs.enemyPhoenixUsed });
        }
        window.renderBattle();
        return; 
      }
    }

    // ⚡ 修正：刪除原本那個錯誤的 winner 判定，只做血量數據同步
    if (window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
        window.syncBattle({ hp: gs.hp, dummyHp: gs.dummyHp });
    }

    window.renderBattle();
    // ⚡ 權力交還：呼叫你原本就有的 checkWin
    if (window.checkWin) window.checkWin();
  },
  
heal: (gs, who, n, label = "治療") => {
    if(who === 'player') {
      gs.hp = Math.min(6, gs.hp + n);
      floatAt(`+${n}💚`, document.getElementById('hpHearts'), 'heal');
      log(`${label}：你回復了 ${n} 點血量！`, 'good');
    } else {
      gs.dummyHp = Math.min(6, gs.dummyHp + n);
      floatAt(`+${n}💚`, document.getElementById('dummyHearts'), 'heal');
      log(`${label}：對手回復了 ${n} 點血量！`, 'good');
    }
  },
  
  // 骰子操作
  addDice: (gs, who, n) => {
    if(who==='player') gs.bonusDice = (gs.bonusDice||0) + n;
    else gs.enemyBonusDice = (gs.enemyBonusDice||0) + n;
    log(`${who==='player'?'🎲':'🤖'} 下回合多 ${n} 顆骰子！`, who==='player'?'good':'bad');
  },
  
// ⚡ 鬧鐘專用：重新擲骰 (Reroll)
  rerollDie: (gs, idx) => {
    const targetDie = gs.dice[idx];
    if (targetDie) {
      const v = window.rand(1, 6);
      targetDie.v = v;
      targetDie.u = false; // 恢復彩色
      targetDie.rolling = true; 

      if (window.log) window.log(`⏰ 鬧鐘響起！點數重置為 ${window.FACES[v-1]}`, 'good');
      if (window.triggerEvent) window.triggerEvent('playerDieRolled', 'player', v, 'reroll');

      // 聯網：發送動畫指令
      if (window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
        window.syncOnlineAction('useDieOnAcc', { accId: 'clock', dieIdx: idx, val: v, source: 'reroll' });
      }

      setTimeout(() => {
        if (gs.dice[idx]) gs.dice[idx].rolling = false;
        window.renderBattle();
      }, 550);
      window.renderBattle();
    }
  },
  
  // 翻面操作
  flipCard: (gs, who) => {
    if(who==='player') {
      gs.face = gs.face==='A'?'B':'A';
      gs.flipCount++;
    } else {
      gs.enemyFace = gs.enemyFace==='A'?'B':'A';
      gs.enemyFlipCount++;
    }
    log(`${who==='player'?'🔄':'🤖'} ${who==='player'?'你的':'對手的'}行動卡被翻面！`, who==='player'?'bad':'good');
  },

  // ⚡ 命運干擾專用
  // battle-fx.js 修正版片段
  setFate: (gs, targetWho, val) => {
    if (targetWho === 'enemy') {
      gs.enemyNextDie = val;
      // 只有是我發動干擾時，才同步給雲端
      if (window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
        window.syncBattle({ enemyNextDie: val });
      }
    } else {
      gs.playerNextDie = val;
    }
    // ⚡ 修正處：去掉 window. 直接使用 FACES
    if (window.log) window.log(`🎭 命運干擾：${targetWho === 'enemy' ? '對手' : '你'} 下回合必出 ${FACES[val-1]}`, 'spec');
    window.renderBattle();
  },
};
