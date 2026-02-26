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
        bonusDice: gs.bonusDice || 0,
        enemyBonusDice: gs.enemyBonusDice || 0,
        enemyNextDie: gs.enemyNextDie || null
      });
    }

    // 3. 呼叫裁判
    this.checkWin();
  },

  // ⚖️ 裁判：掃描所有獲勝條件
  checkWin: function() {
    if (!gs || gs.isGameOver) return;
    
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
    else if (gs.flipCount >= 10)      { winner = 'dummy'; reason = 'flip'; }
    else if (gs.enemyFlipCount >= 10) { winner = 'lose';  reason = 'flip'; }

    if (winner) {
      gs.isGameOver = true;
      
      // 最後一刻同步，確保兩邊跳結算
      if (window.isOnlineMode && window.isOnlineMode() && window.myRole === gs.currentTurnPlayer) {
        window.syncBattle({ 
          status: 'game-over', 
          winner: winner === 'dummy' ? window.myRole : (window.myRole === 'host' ? 'guest' : 'host'),
          reason: reason
        });
      }
      
      setTimeout(() => {
        if (window.endBattle) window.endBattle(winner);
      }, 600);
    }
  }
};
