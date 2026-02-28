
// ██████████████████████████████████████████
//  遊戲引擎
// ██████████████████████████████████████████

window.BattleCommander = {
  actions: {
    // 1. 📡 對手把骰子放上行動卡
    useDieOnCard: (act) => {
      // 在我的螢幕上，給「對手(enemy)」加點數
      FX.addPts(gs, 'enemy', act.val);
      // 找到對應的那顆骰子變灰
      if (gs.dice && gs.dice[act.dieIdx]) {
        gs.dice[act.dieIdx].u = true;
      }
      window.UIRender.log(`📡 對手將 ${FACES[act.val-1]} 填入了行動卡`, 'system');
    },

   // 在 BattleCommander.useDieOnAcc 中
   useDieOnAcc: (act) => {
    const acc = ACCESSORIES.find(a => a.id === act.accId);
    if (!acc || !gs.dice || !gs.dice[act.dieIdx]) return;

    // 1. 顯示 Log
    window.UIRender.log(`📡 對手施展了 ${acc.icon} ${acc.name} 的力量！`, 'bad');

    if (act.source === 'reroll') {
        // --- ⏰ 鬧鐘重骰專屬邏輯 (彩色 + 轉動) ---
        gs.dice[act.dieIdx].rolling = false; // 先清標記
        
        setTimeout(() => {
            gs.dice[act.dieIdx].v = act.val;
            gs.dice[act.dieIdx].u = false;      // 確保重骰後是彩色的
            gs.dice[act.dieIdx].rolling = true; // 啟動旋轉
            window.UIRender.renderBattle();

            setTimeout(() => {
                if (gs && gs.dice && gs.dice[act.dieIdx]) {
                    gs.dice[act.dieIdx].rolling = false;
                    window.UIRender.renderBattle();
                }
            }, 550);
        }, 10);
    
    } else if (act.source === 'split' && act.splitDice) {
        // 分裂符文：直接替換整個骰子陣列
        gs.dice = act.splitDice;
        window.UIRender.renderBattle();
    } else {
        // --- ⚔️ 一般配件投入邏輯 (變灰色鎖定) ---
        if (act.val) gs.dice[act.dieIdx].v = act.val;
        gs.dice[act.dieIdx].u = true; // 配件用掉了，變灰色

        // 處理配件帳本 (Stored)
        if (!gs.enemyStored[acc.id]) gs.enemyStored[acc.id] = [];
        gs.enemyStored[acc.id].push(gs.dice[act.dieIdx].v);

        // medal 特殊：需要收集 6 種不同點數，不用 count
        const totalNeeded = acc.id === 'medal' 
            ? acc.trigger.faces.length 
            : (acc.trigger?.count || (acc.trigger?.faces ? acc.trigger.faces.length : 0));
        

        // ⚡ 獎章特殊處理
         if (acc.id === 'medal' && gs.enemyStored[acc.id].length >= totalNeeded) {
            gs.enemyMedalRounds = (gs.enemyMedalRounds || 0) + 1;
            gs.enemyStored[acc.id] = [];
            if (gs.enemyMedalRounds >= 2) {
                // 讓 checkWin 走正規流程，reason 會正確帶 'medal'
                if (window.GameController) window.GameController.checkWin();
            }
        }
        // ⚡ 其他配件觸發
        else if (gs.enemyStored[acc.id].length >= totalNeeded) {
            acc.effect(gs, 'enemy');
            gs.enemyStored[acc.id] = [];
        }

        // 標記本回合已使用
        if (!gs.enemyUsedAccs) gs.enemyUsedAccs = [];
        if (!gs.enemyUsedAccs.includes(act.accId)) {
            gs.enemyUsedAccs.push(act.accId);
        }
        
        window.UIRender.renderBattle();
    }
},

    // 3. 📡 對手發動了行動卡技能 (攻擊或治療)
    useCard: (act) => {
    const isMe = (act.actor === myRole);

    // 1. 能量消耗与翻面（只针对对手）
    if (!isMe) {
        const max = gs.enemyFace === 'A' ? 8 : 24;
        gs.enemyPts = Math.max(0, (gs.enemyPts || 0) - max);
        gs.enemyFace = gs.enemyFace === 'A' ? 'B' : 'A';
        gs.enemyFlipCount = act.flipCount;

        // 触发对手的翻片事件（例如能量风暴）
        triggerEvent('playerFlip', 'enemy', gs.enemyFlipCount);
        triggerEvent('playerUseCard', 'enemy');
       }

    // 2. 执行伤害/治疗（会触发反甲、不死鸟等广播）
    if (act.cardType === 'atk') {
        const target = isMe ? 'enemy' : 'player';
        FX.damage(gs, target, 1, isMe ? "🃏 行動卡攻擊" : "📡 對手行動卡攻擊");
        if(isMe) gs.statAtk++; else gs.enemyStatAtk++;
    } else {
        const healTarget = isMe ? 'player' : 'enemy';
        FX.heal(gs, healTarget, 1, isMe ? "💚 行動卡治療" : "📡 對手行動卡治療");
        if(isMe) gs.statHeal++; else gs.enemyStatHeal++;
    }
},

    // 4. 📡 對手後悔了，從配件收回骰子
    refundAcc: (act) => {
      const accId = act.accId;
      const ledger = gs.enemyStored; // 操作對手的帳本
      const stored = ledger[accId] || [];

      // 把那些對手用掉的骰子變回彩色 (可用狀態)
      stored.forEach(val => {
        const target = gs.dice.find(d => d.u && d.v === val);
        if (target) target.u = false;
      });

      ledger[accId] = []; // 清空該配件帳本
      window.UIRender.log(`📡 對手從 ${ACCESSORIES.find(a=>a.id===accId).name} 收回了骰子`, 'system');
    },

    // 5. 📡 對手結束回合，強制清理
      clearAccs: (act) => {
      // 同步對手回合結束時的最終點數（含預言水晶等被動加點）
      if (act.finalPts !== undefined) {
        gs.enemyPts = act.finalPts;
        console.log('收到 finalPts:', act.finalPts, '更新 enemyPts 前:', gs.enemyPts);
      }
      if (gs.enemyStored) {
        Object.keys(gs.enemyStored).forEach(id => {
          const acc = ACCESSORIES.find(a => a.id === id);
          if (!acc || !acc.keepStored) {
            gs.enemyStored[id] = [];
          }
        });
      }
      window.UIRender.log(`📡 對手未使用的能量已消散`, 'system');
     },



// 在 BattleCommander.actions 对象内（约在 BattleCommander 定义处）
steal: (act) => {
    const amount = act.amount;
    if (act.victim === window.myRole) {
        // 廣播者說「我被偷了」→ 對我來說「對手被偷了，我獲益」
        gs.enemyPts = Math.max(0, (gs.enemyPts || 0) - amount);
        gs.pts = (gs.pts || 0) + amount;
        if (window.UIRender) {
            window.UIRender.log(`📡 你的反甲奪取了對手 ${amount} 點能量！`, 'good');
            window.UIRender.floatAt(`+${amount}`, document.getElementById('myCard'), 'pts');
        }
    } else {
        // 廣播者說「對手被偷了」→ 對我來說「我被偷了」
        gs.pts = Math.max(0, (gs.pts || 0) - amount);
        gs.enemyPts = (gs.enemyPts || 0) + amount;
        if (window.UIRender) {
            window.UIRender.log(`📡 對手反甲奪取了你 ${amount} 點能量！`, 'bad');
            window.UIRender.floatAt(`-${amount}`, document.getElementById('myCard'), 'pts');
        }
    }
    if (window.UIRender) {
        window.UIRender.updateCtrl();
        window.UIRender.renderBattle();
    }
},
revive: (act) => {
    const who = act.who;
    if (act.who === window.myRole) {
    gs.hp = 1;
    gs.playerPhoenixUsed = true;
    } else {
    gs.dummyHp = 1;
    gs.enemyPhoenixUsed = true;
    }
    if (window.UIRender) {
        window.UIRender.log(`📡 對手的不死鳥羽毛發動，${who === 'player' ? '你' : '对手'} 复活了！`, 'spec');
    }
    window.UIRender.renderBattle();
},

},
  // 接收總調度：外部只要傳入 act，我會自動找對應的 actions 執行
dispatch: (act) => {
    if (BattleCommander.actions[act.type]) {
        BattleCommander.actions[act.type](act);
        window.UIRender.renderBattle();
    }
}
};







// game-controller.js - 遊戲中樞：負責同步、渲染與勝負判定
window.GameController = {
  
  // 📢 廣播塔：當任何數據變動時，統一由這裡發報
  dispatchUpdate: function() {
    // 1. 立即刷新本地畫面
    if (window.UIRender) window.UIRender.renderBattle();

    // 2. 外交廣播（只有當前回合玩家才同步）
    if (window.isOnlineMode && window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
      window.syncBattle({
        hp: gs.hp,
        dummyHp: gs.dummyHp,
        pts: gs.pts || 0,
        enemyPts: gs.enemyPts || 0,
        statAtk: gs.statAtk,
        statHeal: gs.statHeal,
        enemyStatAtk: gs.enemyStatAtk,
        enemyStatHeal: gs.enemyStatHeal,
        medalRounds: gs.medalRounds || 0,
        enemyMedalRounds: gs.enemyMedalRounds || 0,
        flipCount: gs.flipCount || 0,
        enemyFlipCount: gs.enemyFlipCount || 0,
        enemyNextDie: gs.enemyNextDie || null
      });
    }

    // 3. 呼叫裁判
    this.checkWin();
  },

  // ⚖️ 裁判：掃描所有獲勝條件
  checkWin: function() {
    if (!gs || gs.isGameOver) return;
    

     // ⚡ 核心拦截：检查不死鸟是否应该阻止胜利
    if (gs.dummyHp <= 0) {
        const hasPhoenix = gs.enemyLoadout?.includes('phoenix');
        if (hasPhoenix && !gs.enemyPhoenixUsed) {
            // 等待 damage 中的不死鸟逻辑执行并广播 revive
            return;
        }
    }
    if (gs.hp <= 0) {
        const hasPhoenix = gs.loadout?.includes('phoenix');
        if (hasPhoenix && !gs.playerPhoenixUsed) {
            return;
        }
    }






    let winner = null;
    let reason = 'hp';

    // 血量歸零
    if (gs.dummyHp <= 0)      { winner = 'dummy'; reason = 'hp'; }
    else if (gs.hp <= 0)       { winner = 'lose';  reason = 'hp'; }
    
    // 榮譽獎章（集齊2輪）
    else if (gs.medalRounds >= 2)      { winner = 'dummy'; reason = 'medal'; }
    else if (gs.enemyMedalRounds >= 2) { winner = 'lose';  reason = 'medal'; }
    
    // 無限翻轉（翻轉10次）
    // 注意：flipCount 是「你」的翻轉次數，達到10次你贏
   else if (gs.flipCount >= 10 && gs.loadout?.includes('infinite'))      { winner = 'dummy'; reason = 'flip'; }
else if (gs.enemyFlipCount >= 10 && gs.enemyLoadout?.includes('infinite')) { winner = 'lose';  reason = 'flip'; }
    if (winner) {
      gs.isGameOver = true;
      if (window.UIRender) window.UIRender.renderBattle(); // 補回立即渲染
      // 最後一刻同步，確保兩邊跳結算
      if (window.isOnlineMode && window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
        window.syncBattle({ 
          status: 'game-over', 
          winner: winner === 'dummy' ? window.myRole : (window.myRole === 'host' ? 'guest' : 'host'),
          reason: reason,
          // 補回這些欄位，確保對手同步
      hp: gs.hp,
      dummyHp: gs.dummyHp,
      medalRounds: gs.medalRounds || 0,
      enemyMedalRounds: gs.enemyMedalRounds || 0
        });
      }
      
     setTimeout(() => {
        if (!window.endBattle) return;
        const isOnline = window.isOnlineMode && window.isOnlineMode();
        if (isOnline) {
          const pvpReason = winner === 'dummy'
            ? (reason === 'medal' ? 'medal-win' : reason === 'flip' ? 'flip-win' : 'win')
            : (reason === 'medal' ? 'medal-loss' : reason === 'flip' ? 'flip-loss' : 'lose');
          window.endBattle(pvpReason);
        } else {
          window.endBattle(winner);
        }
      }, 600);
    }
  }
};
