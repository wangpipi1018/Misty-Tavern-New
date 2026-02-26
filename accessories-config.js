
// ─────────────────────────────────────────
//  ACCESSORY DEFINITIONS (配件定義)
// ─────────────────────────────────────────
// 此檔案為配件設定，所有效果皆呼叫 window.FX (battle-fx.js) 來執行動作。

const ACCESSORIES = [
 {
    id: 'sword',
    name: '魔劍',
    icon: '⚔',
    rarity: 3,
    type: 'active',
    req: '⚀ + ⚅（1 + 6）',
    desc: '消耗骰子1與6，對對手造成2點傷害。',

    trigger: {
      type: 'consume',
      faces: [1, 6]
    },
    onStore: (v) => log(`📥 魔劍正在吸收點數 ${FACES[v-1]} 的能量...`, 'system'),
   effect: (gs, who) => {
    // ⚡ 核心修正：
      // 如果 who 是 'player' (我自己)，目標就是 'enemy' (我的對手)
      // 如果 who 是 'enemy' (對手)，目標就是 'player' (我自己)
      const target = (who === 'player') ? 'enemy' : 'player';
      const label = (who === 'player') ? "⚔️ 魔劍攻擊" : "📡 對手魔劍";
      FX.damage(gs, target, 2, label);
    // 統計數據也要分開
      if(who === 'player') gs.statAtk++;
      else gs.enemyStatAtk = (gs.enemyStatAtk || 0) + 1;
    
   
  }
  },
    
  {
    id: 'mirror',
    name: '複製魔鏡',
    icon: '🪞',
    rarity: 3,
    type: 'active',
    req: '⚅（點數6）',
    desc: '消耗骰子6，下回合多擲2顆骰子。',
    
    trigger: {
      type: 'consume',
      faces: [6]
    },
    
    effect: (gs, who) => {
      FX.addDice(gs, who, 2);
      // ⚡ 必加同步
    if (who === 'player' && isOnlineMode()) syncBattle({ bonusDice: gs.bonusDice });
    }
  },

  {
    id: 'clock',
    name: '逆行鬧鐘',
    icon: '⏰',
    rarity: 4,
    type: 'active',
    req: '任意 1 顆骰子 (每回合限一次)',
    desc: '消耗任意1顆骰子，重擲得到新骰子。(每回合限一次)',
    trigger: {
      type: 'consume',
      faces: [1,2,3,4,5,6],
      count: 1,
      // 核心修正：檢查這回合是否已經用過 (我們把資料存在 gs.usedAccs 裡)
      check: (gs) => !gs.usedAccs?.includes('clock')
    },
   effect: (gs, who, dropIdx) => {
        const targetDie = gs.dice[dropIdx];
        if (!targetDie) return;
        
        const oldVal = targetDie.v;
        const newVal = rand(1, 6);
        
        // ✨ 本地邏輯保持不變
        targetDie.rolling = true;
        targetDie.v = newVal;
        targetDie.u = false;
        
        renderBattle();

        // 🛡️ 這裡開始進化：改用中控發射器
        if (who === 'player' && isOnlineMode()) {
            // 一行解決！不需要再寫 .then() 或管 Firebase 路徑
            syncOnlineAction('useDieOnAcc', {
                accId: 'clock',
                dieIdx: dropIdx,
                val: newVal,
                source: 'reroll'
            });
        }
    }},
  
{
    id: 'splitter', 
    name: '分裂符文', 
    icon: '☄', 
    rarity: 5,
    type: 'active', 
    req: '偶數骰子 (每回合限一次)',
    desc: '消耗一顆偶數骰子，將其分裂為兩顆該點數一半的骰子。(每回合限一次)',
    trigger: {
      type: 'consume',
      faces: [2, 4, 6], // 只能用偶數
      count: 1,
      // 核心限制：必須是偶數且這回合沒用過
      check: (gs) => !gs.usedAccs?.includes('splitter')
    },
  effect: (gs, who, dropIdx, aiDice) => {
      if (who === 'player') {
        // 1. 執行本地分裂邏輯
        FX.splitDie(gs, gs.dice, dropIdx, 'player');

        // 2. ⚡ 啟動視覺動畫：分裂後的最後兩顆骰子設為旋轉
        const len = gs.dice.length;
        if(gs.dice[len-1]) gs.dice[len-1].rolling = true;
        if(gs.dice[len-2]) gs.dice[len-2].rolling = true;
        renderBattle();

        // 3. ⚡ 聯網廣播：發送動作通知 + 同步新骰子堆
        if (typeof isOnlineMode === 'function' && isOnlineMode()) {
            // 發送「發動配件」的日誌訊息給對手
            syncOnlineAction('useDieOnAcc', {
                accId: 'splitter',
                dieIdx: dropIdx,
                source: 'split'
            });
            
            // 同步最新的骰子陣列
            syncBattle({ 
                lastDice: gs.dice, 
                diceActionId: Math.random() 
            });
        }
        
        // 4. ⚡ 550ms 後停止旋轉並定格點數
        setTimeout(() => {
            if (gs && gs.dice) {
                gs.dice.forEach(d => { if(d) d.rolling = false; });
                renderBattle();
            }
        }, 550);

      } else {
        // AI 或是對手透過 BattleCommander 呼叫時的處理
        FX.splitDie(gs, aiDice, dropIdx, 'enemy');
      }
    }
  },

 {
  id: 'shoes',
  name: '疾走鞋',
  icon: '👟',
  rarity: 1,
  type: 'passive',
  req: '每回合擲骰前',
  desc: '每回合開始時，行動卡自動 +1 點。',
  on: {
    playerTurnStart: (gs, actor) => {
      FX.addPts(gs, actor, 1);
      const label = (actor === 'player') ? '👤 你' : '🤖 對手';
      const logColor = (actor === 'player') ? 'good' : 'bad';
      log(`👟 ${label} 的疾走鞋：行動卡 +1`, logColor);
      
      // ⚡ 核心修正：如果是我的回合，同步最新的行動卡點數給對手
      if (actor === 'player' && typeof isOnlineMode === 'function' && isOnlineMode()) {
        syncBattle({ pts: gs.pts });
      }
    } // 👈 結束 playerTurnStart 函式
  }   // 👈 結束 on 物件 (你剛才漏掉這一個)
},
  
{
  id: 'tentacle',
  name: '觸手',
  icon: '🐙',
  rarity: 2,
  type: 'passive',
  req: '每擲出⚀',
  desc: '回合開始時擲骰，每擲出一顆點數 1 的骰子，行動卡自動 +3 點。',
  on: {
     playerDieRolled: function(gs, actor, val, source) {
      if(val === 1) {
        if(actor === 'player') {
          gs.pts = (gs.pts || 0) + 3;
          floatAt(`+3`, document.getElementById('myCard'), 'pts');
          // ⚡ 必加同步
  if (isOnlineMode()) syncBattle({ pts: gs.pts });
        } else {
          gs.enemyPts += 3;
          const enemyCardWrap = document.querySelector('.card-wrap:last-child .action-card');
          if(enemyCardWrap) floatAt(`+3`, enemyCardWrap, 'pts');
        }
        const label = (actor === 'player') ? '👤 你' : '🤖 對手';
        const logColor = (actor === 'player') ? 'good' : 'bad';
        log(`🐙 ${label} 的觸手感應到點數 1，行動卡 +3 點！`, logColor);
        renderCard();
      }
    }
    }
  },
{
    id: 'infinite',
    name: '無限翻轉',
    icon: '🔄',
    rarity: 5,
    type: 'passive',
    req: '行動卡翻轉累計 10 次',
    desc: '當你的行動卡翻轉次數達到 10 次時，直接獲得勝利！',
    
   on: {
    playerFlip: (gs, target, flipCount) => {
      // target 是卡片的擁有者
      if (flipCount >= 10) {
        // ⚡ 修正：只要是「我的卡」達到 10 次，不論是誰翻的，都由我來宣告勝利
        if (target === 'player') {
          if (isOnlineMode()) {
            syncBattle({ 
              status: 'game-over',
              winner: myRole, // 我是這張卡的主人，我贏了
              reason: 'flip',
              timestamp: Date.now() 
            });
          }
          endBattle('flip'); // 本地立即結算
        } else {
          // 如果是對手的卡達到 10 次，我們不需要發同步（由他自己發），我們只在本地等結算
          // 或是保險起見也呼叫 endBattle
          console.log("🔄 對手達成無限翻轉，等待結算同步...");
        }
      }
    }
  }
},
  

 {
    id: 'chaos_mirror',
    name: '混沌之鏡',
    icon: '🪞',
    rarity: 3,
    type: 'active',
    req: ' ⚁ （2）',
    desc: '消耗骰子2，強制將對手的行動卡翻面。',
    
    trigger: {
      type: 'consume',
      faces: [2]
    },
    
    effect: (gs, who) => {
      const target = (who === 'player') ? 'enemy' : 'player';
      
      if (target === 'enemy') {
        gs.enemyFace = gs.enemyFace === 'A' ? 'B' : 'A';
        gs.enemyFlipCount = (gs.enemyFlipCount || 0) + 1;
        log(`🪞 混沌之鏡：對手的行動卡被翻面了！`, 'bad');
        // 在 effect 裡面執行完翻轉與加點後加入：
  if (isOnlineMode()) {
  syncBattle({ 
    pts: gs.pts, enemyPts: gs.enemyPts,
    face: gs.face, enemyFace: gs.enemyFace,
    flipCount: gs.flipCount, enemyFlipCount: gs.enemyFlipCount
  });
}
      } else {
        gs.face = gs.face === 'A' ? 'B' : 'A';
        gs.flipCount = (gs.flipCount || 0) + 1;
        log(`🪞 混沌之鏡：你的行動卡被翻面了！`, 'bad');
      }
      
      triggerEvent('playerFlip', target, (target === 'player' ? gs.flipCount : gs.enemyFlipCount));
    }
  },
  
  {
    id: 'order_book',
    name: '秩序之書',
    icon: '📖',
    rarity: 3,
    type: 'active',
    req: '⚀ + ⚃（1+4）',
    desc: '消耗骰子1、4，將自己的行動卡翻面，並獲得 3 點能量。',
    
    trigger: {
      type: 'consume',
      faces: [1, 4]
    },
    
    effect: (gs, who) => {
      if (who === 'player') {
        gs.face = gs.face === 'A' ? 'B' : 'A';
        gs.flipCount = (gs.flipCount || 0) + 1;
        gs.pts += 3;
        // 在 effect 裡面執行完翻轉與加點後加入：
if (isOnlineMode()) {
  syncBattle({ 
    pts: gs.pts, enemyPts: gs.enemyPts,
    face: gs.face, enemyFace: gs.enemyFace,
    flipCount: gs.flipCount, enemyFlipCount: gs.enemyFlipCount
  });
}
        log(`📖 秩序之書：你的行動卡翻面，並獲得 3 點能量！`, 'good');
      } else {
        gs.enemyFace = gs.enemyFace === 'A' ? 'B' : 'A';
        gs.enemyFlipCount = (gs.enemyFlipCount || 0) + 1;
        gs.enemyPts += 3;
        log(`📖 秩序之書：對手的行動卡翻面，並獲得 3 點能量！`, 'bad');
      }
      
      triggerEvent('playerFlip', who, (who === 'player' ? gs.flipCount : gs.enemyFlipCount));
    }
  },

  {
    id: 'bomb',
    name: '炸彈',
    icon: '💣',
    rarity: 3,
    type: 'active',
    req: '⚂ + ⚂（兩顆3）',
    desc: '消耗兩顆點數3的骰子，對對手造成2點傷害。',
    
    trigger: {
      type: 'consume',
      faces: [3, 3]
    },
    
    effect: (gs, who) => {
    const target = (who === 'player') ? 'enemy' : 'player';
    FX.damage(gs, target, 2, who === 'player' ? "💣 炸彈爆炸" : "📡 對手炸彈");
    if (who === 'player') {
        gs.statAtk++;
      } else {
        // 確保對手數據也正確增加
        gs.enemyStatAtk = (gs.enemyStatAtk || 0) + 1;
      }

  }
  },
  {
    id: 'clover',
    name: '幸運草',
    icon: '🍀',
    rarity: 5,
    type: 'passive',
    req: '裝飾用',
    desc: '四葉幸運草，據說能帶來好運。',
    on: {}  // ⚡ 沒有任何效果，純裝飾
},
  {
    id: 'crystal',
    name: '預言水晶',
    icon: '🔮',
    rarity: 2,
    type: 'passive',
    req: '回合結束時（4的倍數）',
    desc: '回合結束時，若行動卡點數為 4 的倍數，自動 +3 點。',
    
    on: {
      playerTurnEnd: (gs, actor) => {
        const currentPts = (actor === 'player') ? gs.pts : gs.enemyPts;
        if (currentPts > 0 && currentPts % 4 === 0) {
          FX.addPts(gs, actor, 3);
          log(`🔮 ... +3 點！`, 'good');
          
          // ✅ 只有真的發動效果時，才同步給對手
          if (actor === 'player' && isOnlineMode()) {
            syncBattle({ pts: gs.pts });
          }
      }
    }
  }
  },

{
    id: 'medal',
    name: '榮譽獎章',
    icon: '🏅',
    rarity: 5,
    type: 'active',
    req: '收集 ⚀ ~ ⚅ 兩輪',
    desc: '收集全部 6 種點數完成一輪。集齊兩輪直接獲勝！(骰子不能收回)',
    keepStored: true,
    noRefund: true,
    syncRounds: true,  // ⚡ 新增：需要同步 medalRounds
    
    trigger: {
        type: 'consume',
        faces: [1, 2, 3, 4, 5, 6],
        count: 1,
        check: (gs, die, who) => {
           // ⚡ 加個安全判斷
            if (!die || !die.v) {
                console.warn('獎章 check: die 不存在', die);
                return false;
            }
            const ledger = (who === 'player') ? gs.playerStored : gs.enemyStored;
            const stored = ledger['medal'] || [];
            return !stored.includes(die.v);
        }
    },
    
effect: (gs, who, dropIdx) => {
        // 1. 取得當前輪數
        const rounds = (who === 'player') ? gs.medalRounds : gs.enemyMedalRounds;
        
        // 2. 判斷是否集齊兩輪
        if (rounds >= 2) {
            const label = (who === 'player') ? '你' : '對手';
            const logColor = (who === 'player') ? 'good' : 'bad';
            if (window.log) window.log(`🏅 ${label} 的獎章光芒萬丈！贏得勝利！`, logColor);

            // ⚡ 核心修正：只有「達成者」發送最後的制勝同步
            if (who === 'player' && typeof isOnlineMode === 'function' && isOnlineMode()) {
                window.syncBattle({ 
                    // 關鍵：同步最後的輪數與血量，讓對手死得明白
                    hp: gs.hp,
                    dummyHp: gs.dummyHp,
                    medalRounds: gs.medalRounds, 
                    status: 'game-over', 
                    winner: myRole, 
                    reason: 'medal', 
                    timestamp: Date.now() 
                });
            }
            
            // 本地執行結束動畫
            setTimeout(() => {
                if (typeof endBattle === 'function') {
                    // 如果是你達成，叫 dummy 贏；如果是對手達成，叫 lose
                    endBattle(who === 'player' ? 'dummy' : 'medal-loss');
                }
            }, 1000);
        }
    }
},
{
    id: 'thorns',
    name: '荊棘反甲',
    icon: '🛡️',
    rarity: 3,
    type: 'passive',
    req: '受到傷害時',
    desc: '每受到 1 點傷害，偷取對手 6 點行動卡點數。',
    on: {
      playerTakeDamage: (gs, victim, dmg) => {  
        window.FX.stealPts(gs, victim, dmg * 6, "🛡️ 荊棘反甲");
}
    }
},
 {
    id: 'fate',
    name: '命運干擾',
    icon: '🎭',
    rarity: 4,
    type: 'active',
    req: '任意骰子(每回合限一次)',
    desc: '消耗一顆骰子，指定對手下回合第一顆骰子必為該點數。(每回合限一次)',
    trigger: { type: 'consume', faces: [1,2,3,4,5,6], count: 1, check: (gs) => !gs.usedAccs?.includes('fate') },
    effect: (gs, who, dropIdx) => {
    let val = (dropIdx !== undefined && gs.dice[dropIdx]) ? gs.dice[dropIdx].v : 1;
    if (!gs.usedAccs) gs.usedAccs = [];
    gs.usedAccs.push('fate');

    // 呼叫新家的 setFate，由它負責同步 enemyNextDie
    window.FX.setFate(gs, (who === 'player' ? 'enemy' : 'player'), val);
}
  },
  {
    id: 'knife',
    name: '小刀',
    icon: '🔪',
    rarity: 1,
    type: 'active',
    req: '⚀ + ⚁ (1+2)',
    desc: '消耗骰子1+2，造成 1 點傷害。',
    
    trigger: {
        type: 'consume',
        faces: [1, 2],
        count: 2
    },
    
    effect: (gs, who) => {
        const target = (who === 'player') ? 'enemy' : 'player';
        FX.damage(gs, target, 1, who === 'player' ? "🔪 小刀" : "📡 對手小刀");
        if (who === 'player') gs.statAtk++;
    }
},
{
    id: 'storm',
    name: '能量風暴',
    icon: '🌪️',
    rarity: 3,
    type: 'passive',
    req: '使用行動卡時',
    desc: '每當你發動行動卡（攻擊或治療），清空對手的行動卡點數。',
    
    on: {
        playerFlip: (gs, actor, flipCount) => {
            if (actor === 'player') {
                // 我發動行動卡，清空對手點數
                const oldPts = gs.enemyPts || 0;
                if (oldPts > 0) {
                    gs.enemyPts = 0;
                    log(`🌪️ 能量風暴：對手的 ${oldPts} 點能量被清空了！`, 'good');
                    
                    // 連線模式同步
                    syncBattle({ enemyPts: 0 });
                    
                    // 視覺效果
                    const enemyCardWrap = document.querySelector('.card-wrap:last-child .action-card');
                    if (enemyCardWrap) {
                        floatAt(`-${oldPts}`, enemyCardWrap, 'pts');
                    }
                    renderBattle();
                }
            } else if (actor === 'enemy') {
                // 對手（AI）發動行動卡，清空玩家點數
                // PvP 模式下不走這裡（由 BattleCommander.useCard 負責）
                // 只有單機/PvE 的 AI 回合會進來
                if (gs.isSinglePlayer) {
                    const oldPts = gs.pts || 0;
                    if (oldPts > 0) {
                        gs.pts = 0;
                        log(`🌪️ 對手的能量風暴：你的 ${oldPts} 點能量被清空了！`, 'bad');
                        floatAt(`-${oldPts}`, document.getElementById('myCard'), 'pts');
                        renderBattle();
                    }
                }
            }
        }
    }
},
  {
  id: 'phoenix',
  name: '不死鳥羽毛',
  icon: '🐦‍🔥',
  rarity: '5',
  type: 'passive',
  req: '受到致命傷時',
  desc: '當血量歸零時，立即恢復至 1 點血量（每場戰鬥僅限一次）。',
  
  
  on: {
    playerDeath: (gs, victim) => {
      // 檢查該角色是否已經用過羽毛 (動態建立標記，如 playerPhoenixUsed)
      const usedKey = victim === 'player' ? 'playerPhoenixUsed' : 'enemyPhoenixUsed';
      
      if (!gs[usedKey]) {
        if (victim === 'player') gs.hp = 1; else gs.dummyHp = 1;
        gs[usedKey] = true;
        
        const name = victim === 'player' ? '你' : '對手';
        log(`✨ ${name} 的「不死鳥羽毛」發出紅光，重生了！`, 'spec');
        return true; // 回傳 true 給 damage 函式，攔截死亡
      }
      return false;
    }
  }
},
{
    id: 'match',
    name: '火柴',
    icon: '🔥',
    rarity: 1,
    type: 'active',
    req: '⚂ (3)',
    desc: '消耗骰子3，下回合多 1 顆骰子。',
    
    trigger: {
        type: 'consume',
        faces: [3],
        count: 1
    },
    
    effect: (gs, who) => {
        // 1. 執行本地加成
        FX.addDice(gs, who, 1);

        // ⚡ 核心修正：如果是我的回合，同步加成數值給對手
        if (who === 'player' && typeof isOnlineMode === 'function' && isOnlineMode()) {
            syncBattle({ 
                bonusDice: gs.bonusDice 
            });
        } // 👈 這是 if 的結尾
    }     // 👈 這是 effect 函式的結尾
},        // 👈 這是整個火柴物件的結尾 (你剛才漏了這個)
{
    id: 'reaction',
    name: '應激反應',
    icon: '⚡',
    rarity: 2,
    type: 'passive',
    req: '受到攻擊時',
    desc: '每當對手發動攻擊，你的下回合多擲 2 顆骰子。',
    
    on: {
        playerTakeDamage: (gs, victim, dmg) => {
            // victim 是受害者，如果是自己受傷才觸發
            if (victim === 'player') {
                // 對手攻擊我，我下回合多骰子
                gs.bonusDice = (gs.bonusDice || 0) + 2;
                log(`⚡ 應激反應：下回合 +2 顆骰子！`, 'good');
                
                // 連線模式同步 bonusDice  
                if (isOnlineMode()) {
                   syncBattle({ bonusDice: gs.bonusDice });
                }
            } else if (victim === 'enemy') {
                // 對手受傷，可能是對手有這個配件
                // 這裡不用處理，因為對手的 bonusDice 會由對手自己同步
            }
        }
    }
},

];

const CATEGORIES = [
  {
    label: '⚔ 主動配件', 
    ids: ['match','sword','knife', 'mirror', 'clock', 'bomb', 'splitter', 'medal', 'fate', 'chaos_mirror', 'order_book'] 
  },
  {
    label: '✨ 被動配件', 
    ids: ['shoes','storm','clover','reaction', 'tentacle', 'crystal', 'thorns', 'phoenix', 'infinite'] 
  }
];