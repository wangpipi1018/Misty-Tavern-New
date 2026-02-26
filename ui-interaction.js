// ui-interaction.js - 互動中樞 (優化監聽器與參數傳遞)
window.UIInteraction = {
  dragging: false,
  dragIdx: null,
  currentEl: null, // 新增：追蹤當前抓取的元素

  // 1. 初始化物件 (在 index.html 載入後呼叫一次)
  init: function() {
    const self = this;
    const ghost = document.getElementById('dragGhost');

    const move = (x, y) => { 
      if (!ghost) return;
      ghost.style.left = (x - 29) + 'px'; 
      ghost.style.top = (y - 29) + 'px'; 
    };

    const end = (x, y) => {
      if (!self.dragging) return;
      const currentIdx = self.dragIdx;
      const el = self.currentEl;

      self.dragging = false;
      if (ghost) ghost.classList.remove('active');
      if (el) el.style.opacity = '1';

      const target = self.getTarget(x, y);
      if (target === 'card') {
        if (window.useDieOnCard) window.useDieOnCard(currentIdx);
      } else if (target) {
        if (window.useDieOnAcc) window.useDieOnAcc(currentIdx, target);
      }

      self.clearDropHighlights();
      self.dragIdx = null;
      self.currentEl = null;
     if (window.UIRender) window.UIRender.renderBattle();
    };

    // ✅ 優化：全域監聽器只綁定一次
    document.addEventListener('mousemove', e => { 
      if (self.dragging) move(e.clientX, e.clientY); 
    });
    document.addEventListener('mouseup', e => { 
      if (self.dragging) end(e.clientX, e.clientY); 
    });

    // 📱 觸控支援
    document.addEventListener('touchmove', e => {
      if (self.dragging) {
        if (e.cancelable) e.preventDefault(); 
        const t = e.touches[0];
        move(t.clientX, t.clientY);
      }
    }, { passive: false });

    document.addEventListener('touchend', e => {
      if (self.dragging) {
        const t = e.changedTouches[0];
        end(t.clientX, t.clientY);
      }
    }, { passive: false });
    
    console.log("🖱️ UIInteraction 全域監聽器初始化完成");
  },

  // 2. 為骰子注入拖拽掛鉤
  setupDrag: function(el, idx) {
    const self = this;
    const ghost = document.getElementById('dragGhost');

    // 🖱️ 滑鼠按下
    el.addEventListener('mousedown', e => {
      const isSinglePlayer = gs && gs.isSinglePlayer === true;
      const canAct = isSinglePlayer ? true : (window.myRole === gs.currentTurnPlayer);
      if (!canAct || gs.phase !== 'action') return;

      e.preventDefault();
      self.dragging = true; 
      self.dragIdx = idx;
      self.currentEl = el; // 記錄當前元素
      
      ghost.innerHTML = el.innerHTML;
      ghost.style.width = el.offsetWidth + 'px';
      ghost.style.height = el.offsetHeight + 'px';
      ghost.classList.add('active');
      el.style.opacity = '.3';
      
      // 初始定位
      ghost.style.left = (e.clientX - 29) + 'px'; 
      ghost.style.top = (e.clientY - 29) + 'px';
      self.setDropHighlights(true);
    });

    // 📱 觸控開始
    el.addEventListener('touchstart', e => {
      const isSinglePlayer = gs && gs.isSinglePlayer === true;
      const canAct = isSinglePlayer ? true : (window.myRole === gs.currentTurnPlayer);
      if (!canAct || gs.phase !== 'action') return;

      if (e.cancelable) e.preventDefault(); 
      self.dragging = true; 
      self.dragIdx = idx;
      self.currentEl = el;
      const t = e.touches[0];
      
      ghost.innerHTML = el.innerHTML;
      ghost.style.width = el.offsetWidth + 'px';
      ghost.style.height = el.offsetHeight + 'px';
      ghost.classList.add('active');
      el.style.opacity = '.3';
      
      ghost.style.left = (t.clientX - 29) + 'px'; 
      ghost.style.top = (t.clientY - 29) + 'px';
      self.setDropHighlights(true);
    }, { passive: false });
  },

  // 3. 亮框邏輯
  setDropHighlights: function(on) {
    const card = document.getElementById('myCard');
    if (on && gs.phase === 'action' && !gs.isAIThinking) {
      if (card) card.classList.add('droptarget');
    } else {
      if (card) card.classList.remove('droptarget');
    }

    gs.loadout.forEach(id => {
      const acc = ACCESSORIES.find(a => a.id === id);
      const chip = document.getElementById('chip_player_' + id);
      // ✅ 參數傳遞：明確傳入 this.dragIdx 作為當前骰子索引
      if (chip && acc && acc.type !== 'passive' && on && window.canUseAccessory(acc, gs.dice, this.dragIdx, 'player')) {
        chip.classList.add('droptarget');
      } else if (chip) {
        chip.classList.remove('droptarget');
      }
    });
  },

  clearDropHighlights: function() { this.setDropHighlights(false); },

  // 4. 目標偵測 (過濾被動)
  getTarget: function(x, y) {
    const card = document.getElementById('myCard');
    if (card) {
      const r = card.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return 'card';
    }
    for (const id of gs.loadout) {
      const acc = ACCESSORIES.find(a => a.id === id);
      const c = document.getElementById('chip_player_' + id); 
      if (!c || !acc || acc.type === 'passive') continue;
      const r = c.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }
};

// ⚡ 立即執行初始化
UIInteraction.init();
window.setupDrag = UIInteraction.setupDrag.bind(UIInteraction);