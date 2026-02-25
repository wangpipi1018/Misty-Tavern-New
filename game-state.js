// ─────────────────────────────────────────
//  STATE & CONFIGURATION
// ─────────────────────────────────────────

/**
 * [Misty Tavern - Data Layer]
 * 全域數據物件 window.gs 包含以下核心屬性：
 * - 玩家狀態: hp (血量), pts (行動卡點數), face ('A'/'B' 面), dice (骰子陣列), loadout (配件ID陣列)
 * - 對手狀態: dummyHp, enemyPts, enemyFace, enemyLoadout
 * - 戰鬥統計: flipCount, enemyFlipCount, statAtk (攻擊次數)
 * - 聯網狀態: currentTurnPlayer (當前回合玩家角色名)
 */

window.loadout = [];
window.gs = {};

window.createBattleState = function(config) {
  const playerLoadout = config.loadout || [];
  const enemyLoadout  = config.enemyLoadout || [];

  // 預建 ledger，確保每個配件都有空陣列
  const playerStored = {};
  const enemyStored  = {};
  playerLoadout.forEach(id => { playerStored[id] = []; });
  enemyLoadout.forEach(id  => { enemyStored[id]  = []; });

  return {
    // 模式標記
    isSinglePlayer: config.isSinglePlayer ?? true,
    isPvE:          config.isPvE          ?? false,

    // 血量
    hp: 6, dummyHp: 6,

    // 行動卡
    pts: 0, face: 'A',
    enemyPts: 0, enemyFace: 'A',

    // 計數器
    flipCount: 0, enemyFlipCount: 0,
    statAtk: 0, statHeal: 0, statTurn: 1,
    enemyStatAtk: 0, enemyStatHeal: 0,

    // 骰子
    bonusDice: 0, enemyBonusDice: 0,
    dice: [],

    // 狀態
    phase: 'roll',
    rolled: false,
    isAIThinking: false,
    isGameOver: false,

    // 配件
    loadout: playerLoadout,
    enemyLoadout: enemyLoadout,
    usedAccs: [],
    enemyUsedAccs: [],
    playerStored,
    enemyStored,

    // 獎章
    medalRounds: 0,
    enemyMedalRounds: 0,

    // 聯網專用（單機時為 undefined，不影響邏輯）
    currentTurnPlayer:     config.currentTurnPlayer ?? undefined,
    lastProcessedActionId: null,
  };
  console.log("戰鬥狀態已初始化"); // 放在這裡
}