// battle-fx.js - 戰鬥邏輯與工具函式庫
// 此檔案為戰鬥邏輯層，定義了 window.FX 物件。依賴於 window.gs (game-state.js)

const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
window.rand = function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a};

window.FX = {
  // 點數操作
 addPts: (gs, who, n) => {
    const val = parseInt(n) || 0;
    if(who==='player') {
      gs.pts = (gs.pts || 0) + val; 
      floatAt(`+${val}`, document.getElementById('myCard'), 'pts');
    } else {
      gs.enemyPts = (gs.enemyPts || 0) + val;
      // ⚡ 改用更穩定的選擇器抓取對手卡片
      const enemyCardWrap = document.querySelector('.card-wrap:last-child .action-card');
      if(enemyCardWrap) floatAt(`+${val}`, enemyCardWrap, 'pts');
    }
    renderCard(); // ⚡ 強制重新渲染確保數字立刻變動
  },
  
 stealPts: (gs, who, n, label = "奪取") => {
  // 確保點數存在
    if (typeof gs.pts !== 'number' || isNaN(gs.pts)) gs.pts = 0;
    if (typeof gs.enemyPts !== 'number' || isNaN(gs.enemyPts)) gs.enemyPts = 0;
    const from = who === 'player' ? 'enemy' : 'player';
    const currentFromPts = (from === 'player' ? gs.pts : gs.enemyPts);
    const stolen = Math.min(n, currentFromPts);
    
    if (from === 'player') gs.pts -= stolen;
    else gs.enemyPts -= stolen;
    
    if (who === 'player') gs.pts += stolen;
    else gs.enemyPts += stolen;
    
    // 這裡不再寫死「反甲」，而是根據傳入的 label 說話
    if (stolen > 0) {
      log(`${label}：${who === 'player' ? '你' : '對手'} 奪取了 ${stolen} 點數！`, who === 'player' ? 'good' : 'bad');
    } else {
      log(`${label}：目標行動卡已空，未能奪取點數。`, 'system');
    }
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
  
damage: (gs, target, n, label = "攻擊") => {
  // 1. 強制執行本地扣血：不管是誰的回合，只要這行跑了，螢幕上的血就要扣
  if (target === 'enemy') {
    gs.dummyHp = Math.max(0, gs.dummyHp - n);
    const heartEl = document.getElementById('dummyHearts');
    if(heartEl) floatAt(`-${n}💀`, heartEl, 'dmg');
  } else {
    gs.hp = Math.max(0, gs.hp - n);
    const heartEl = document.getElementById('hpHearts');
    if(heartEl) floatAt(`-${n}💀`, heartEl, 'dmg');
  }
  
  // 顯示戰鬥日誌
  log(`${label}：${target === 'enemy' ? '對手' : '你'} 受到 ${n} 點傷害！`, target === 'enemy' ? 'good' : 'bad');

  // 2. 觸發受傷配件 (例如：反甲)
  triggerEvent('playerTakeDamage', target, n);

  // 3. 檢查死亡與復活 (例如：不死鳥羽毛)
  const currentHp = (target === 'player') ? gs.hp : gs.dummyHp;
  if (currentHp <= 0) {
    let saved = false;
    const loadoutToCheck = (target === 'player') ? gs.loadout : gs.enemyLoadout;
    loadoutToCheck.forEach(id => {
      const acc = ACCESSORIES.find(a => a.id === id);
      if (acc?.on?.playerDeath && acc.on.playerDeath(gs, target)) {
        saved = true;
      }
    });
    // 如果復活了，就停止執行下方的勝負判定
    if (saved) { renderBattle(); return; }
  }

  // 4. 勝負宣告：這段「只給發動攻擊的人」執行
  // 理由：如果不加這個 if，兩台電腦會同時向 Firebase 發送 "我贏了"，會造成混亂
 if (roomId && myRole === gs.currentTurnPlayer) {
    const finalOpponentHp = (target === 'enemy') ? gs.dummyHp : gs.hp;
    if (finalOpponentHp <= 0) {
        syncBattle({ status: 'game-over', winner: myRole, timestamp: Date.now() });
    }
}

  // 刷新畫面
  renderBattle();
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
  
rerollDie: (gs, dropIdx) => {
    const targetDie = gs.dice[dropIdx];
    if (targetDie) {
      const v = rand(1, 6);
      targetDie.v = v;
      targetDie.u = false;
      
      // 核心修正：觸發事件並標註來源為 'reroll'
      triggerEvent('playerDieRolled', 'player', v, 'reroll');
      
      log(`⏰ 鬧鐘響起！點數重置為 ${FACES[v-1]}`, 'good');
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
};