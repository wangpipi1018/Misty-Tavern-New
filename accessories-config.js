// accessories-config.js - 完整積木配方表 (含 UI 說明)
window.ACCESSORIES = [
  {
    id: 'sword',
    name: '魔劍',
    icon: '⚔',
    rarity: 3,
    type: 'active',
    req: '⚀ + ⚅',
    desc: '消耗骰子 1 與 6，對對手造成 2 點傷害。',
    trigger: { type: 'consume', faces: [1, 6] },
    effect: (gs, who) => {
      const target = (who === 'player') ? 'enemy' : 'player';
      FX.damage(gs, target, 2, "⚔️ 魔劍攻擊");
      if(who === 'player') gs.statAtk++; else gs.enemyStatAtk = (gs.enemyStatAtk || 0) + 1;
    }
  },
  {
    id: 'mirror',
    name: '複製魔鏡',
    icon: '🪞',
    rarity: 3,
    type: 'active',
    req: '⚅',
    desc: '消耗骰子 6，下回合多擲 2 顆骰子。',
    trigger: { type: 'consume', faces: [6] },
    effect: (gs, who) => FX.addDice(gs, who, 2)
  },
  {
    id: 'clock',
    name: '逆行鬧鐘',
    icon: '⏰',
    rarity: 4,
    type: 'active',
    req: '任意 1 顆',
    desc: '消耗任意 1 顆骰子，重擲得到新骰子。(每回合限一次)',
    trigger: { 
      type: 'consume', faces: [1,2,3,4,5,6], count: 1,
      check: (gs) => !gs.usedAccs?.includes('clock')
    },
    effect: (gs, who, dropIdx) => FX.rerollDie(gs, dropIdx)
  },
  {
    id: 'splitter', 
    name: '分裂符文', 
    icon: '☄', 
    rarity: 5,
    type: 'active', 
    req: '偶數骰子',
    desc: '消耗一顆偶數骰子，將其分裂為兩顆該點數一半的骰子。(每回合限一次)',
    trigger: { 
      type: 'consume', faces: [2, 4, 6], count: 1,
      check: (gs) => !gs.usedAccs?.includes('splitter')
    },
    effect: (gs, who, dropIdx, aiDice) => {
      const dicePool = (who === 'player') ? gs.dice : aiDice;
      FX.splitDie(gs, dicePool, dropIdx, who);
    }
  },
  {
    id: 'shoes',
    name: '疾走鞋',
    icon: '👟',
    rarity: 1,
    type: 'passive',
    req: '每回合開始',
    desc: '每回合開始時，行動卡自動 +1 點。',
    on: {
      playerTurnStart: (gs, actor) => FX.addPts(gs, actor, 1, "👟 疾走鞋加速")
    }
  },
  {
    id: 'tentacle',
    name: '觸手',
    icon: '🐙',
    rarity: 2,
    type: 'passive',
    req: '每擲出 ⚀',
    desc: '回合開始時，每擲出一顆點數 1 的骰子，行動卡自動 +3 點。',
    on: {
      playerDieRolled: (gs, actor, val) => {
        if(val === 1) FX.addPts(gs, actor, 3, "🐙 觸手感應");
      }
    }
  },
  {
    id: 'infinite',
    name: '無限翻轉',
    icon: '🔄',
    rarity: 5,
    type: 'passive',
    req: '翻轉 10 次',
    desc: '當你的行動卡翻轉次數達到 10 次時，直接獲得勝利！',
    on: {
      playerFlip: (gs, target, flipCount) => {
       if (window.UIRender && flipCount >= 7) {
      window.UIRender.log(`🔄 翻轉能量即將臨界...(${flipCount}/10)`, 'spec');
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
    req: '⚁',
    desc: '消耗骰子 2，強制將對手的行動卡翻面。',
    trigger: { type: 'consume', faces: [2] },
    effect: (gs, who) => {
      const target = (who === 'player') ? 'enemy' : 'player';
      FX.flipCard(gs, target);
      if (window.triggerEvent) window.triggerEvent('playerFlip', target, (target === 'player' ? gs.flipCount : gs.enemyFlipCount));
    }
  },
  {
    id: 'order_book',
    name: '秩序之書',
    icon: '📖',
    rarity: 3,
    type: 'active',
    req: '⚀ + ⚃',
    desc: '消耗骰子 1 與 4，將自己的行動卡翻面，並獲得 3 點能量。',
    trigger: { type: 'consume', faces: [1, 4] },
    effect: (gs, who) => {
      FX.flipCard(gs, who);
      FX.addPts(gs, who, 3, "📖 秩序加持");
      if (window.triggerEvent) window.triggerEvent('playerFlip', who, (who === 'player' ? gs.flipCount : gs.enemyFlipCount));
    }
  },
  {
    id: 'bomb',
    name: '炸彈',
    icon: '💣',
    rarity: 3,
    type: 'active',
    req: '⚂ + ⚂',
    desc: '消耗兩顆點數 3 的骰子，對對手造成 2 點傷害。',
    trigger: { type: 'consume', faces: [3, 3] },
    effect: (gs, who) => {
      const target = (who === 'player') ? 'enemy' : 'player';
      FX.damage(gs, target, 2, "💣 炸彈爆炸");
      if (who === 'player') gs.statAtk++; else gs.enemyStatAtk = (gs.enemyStatAtk || 0) + 1;
    }
  },
  {
    id: 'crystal',
    name: '預言水晶',
    icon: '🔮',
    rarity: 2,
    type: 'passive',
    req: '4 的倍數',
    desc: '回合結束時，若行動卡點數為 4 的倍數，自動 +3 點。',
    on: {
      playerTurnEnd: (gs, actor) => {
        const currentPts = (actor === 'player') ? gs.pts : gs.enemyPts;
        if (currentPts > 0 && currentPts % 4 === 0) FX.addPts(gs, actor, 3, "🔮 預言達成");
      }
    }
  },
  {
    id: 'medal',
    name: '榮譽獎章',
    icon: '🏅',
    rarity: 5,
    keepStored: true,
    noRefund: true,
    req: '收集 ⚀ ~ ⚅ 兩輪',
    desc: '收集全部 6 種點數完成一輪。集齊兩輪直接獲勝！',
    trigger: {
      type: 'consume', faces: [1, 2, 3, 4, 5, 6], count: 1,
      check: (gs, die, who) => {
        const stored = (who === 'player' ? gs.playerStored : gs.enemyStored)['medal'] || [];
        return !stored.includes(die.v);
      }
    },
    effect: (gs, who) => {
     if (window.UIRender) window.UIRender.log("🏅 獎章刻印完成...", "spec");
    }
  },
  {
    id: 'thorns',
    name: '荊棘反甲',
    icon: '🛡️',
    rarity: 3,
    type: 'passive',
    req: '受傷時',
    desc: '每受到 1 點傷害，偷取對手 6 點行動卡點數。',
    on: {
      playerTakeDamage: (gs, victim, dmg) => FX.stealPts(gs, victim, dmg * 6, "🛡️ 荊棘反甲")
    }
  },
  {
    id: 'fate',
    name: '命運干擾',
    icon: '🎭',
    rarity: 4,
    type: 'active',
    req: '任意 1 顆',
    desc: '消耗一顆骰子，指定對手下回合第一顆骰子必為該點數。',
    trigger: { type: 'consume', faces: [1,2,3,4,5,6], count: 1, check: (gs) => !gs.usedAccs?.includes('fate') },
    effect: (gs, who, dropIdx) => {
      const val = gs.dice[dropIdx]?.v || 1;
      FX.setFate(gs, (who === 'player' ? 'enemy' : 'player'), val);
    }
  },
  {
    id: 'knife',
    name: '小刀',
    icon: '🔪',
    rarity: 1,
    type: 'active',
    req: '⚀ + ⚁',
    desc: '消耗骰子 1 與 2，造成 1 點傷害。',
    trigger: { type: 'consume', faces: [1, 2], count: 2 },
    effect: (gs, who) => {
      const target = (who === 'player') ? 'enemy' : 'player';
      FX.damage(gs, target, 1, "🔪 小刀切割");
      if (who === 'player') gs.statAtk++;
    }
  },
  {
    id: 'storm',
    name: '能量風暴',
    icon: '🌪️',
    rarity: 3,
    type: 'passive',
    req: '翻轉行動卡時',
    desc: '每當你發動行動卡，清空對手的行動卡點數。',
    on: {
      playerFlip: (gs, actor) => {
        const target = (actor === 'player') ? 'enemy' : 'player';
        FX.clearPts(gs, target);
      }
    }
  },
  {
    id: 'phoenix',
    name: '不死鳥羽毛',
    icon: '🐦‍🔥',
    rarity: 5,
    type: 'passive',
    req: '致命傷',
    desc: '當血量歸零時，恢復至 1 點血量（每場戰鬥限一次）。',
    on: {
      playerDeath: (gs, victim) => {
        const usedKey = victim === 'player' ? 'playerPhoenixUsed' : 'enemyPhoenixUsed';
        if (!gs[usedKey]) {
          if (victim === 'player') gs.hp = 1; else gs.dummyHp = 1;
          gs[usedKey] = true;
          if (window.UIRender) window.UIRender.log(`✨ ${victim === 'player' ? '你' : '對手'} 重生了！`, 'spec');
          return true;
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
    req: '⚂',
    desc: '消耗骰子 3，下回合多擲 1 顆骰子。',
    trigger: { type: 'consume', faces: [3], count: 1 },
    effect: (gs, who) => FX.addDice(gs, who, 1)
  },
  {
    id: 'reaction',
    name: '應激反應',
    icon: '⚡',
    rarity: 2,
    type: 'passive',
    req: '受傷時',
    desc: '每當對手發動攻擊，你的下回合多擲 2 顆骰子。',
    on: {
      playerTakeDamage: (gs, victim) => {
        if (victim === 'player') FX.addDice(gs, 'player', 2);
      }
    }
  },
  {
    id: 'clover',
    name: '幸運草',
    icon: '🍀',
    rarity: 5,
    type: 'passive',
    desc: '四葉幸運草，據說能帶來好運。',
    on: {}
  }
];

window.CATEGORIES = [
  { label: '⚔ 主動配件', ids: ['match','sword','knife', 'mirror', 'clock', 'bomb', 'splitter', 'medal', 'fate', 'chaos_mirror', 'order_book'] },
  { label: '✨ 被動配件', ids: ['shoes','storm','clover','reaction', 'tentacle', 'crystal', 'thorns', 'phoenix', 'infinite'] }
];