// ui-render.js - 渲染中樞 (戰鬥畫面專用)
window.UIRender = {
    // 1. 總調度：一次更新所有戰鬥積木
    renderBattle: function() {
        if (!window.gs) return;
        
        
        this.renderHP();
        this.renderCard();
        this.renderAccBar();
        this.renderDice();
        this.renderPhase();
        this.renderStats();
        this.updateCtrl();
        this.renderTimer();

        const myNameEl = document.getElementById('battleMyNameDisplay');
        if (myNameEl) myNameEl.textContent = gs.myName || "勇者";

        const enemyNameEl = document.getElementById('battleEnemyNameDisplay');
        if (enemyNameEl) enemyNameEl.textContent = gs.enemyName || "對手";

        // 更新獎章進度
        if (gs.loadout?.includes('medal')) this.updateMedalDisplay('player');
        if (gs.enemyLoadout?.includes('medal')) this.updateMedalDisplay('enemy');
    },

    // 2. 血量渲染
    renderHP: function() {
        const ph = document.getElementById('hpHearts');
        const dh = document.getElementById('dummyHearts');
        if (!ph || !dh) return;

        ph.innerHTML = ''; dh.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const h1 = document.createElement('span');
            h1.className = 'h-heart' + (i >= gs.hp ? ' empty' : '');
            h1.textContent = '❤';
            
            const h2 = document.createElement('span');
            h2.className = 'h-heart' + (i >= gs.dummyHp ? ' empty' : '');
            h2.textContent = '❤';
            
            ph.appendChild(h1);
            dh.appendChild(h2);
        }
    },

    // 3. 行動卡渲染
    renderCard: function() {
        const myCard = document.getElementById('myCard');
        if (!myCard) return;

        const max = gs.face === 'A' ? 8 : 24;
        const eMax = gs.enemyFace === 'A' ? 8 : 24;
        const pct = Math.min(100, (gs.pts / max) * 100);
        const ePct = Math.min(100, (gs.enemyPts / eMax) * 100);

        document.getElementById('myPts').textContent = isNaN(gs.pts) ? 0 : gs.pts;
        document.getElementById('myMax').textContent = max;
        document.getElementById('myBar').style.width = pct + '%';
        
        const myFaceEl = document.getElementById('myFace');
        myFaceEl.textContent = gs.face + '面';
        myFaceEl.className = `card-face face-${gs.face}`;

        const ePtsEl = document.getElementById('enemyPts');
        if (ePtsEl) ePtsEl.textContent = isNaN(gs.enemyPts) ? 0 : gs.enemyPts;
        if (document.getElementById('enemyBar')) document.getElementById('enemyBar').style.width = ePct + '%';
        if (document.getElementById('enemyMax')) document.getElementById('enemyMax').textContent = eMax;

        const ready = gs.pts >= max;
        myCard.className = 'action-card' + (ready ? ' ready' : '');

        const canUse = ready && gs.phase === 'action';
        document.getElementById('atkBtn').disabled = !canUse;
        document.getElementById('healBtn').disabled = !canUse;
    },

    // 4. 計時器渲染 (✅ 補回顏色警示)
    renderTimer: function() {
        let timerEl = document.getElementById('turnTimerDisplay');
        if (gs.isGameOver) {
            if (timerEl) timerEl.style.display = 'none';
            return;
        }

        if (gs.currentTurnPlayer === myRole) {
            if (timerEl) timerEl.style.display = 'block';
        } else if (gs.opponentTime !== undefined) {
            if (!timerEl) {
                timerEl = document.createElement('div');
                timerEl.id = 'turnTimerDisplay';
                timerEl.style.cssText = `position:fixed; bottom:80px; right:16px; background:rgba(0,0,0,0.7); color:#f0c060; padding:4px 10px; border-radius:8px; font-size:0.85rem; z-index:100; border:1px solid #8b5e2a;`;
                document.body.appendChild(timerEl);
            }
            timerEl.textContent = `⏱ 對手思考中: ${gs.opponentTime}s`;
            // ✅ 補回顏色警示：10秒內變紅
            timerEl.style.color = gs.opponentTime <= 10 ? '#ff6b6b' : '#f0c060'; 
            timerEl.style.display = 'block';
        } else {
            if (timerEl) timerEl.style.display = 'none';
        }
    },

    // 5. 骰子托盤
 renderDice: function() {
    const tray = document.getElementById('diceTray');
    if (!tray) return;
    tray.innerHTML = ''; // ✅ 必須先清空

    if (!gs || !gs.rolled) {
        tray.innerHTML = '<div style="font-family:\'IM Fell English\',serif;font-style:italic;font-size:.8rem;color:var(--leather-lt)">按「擲骰」開始本回合</div>';
        return;
    }

    const isLocked = gs.isAIThinking || (!gs.isSinglePlayer && typeof myRole !== 'undefined' && myRole !== gs.currentTurnPlayer);

    gs.dice.forEach((die, i) => {
        const el = document.createElement('div');
        el.className = 'die' + (die.u ? ' used' : '') + (isLocked ? ' locked' : '') + (die.rolling ? ' rolling' : '');
        el.innerHTML = FACES[die.v - 1] + `<span class="die-val">${die.v}</span>`;
        el.dataset.idx = i;

        if (!die.u && !isLocked && window.UIInteraction) {
            window.UIInteraction.setupDrag(el, i);
        }
        tray.appendChild(el);
    });
},

    // 6. 統計數據
    renderStats: function(){
        const statFlip = document.getElementById('statFlip');
        if (!statFlip) return;
        statFlip.textContent = `${gs.flipCount} / ${gs.enemyFlipCount || 0}`;
        document.getElementById('statAtk').textContent = gs.statAtk;
        document.getElementById('statEnemyAtk').textContent = gs.enemyStatAtk || 0;
        document.getElementById('statHeal').textContent = gs.statHeal;
        document.getElementById('statEnemyHeal').textContent = gs.enemyStatHeal || 0;
        document.getElementById('statTurn').textContent = gs.statTurn;
    },

    // 7. 控制按鈕 (✅ 補回 pointerEvents 防止點擊)
    updateCtrl: function() {
        const rollBtn = document.getElementById('rollBtn');
        const endBtn = document.getElementById('endBtn');
        if (!rollBtn || !endBtn || !gs) return;

        const isSinglePlayer = gs.isSinglePlayer === true;
        const isMyTurn = isSinglePlayer ? true : (myRole === gs.currentTurnPlayer);

        const canRoll = isMyTurn && gs.phase === 'roll';
        rollBtn.disabled = !canRoll;
        rollBtn.style.opacity = canRoll ? "1" : "0.3";
        // ✅ 補回 pointerEvents
        rollBtn.style.pointerEvents = canRoll ? "auto" : "none"; 
        
        const canEnd = isMyTurn && gs.phase === 'action';
        endBtn.disabled = !canEnd;
        endBtn.style.opacity = canEnd ? "1" : "0.3";
        // ✅ 補回 pointerEvents
        endBtn.style.pointerEvents = canEnd ? "auto" : "none";
    },

    // 8. 階段膠囊
    renderPhase: function(){
        const labels=['擲骰','行動','結束'];
        const phases=['roll','action','end'];
        const cur=phases.indexOf(gs.phase);
        labels.forEach((l,i)=>{
            const el=document.getElementById('ph'+i);
            if(el) {
                el.textContent=l;
                el.className='phase-pill '+(i<cur?'pp-done':i===cur?'pp-active':'pp-inactive');
            }
        });
        const bhTurn = document.getElementById('bh_turn');
        if(bhTurn) bhTurn.textContent=`第${gs.statTurn}回合 · ${gs.phase==='roll'?'擲骰階段':gs.phase==='action'?'行動階段':'結束階段'}`;
    },
   
    // 9. 配件欄
    renderAccBar: function() {
        const myBar = document.getElementById('myAccBar');
        const enemyBar = document.getElementById('enemyAccBar');
        if (!myBar || !enemyBar) return;
        myBar.innerHTML = '';
        enemyBar.innerHTML = '';
        gs.loadout.forEach(id => myBar.appendChild(this.createAccChip(id, 'player')));
        gs.enemyLoadout.forEach(id => enemyBar.appendChild(this.createAccChip(id, 'enemy')));
    },

    // 10. 配件晶片 (✅ 補回獎章詳細 Log 提示)
    createAccChip: function(id, owner) {
        const acc = ACCESSORIES.find(a => a.id === id);
        if (!acc) return document.createElement('div');
        const ledger = (owner === 'player') ? gs.playerStored : gs.enemyStored;
        const stored = ledger ? (ledger[id] || []) : [];
        const isStoring = stored.length > 0;
        const chip = document.createElement('div');
        chip.className = 'acc-chip' + (isStoring ? ' storing' : '');
        chip.id = `chip_${owner}_${id}`;
        
        if (id === 'medal') {
            const rounds = (owner === 'player') ? (gs.medalRounds || 0) : (gs.enemyMedalRounds || 0);
            let medalHtml = `<div class="chip-ico">🏅</div><div class="chip-nm">榮譽獎章</div><div class="medal-progress">`;
            [1,2,3,4,5,6].forEach(v => {
                const collected = stored.includes(v);
                medalHtml += `<span class="medal-dot ${collected ? 'collected' : ''}">${collected ? FACES[v-1] : ''}</span>`;
            });
            medalHtml += `</div><div class="medal-round">第 ${rounds + 1}/2 輪</div>`;
            chip.innerHTML = medalHtml;
        } else {
            const totalNeeded = acc.trigger?.count || (acc.trigger?.faces ? acc.trigger.faces.length : 0);
            const progress = (totalNeeded > 1) ? ` (${stored.length}/${totalNeeded})` : '';
            chip.innerHTML = `<div class="chip-ico">${acc.icon}</div><div class="chip-nm">${acc.name}${progress}</div>` +
                (isStoring && owner === 'player' && !acc.noRefund ? '<div style="font-size:0.4rem; color:var(--ember-glow); margin-top:2px;">[點擊退還]</div>' : '') +
                (acc.type === 'passive' ? '<div class="chip-passive">被動</div>' : '');
        }
        
        chip.onclick = () => {
            if (owner === 'player' && isStoring) {
                if (acc.noRefund) {
                    // ✅ 補回詳細 Log 提示
                   if (window.UIRender) {
                        window.UIRender.log(`🏅 獎章投入的骰子不能收回！`, 'system');
                        const rounds = (gs.medalRounds || 0);
                        const collectedStr = stored.map(v => FACES[v-1]).join(' ');
                        const neededStr = [1,2,3,4,5,6].filter(v => !stored.includes(v)).map(v => FACES[v-1]).join(' ');
                        window.UIRender.log(`🏅 第 ${rounds + 1}/2 輪進度:`, 'system');
                        if (stored.length > 0) window.UIRender.log(`已收集: ${collectedStr}`, 'system');
                        window.UIRender.log(`還需要: ${neededStr}`, 'system');
                    }
                    return;
                }
                if(window.syncBattleAction) syncBattleAction({ type: 'refundAcc', actor: myRole, accId: id });
                const storedValues = [...stored];
                storedValues.forEach(val => {
                    const target = gs.dice.find(d => d.u && d.v === val);
                    if (target) target.u = false;
                });
                ledger[id] = [];        
                if(window.UIRender) window.UIRender.log(`📤 已從 ${acc.name} 退回骰子`, 'system');
                window.UIRender.renderBattle();
            } else {
                if(window.showTip) showTip(acc); 
            }
        };
        return chip;
    },

    // 11. 獎章專用更新
    updateMedalDisplay: function (who) {
        const chip = document.getElementById(`chip_${who}_medal`);
        if (!chip) return;
        const ledger = (who === 'player') ? gs.playerStored : gs.enemyStored;
        const stored = ledger['medal'] || [];
        const rounds = (who === 'player') ? (gs.medalRounds || 0) : (gs.enemyMedalRounds || 0);
        let html = `<div class="chip-ico">🏅</div><div class="chip-nm">榮譽獎章</div><div class="medal-progress">`;
        [1,2,3,4,5,6].forEach(v => {
            const collected = stored.includes(v);
            html += `<span class="medal-dot ${collected ? 'collected' : ''}">${collected ? FACES[v-1] : ''}</span>`;
        });
        html += `</div><div class="medal-round">第 ${rounds + 1}/2 輪</div>`;
        chip.innerHTML = html;
    },

    floatAt: function (txt,anchorEl,cls){
    if(!anchorEl) return;
    const el=document.createElement('div');
    el.className=`float-text ft-${cls}`;
    el.textContent=txt;
    const r=anchorEl.getBoundingClientRect();
    el.style.left=(r.left+r.width/2-20)+'px';
    el.style.top=(r.top)+'px';
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1100);
    },

    log: function (msg, cls='system') {
    const logEl = document.getElementById('battleLog');
    if(!logEl) return;
    const d = document.createElement('div');
    d.className = 'log-line log-' + cls;
    d.textContent = msg;
    logEl.appendChild(d);
  
    // ⚡ 自動清理：只保留最後 20 條，保持視窗清爽
    while (logEl.childNodes.length > 20) {
    logEl.removeChild(logEl.firstChild);
    }
    logEl.scrollTop = logEl.scrollHeight;
    },


}; // ✅ 這是 window.UIRender 物件的正確結尾