// battle-fx.js - 戰鬥邏輯與工具函式庫 (積木化零件庫)
const FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
window.rand = function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a};

window.FX = {
  // --- 📢 中樞通知接口 ---
  notify: () => {
    if (window.GameController && window.GameController.dispatchUpdate) {
      window.GameController.dispatchUpdate();
    }
  },

  // --- 點數操作積木 ---
  addPts: (gs, who, n, label) => {
    const val = parseInt(n) || 0;
    if (who === 'player') {
      gs.pts = (gs.pts || 0) + val;
      if (window.UIRender) window.UIRender.floatAt(`+${val}`, document.getElementById('myCard'), 'pts');
    } else {
      gs.enemyPts = (gs.enemyPts || 0) + val;
      const enemyCardWrap = document.querySelector('.card-wrap:last-child .action-card');
      if (window.UIRender && enemyCardWrap) window.UIRender.floatAt(`+${val}`, enemyCardWrap, 'pts');
    }
    if (label && window.UIRender) window.UIRender.log(label, who === 'player' ? 'good' : 'bad');
    window.FX.notify();
  },
  
  // who = 獲益者（偷別人點數的那方）
stealPts: (gs, who, n, label = "奪取") => {
    const from = who === 'player' ? 'enemy' : 'player';
    const sourcePts = (from === 'player' ? gs.pts : gs.enemyPts) || 0;
    // 計算出「真理數值」，並防止負數
    const stolen = Math.max(0, Math.min(n, sourcePts));
    if (stolen <= 0) return;

    if (from === 'player') gs.pts -= stolen; else gs.enemyPts -= stolen;
    if (who === 'player') gs.pts += stolen; else gs.enemyPts += stolen;

    // ⚡ 聯網同步：如果是「我被打」觸發了反甲，廣播這個偷取事件
   // 改後：只有被偷的是我自己時才廣播
    if (window.isOnlineMode && window.isOnlineMode() && window.syncBattleAction && from === 'enemy') {
    window.syncBattleAction({ 
    type: 'steal', 
    actor: window.myRole,
    victim: window.myRole,  // 「我自己」被偷了，傳我的角色名稱
    amount: stolen 
    });
    }

    if (window.UIRender) {
        window.UIRender.log(`${label}：${who === 'player' ? '你' : '對手'} 奪取了 ${stolen} 點數！`, who === 'player' ? 'good' : 'bad');
    }
    window.FX.notify();
},
  
  clearPts: (gs, who, label) => {
    if(who === 'player') gs.pts = 0; else gs.enemyPts = 0;
    const defaultMsg = `${who === 'player' ? '⚔' : '🤖'} 行動卡點數被清空！`;
    if (window.UIRender) window.UIRender.log(label || defaultMsg, who === 'player' ? 'bad' : 'good');
    window.FX.notify();
},
  
  fillCard: (gs, who) => {
    const max = (who === 'player' ? gs.face : gs.enemyFace) === 'A' ? 8 : 24;
    if(who === 'player') gs.pts = max; else gs.enemyPts = max;
    if (window.UIRender) window.UIRender.log(`${who === 'player' ? '✨' : '🤖'} 行動卡直接填滿！`, who === 'player' ? 'good' : 'bad');
    window.FX.notify();
  },

  // --- 傷害與血量積木 ---
  damage: (gs, target, n, label = "攻擊") => {
    if (target === 'enemy') {
      gs.dummyHp = Math.max(0, (gs.dummyHp || 0) - n);
    } else {
      gs.hp = Math.max(0, (gs.hp || 0) - n);
    }

    const heartEl = target === 'enemy' ? document.getElementById('dummyHearts') : document.getElementById('hpHearts');
    if (window.UIRender) {
      window.UIRender.floatAt(`-${n}💀`, heartEl, 'dmg');
      window.UIRender.log(`${label}：${target === 'enemy' ? '對手' : '你'} 受到 ${n} 點傷害！`, target === 'enemy' ? 'good' : 'bad');
    }


  // 反甲：只在「我被打」時觸發，不在「我打對手」時觸發
   // 改後
   if (window.triggerEvent && window.isLocalTarget(target)) {
   window.triggerEvent('playerTakeDamage', target, n);
   }

    // 死亡判定（移除守衛，讓兩端都能正確判定不死鳥）
    const currentHp = (target === 'player') ? gs.hp : gs.dummyHp;
    if (currentHp <= 0) {
      let saved = false;
      const loadoutToCheck = (target === 'player') ? gs.loadout : gs.enemyLoadout;
      (loadoutToCheck || []).forEach(id => {
        const acc = (window.ACCESSORIES || []).find(a => a.id === id);
        if (acc?.on?.playerDeath && acc.on.playerDeath(gs, target)) {
          saved = true;
        }
      });
    if (saved) {
            // ⚡ 聯網同步：如果是「我復活了」，廣播復活事件確保對手畫面同步
            if (window.isOnlineMode && window.isOnlineMode() && window.isLocalTarget(target)) {
            window.syncBattleAction({ type: 'revive', who: window.myRole });
            }
            window.FX.notify();
            return;
      }
    }
    window.FX.notify();
  },

  heal: (gs, who, n, label = "治療") => {
    const val = parseInt(n) || 0;
    if (who === 'player') {
      gs.statHeal++;
      gs.hp = Math.min(gs.maxHp || 6, (gs.hp || 0) + val);
      if (window.UIRender) window.UIRender.floatAt(`+${val}💚`, document.getElementById('hpHearts'), 'heal');
    } else {
      gs.enemyStatHeal++;
      gs.dummyHp = Math.min(gs.enemyMaxHp || 6, (gs.dummyHp || 0) + val);
      if (window.UIRender) window.UIRender.floatAt(`+${val}💚`, document.getElementById('dummyHearts'), 'heal');
    }
    if (window.UIRender) window.UIRender.log(`${who === 'player' ? '👤 你' : '🤖 對手'} ${label}，恢復 ${val} 點生命！`, 'good');
    window.FX.notify();
  },

  // --- 骰子與特殊機制積木 ---
  splitDie: (gs, targetDice, idx, who) => {
    const dicePool = targetDice || (gs ? gs.dice : null);
    if (!dicePool) return;
    const die = dicePool[idx];
    if (!die || typeof die.v === 'undefined') return;
    const half = Math.floor(die.v / 2);
    if (half < 1) return;

    const label = (who === 'player') ? '👤 你' : '🤖 對手';
    if (window.UIRender) window.UIRender.log(`${label} 將 ${FACES[Math.max(0,die.v-1)]} 分裂為兩個 ${FACES[Math.max(0,half-1)]}！`, 'spec');

    die.u = true; 
    dicePool.push({ v: half, u: false, rolling: true }, { v: half, u: false, rolling: true });

    setTimeout(() => {
      if (gs && gs.dice) {
        gs.dice.forEach(d => { if(d) d.rolling = false; });
        window.FX.notify();
      }
    }, 550);
    window.FX.notify();
  },

  addDice: (gs, who, n) => {
       if(who === 'player') {
        gs.bonusDice = (gs.bonusDice || 0) + n;
        console.log(`[${myRole}] 本地 bonusDice 增加 ${n}，现为 ${gs.bonusDice}`);
    } else {
        gs.enemyBonusDice = (gs.enemyBonusDice || 0) + n;
        console.log(`[${myRole}] 本地 enemyBonusDice 增加 ${n}，现为 ${gs.enemyBonusDice}`);
    }
    if (window.UIRender) window.UIRender.log(`${who === 'player' ? '🎲' : '🤖'} 下回合多 ${n} 顆骰子！`, who === 'player' ? 'good' : 'bad');
    window.FX.notify();
  },
  
  rerollDie: (gs, idx) => {
    const targetDie = gs.dice[idx];
    if (targetDie) {
      const v = window.rand(1, 6);
      targetDie.v = v;
      targetDie.u = false;
      targetDie.rolling = true; 
      if (window.UIRender) window.UIRender.log(`⏰ 鬧鐘響起！點數重置為 ${FACES[v-1]}`, 'good');
      if (window.triggerEvent) window.triggerEvent('playerDieRolled', 'player', v, 'reroll');
      setTimeout(() => {
        if (gs.dice[idx]) gs.dice[idx].rolling = false;
        window.FX.notify(); 
      }, 550);
      window.FX.notify();
    }
  },
  
  flipCard: (gs, who) => {
    if(who === 'player') {
      gs.face = gs.face === 'A' ? 'B' : 'A';
      gs.flipCount = (gs.flipCount || 0) + 1;
    } else {
      gs.enemyFace = gs.enemyFace === 'A' ? 'B' : 'A';
      gs.enemyFlipCount = (gs.enemyFlipCount || 0) + 1;
    }
    if (window.UIRender) window.UIRender.log(`${who === 'player' ? '🔄' : '🤖'} ${who === 'player' ? '你的' : '對手的'}行動卡被翻面！`, who === 'player' ? 'bad' : 'good');
    window.FX.notify();
  },

  setFate: (gs, targetWho, val) => {
    if (targetWho === 'enemy') gs.enemyNextDie = val;
    else gs.playerNextDie = val;
    if (window.UIRender) window.UIRender.log(`🎭 命運干擾：${targetWho === 'enemy' ? '對手' : '你'} 下回合必出 ${FACES[val-1]}`, 'spec');
    window.FX.notify();
  }
};
