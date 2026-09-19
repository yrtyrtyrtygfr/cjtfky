// ==UserScript==
// @name         国开目录刷点击次数
// @namespace    https://scriptcat.org/
// @version      2.0.0
// @description  ✅第一步展开目录｜第二步自动拾取（跳过加粗标题）｜细粒度间隔｜轮流循环点击｜ESC停止
// @author       You
// @match        *://lms.ouchn.cn/*
// @icon           https://cdn.jsdelivr.net/gh/andywang425/BLTH@7d7ca494edd314806460e24c6b59be8ae1bd7dc6/img/script-icon.png
// @grant        none
// @run-at       document-start
// @license      MIT
// ==/UserScript==
(function () {
    'use strict';
    if (window.__QCC_INSTALLED__) return;
    window.__QCC_INSTALLED__ = true;

    /* ============================================================
     * 内核：Shadow DOM 穿透
     * ============================================================ */
    const shadowRootMap = new Map();
    const nativeAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
        const root = nativeAttachShadow.call(this, init);
        try { shadowRootMap.set(this, root); } catch (e) {}
        return root;
    };
    function getShadowRoot(el) {
        if (!el || el.nodeType !== 1) return null;
        return el.shadowRoot || shadowRootMap.get(el) || null;
    }
    function getAllRoots() {
        const roots = [document];
        for (let i = 0; i < roots.length; i++) {
            let all;
            try { all = roots[i].querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) {
                const sr = getShadowRoot(el);
                if (sr && !roots.includes(sr)) roots.push(sr);
            }
        }
        return roots;
    }

    function realClick(el) {
        if (!el) return false;
        let r;
        try { r = el.getBoundingClientRect(); } catch (e) {
            r = { left: 0, top: 0, width: 1, height: 1 };
        }
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const base = {
            bubbles: true, cancelable: true, composed: true,
            view: window,
            clientX: x, clientY: y, screenX: x, screenY: y,
            button: 0, detail: 1
        };
        try {
            if (window.PointerEvent) {
                el.dispatchEvent(new PointerEvent('pointerover', Object.assign({}, base,
                    { buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true })));
                el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, base,
                    { buttons: 1, pointerId: 1, pointerType: 'mouse', isPrimary: true })));
            }
            el.dispatchEvent(new MouseEvent('mouseover', Object.assign({}, base, { buttons: 0 })));
            el.dispatchEvent(new MouseEvent('mousedown', Object.assign({}, base, { buttons: 1 })));
            if (window.PointerEvent) {
                el.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, base,
                    { buttons: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true })));
            }
            el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
            el.dispatchEvent(new MouseEvent('click', Object.assign({}, base, { buttons: 0 })));
        } catch (e) {
            console.warn('[QCC] dispatch failed:', e);
            return false;
        }
        return true;
    }
    function pickClickTarget(el) {
        let cur = el;
        for (let i = 0; i < 4 && cur; i++) {
            try { if (getComputedStyle(cur).cursor === 'pointer') return cur; } catch (e) {}
            cur = cur.parentElement;
        }
        return el;
    }

    /* ============================================================
     * 加粗判断：加粗 = 章节标题 = 不拾取
     * ============================================================ */
    function isBoldText(el) {
        let cur = el;
        for (let i = 0; i < 3 && cur; i++) {
            const tag = (cur.tagName || '').toUpperCase();
            if (tag === 'STRONG' || tag === 'B' ||
                tag === 'H1' || tag === 'H2' || tag === 'H3' ||
                tag === 'H4' || tag === 'H5' || tag === 'H6') return true;
            try {
                const fw = getComputedStyle(cur).fontWeight;
                const n = fw === 'bold' ? 700 : (fw === 'bolder' ? 800 : parseInt(fw, 10));
                if (!isNaN(n) && n >= 600) return true;
            } catch (e) {}
            cur = cur.parentElement;
        }
        return false;
    }

    /* ============================================================
     * 间隔档位
     * ============================================================ */
    const INTERVAL_STEPS = [
        { label: '5s',   sec: 5 },
        { label: '10s',  sec: 10 },
        { label: '30s',  sec: 30 },
        { label: '1m',   sec: 60 },
        { label: '2m',   sec: 120 },
        { label: '5m',   sec: 300 }
    ];
    const DEFAULT_STEP_INDEX = 0;

    /* ============================================================
     * 状态
     * ============================================================ */
    let panel, statusEl, statusTextEl, listBox, listCountEl;
    let intervalSlider, intervalValueEl, intervalLabels;

    let selectedEls = [];
    let isRunning   = false;
    let clickTimer  = null;
    let clickIndex  = 0;
    let clickedTotal = 0;
    let expanding   = false;
    let picking     = false;

    function setStatus(text, cls) {
        if (!statusTextEl) return;
        statusTextEl.textContent = text;
        statusEl.className = 'qcc-status' + (cls ? ' ' + cls : '');
    }
    function getIntervalSec() {
        const idx = parseInt(intervalSlider.value, 10) || 0;
        return (INTERVAL_STEPS[idx] || INTERVAL_STEPS[0]).sec;
    }
    function getIntervalLabel() {
        const idx = parseInt(intervalSlider.value, 10) || 0;
        return (INTERVAL_STEPS[idx] || INTERVAL_STEPS[0]).label;
    }
    function updateIntervalUI() {
        const idx = parseInt(intervalSlider.value, 10) || 0;
        intervalValueEl.textContent = INTERVAL_STEPS[idx].label;
        intervalLabels.forEach(span => {
            span.classList.toggle('active', parseInt(span.dataset.idx, 10) === idx);
        });
    }
    function getElText(el) {
        if (!el) return '未知元素';
        const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (!txt) return `[${(el.tagName || 'el').toLowerCase()}]`;
        return txt.length > 30 ? txt.slice(0, 30) + '…' : txt;
    }
    function renderList() {
        if (!listBox || !listCountEl) return;
        listCountEl.textContent = selectedEls.length;
        if (selectedEls.length === 0) { listBox.innerHTML = '暂无元素'; return; }
        listBox.innerHTML = '';
        selectedEls.forEach((el, i) => {
            const item = document.createElement('div');
            item.className = 'qcc-list-item';
            const txt = document.createElement('span');
            txt.className = 'qcc-list-item-text';
            txt.textContent = `${i + 1}. ${getElText(el)}`;
            const del = document.createElement('button');
            del.className = 'qcc-list-item-del';
            del.textContent = '×';
            del.title = '移除';
            del.addEventListener('click', (e) => { e.stopPropagation(); removeSelected(el); });
            item.appendChild(txt); item.appendChild(del);
            listBox.appendChild(item);
        });
    }
    function removeSelected(el) {
        try { el.classList.remove('qcc-pick-selected'); } catch (e) {}
        const idx = selectedEls.indexOf(el);
        if (idx > -1) selectedEls.splice(idx, 1);
        renderList();
    }
    function clearSelected() {
        selectedEls.forEach(el => {
            try { el.classList.remove('qcc-pick-selected'); } catch (e) {}
        });
        selectedEls = [];
        renderList();
    }

    /* ============================================================
     * 自动拾取左侧目录（悬停变色的链接，跳过加粗标题）
     * ============================================================ */
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const PICK_MAX_X = 340;
    const PICK_MIN_W = 30;
    const PICK_MIN_H = 12;
    const PICK_MAX_H = 60;

    function findLeftScroller() {
        let best = null, bestScore = -Infinity;
        for (const root of getAllRoots()) {
            let all;
            try { all = root.querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) {
                if (panel && panel.contains(el)) continue;
                let st;
                try { st = getComputedStyle(el); } catch (e) { continue; }
                const oy = st.overflowY;
                if (oy !== 'auto' && oy !== 'scroll') continue;
                let r;
                try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                if (r.left > PICK_MAX_X) continue;
                if (r.width < 80 || r.height < 150) continue;
                const range = el.scrollHeight - el.clientHeight;
                if (range < 30) continue;
                const score = -r.top + Math.min(range, 5000) * 0.01;
                if (score > bestScore) { bestScore = score; best = el; }
            }
        }
        return best;
    }

    /* 向上找一个合适的点击目标：<a> / href / cursor:pointer 祖先 */
    function resolveClickTarget(el) {
        let cur = el;
        for (let i = 0; i < 4 && cur; i++) {
            const tag = (cur.tagName || '').toUpperCase();
            if (tag === 'A') return cur;
            if (cur.getAttribute && cur.getAttribute('href')) return cur;
            try {
                if (getComputedStyle(cur).cursor === 'pointer') return cur;
            } catch (e) {}
            cur = cur.parentElement;
        }
        return el;
    }

    function collectOnce(intoSet) {
        const roots = getAllRoots();
        let primaryHits = 0;

        /* === 主目标：国开目录项 .text-too-long === */
        for (const root of roots) {
            let list;
            try { list = root.querySelectorAll('.text-too-long'); }
            catch (e) { list = []; }

            for (const el of list) {
                if (panel && panel.contains(el)) continue;

                // ★ 跳过加粗章节标题
                if (isBoldText(el)) continue;

                let r;
                try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                if (r.width < 20 || r.height < 8) continue;
                if (r.left < 0 || r.left > PICK_MAX_X) continue;
                if (r.bottom < 0 || r.top > window.innerHeight) continue;

                let st;
                try { st = getComputedStyle(el); } catch (e) { continue; }
                if (st.display === 'none' || st.visibility === 'hidden') continue;

                const txt = (el.textContent || '').trim();
                if (!txt) continue;

                intoSet.add(resolveClickTarget(el));
                primaryHits++;
            }
        }

        /* === 兜底：左侧栏 cursor:pointer 且非加粗的小元素 === */
        if (primaryHits === 0) {
            for (const root of roots) {
                let all;
                try { all = root.querySelectorAll('*'); } catch (e) { continue; }
                for (const el of all) {
                    if (panel && panel.contains(el)) continue;
                    if (isBoldText(el)) continue;

                    let r;
                    try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                    if (r.width < PICK_MIN_W || r.height < PICK_MIN_H || r.height > PICK_MAX_H) continue;
                    if (r.left < 0 || r.left > PICK_MAX_X) continue;
                    if (r.bottom < 0 || r.top > window.innerHeight) continue;

                    let st;
                    try { st = getComputedStyle(el); } catch (e) { continue; }
                    if (st.cursor !== 'pointer') continue;
                    if (st.display === 'none') continue;

                    const txt = (el.textContent || '').trim();
                    if (!txt || txt.length > 80) continue;

                    intoSet.add(el);
                }
            }
        }
    }

    async function autoPickLeftNav() {
        if (picking) return;
        picking = true;

        clearSelected();
        setStatus('🔍 正在自动拾取左侧目录…', 'running');

        const scroller = findLeftScroller();
        const collected = new Set();
        console.log('[QCC] 左侧滚动容器:', scroller);

        try {
            if (scroller) {
                const origTop = scroller.scrollTop;

                scroller.scrollTop = 0;
                await sleep(220);
                collectOnce(collected);
                setStatus(`🔍 拾取中… 已收集 ${collected.size} 项`, 'running');

                const step   = Math.max(150, scroller.clientHeight - 60);
                const maxTop = scroller.scrollHeight - scroller.clientHeight;
                let pos = 0, pageIdx = 1;
                while (pos <= maxTop) {
                    scroller.scrollTop = pos;
                    await sleep(220);
                    collectOnce(collected);
                    setStatus(`🔍 拾取中… 第 ${pageIdx} 屏，已收集 ${collected.size} 项`, 'running');
                    pos += step;
                    pageIdx++;
                }

                scroller.scrollTop = maxTop;
                await sleep(220);
                collectOnce(collected);

                scroller.scrollTop = origTop;
                await sleep(150);
            } else {
                collectOnce(collected);
            }

            for (const el of collected) {
                if (selectedEls.includes(el)) continue;
                selectedEls.push(el);
                try { el.classList.add('qcc-pick-selected'); } catch (e) {}
            }
            renderList();

            if (selectedEls.length === 0) {
                setStatus('⚠️ 未找到悬停变色的链接，请确认左侧目录已展开', '');
            } else {
                setStatus(`✅ 已拾取 ${selectedEls.length} 个可点击链接（已跳过加粗标题）`, '');
            }
        } finally {
            picking = false;
        }
    }

    /* ============================================================
     * 轮流点击
     * ============================================================ */
    function highlightClick(el) {
        try { el.classList.add('qcc-clicking'); } catch (e) {}
        setTimeout(() => {
            try { el.classList.remove('qcc-clicking'); } catch (e) {}
        }, 200);
    }
    function doClick() {
        if (!isRunning) return;
        if (selectedEls.length === 0) { stopClicking(); setStatus('没有可点击的元素', ''); return; }

        selectedEls = selectedEls.filter(el => el.isConnected);
        if (selectedEls.length === 0) {
            stopClicking();
            setStatus('所有元素已从页面移除', '');
            renderList();
            return;
        }
        const el = selectedEls[clickIndex % selectedEls.length];
        try {
            realClick(pickClickTarget(el) || el);
            highlightClick(el);
        } catch (err) {
            console.warn('[轮流点击器] 点击失败:', err);
        }
        clickedTotal++;
        clickIndex++;
        setStatus(`执行中… 已点击 ${clickedTotal} 次 / 共 ${selectedEls.length} 个元素（间隔 ${getIntervalLabel()}）`, 'running');
    }
    function startClicking() {
        if (isRunning) return;
        if (selectedEls.length === 0) { setStatus('请先自动拾取左侧目录', ''); return; }

        isRunning = true;
        clickIndex = 0;
        clickedTotal = 0;
        document.getElementById('qcc-start').disabled = true;
        document.getElementById('qcc-stop').disabled = false;
        setStatus(`开始执行…（无限循环，间隔 ${getIntervalLabel()}）`, 'running');

        doClick();
        clickTimer = setInterval(doClick, getIntervalSec() * 1000);
    }
    function stopClicking() {
        if (!isRunning) return;
        isRunning = false;
        if (clickTimer) { clearInterval(clickTimer); clickTimer = null; }
        const b1 = document.getElementById('qcc-start');
        const b2 = document.getElementById('qcc-stop');
        if (b1) b1.disabled = false;
        if (b2) b2.disabled = true;
        if (statusEl && statusEl.classList.contains('running')) {
            setStatus(`已停止，共点击 ${clickedTotal} 次`, '');
        }
    }

    /* ============================================================
     * 一键展开（穿透 + 三角打分 + 多轮）
     * ============================================================ */
    const ARROW_RE = /(arrow|triangle|caret|chevron|expand|collapse|fold|unfold|toggle|tree-?(switch|icon)|icon-(down|right|left|up|plus|minus|caret|arrow))/i;

    function signature(el) {
        let s = '';
        const cls = el.className;
        if (typeof cls === 'string') s += ' ' + cls;
        else if (cls && cls.baseVal) s += ' ' + cls.baseVal;
        s += ' ' + (el.id || '');
        if (el.getAttribute) {
            const attrs = ['aria-label', 'title', 'data-name', 'data-testid', 'data-type', 'alt', 'name'];
            for (const a of attrs) {
                const v = el.getAttribute(a);
                if (v) s += ' ' + v;
            }
        }
        return s;
    }
    function arrowScore(el) {
        let score = 0;
        let cur = el;
        for (let d = 0; d < 3 && cur; d++) {
            if (ARROW_RE.test(signature(cur))) score += (3 - d) * 2;
            if (cur.hasAttribute && cur.hasAttribute('aria-expanded')) score += 3;
            cur = cur.parentElement;
        }
        try { if (getComputedStyle(el).cursor === 'pointer') score += 1; } catch (e) {}
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'svg' || tag === 'i' || tag === 'use' || tag === 'path' || tag === 'img') score += 1;
        return score;
    }

    async function expandAllChapters() {
        if (expanding) return;
        expanding = true;

        const clickedSet = new WeakSet();

        function scanOnce() {
            const roots = getAllRoots();
            const candidates = [];
            const seen = new Set();

            for (const root of roots) {
                let all;
                try { all = root.querySelectorAll('*'); } catch (e) { continue; }
                for (const el of all) {
                    if (seen.has(el)) continue;
                    seen.add(el);
                    if (clickedSet.has(el)) continue;
                    if (panel && panel.contains(el)) continue;

                    let r;
                    try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                    if (r.width < 6 || r.height < 6) continue;
                    if (r.width > 48 || r.height > 48) continue;
                    if (r.left > 340) continue;
                    if (r.top < 40 || r.bottom > window.innerHeight + 4) continue;

                    let st;
                    try { st = getComputedStyle(el); } catch (e) { continue; }
                    if (st.display === 'none' || st.visibility === 'hidden' ||
                        parseFloat(st.opacity) < 0.05) continue;

                    const score = arrowScore(el);
                    if (score < 2) continue;

                    const ae = el.getAttribute && el.getAttribute('aria-expanded');
                    if (ae === 'true') continue;

                    candidates.push({ el, top: r.top, score });
                }
            }

            candidates.sort((a, b) => a.top - b.top);
            const picked = [];
            let group = [], gTop = null;
            const flush = () => {
                if (!group.length) return;
                group.sort((a, b) => b.score - a.score);
                picked.push(group[0]);
                group = [];
            };
            for (const it of candidates) {
                if (gTop === null || it.top - gTop > 10) { flush(); gTop = it.top; }
                group.push(it);
            }
            flush();

            let clicked = 0;
            for (const p of picked) {
                clickedSet.add(p.el);
                realClick(pickClickTarget(p.el));
                clicked++;
            }
            return clicked;
        }

        let totalClicked = 0, round = 0, stall = 0;
        const MAX_ROUNDS = 8;
        const ROUND_DELAY = 450;

        try {
            while (round < MAX_ROUNDS) {
                round++;
                setStatus(`正在展开目录… 第 ${round} 轮`, 'running');
                const n = scanOnce();
                totalClicked += n;
                if (n === 0) {
                    stall++;
                    if (stall >= 2) break;
                } else {
                    stall = 0;
                }
                await sleep(ROUND_DELAY);
            }
        } finally {
            expanding = false;
        }
        setStatus(`展开完成，共点击 ${totalClicked} 个节点（${round} 轮）`, '');
    }

    /* ============================================================
     * 面板构建
     * ============================================================ */
    function buildPanel() {
        if (document.getElementById('quick-custom-clicker')) return;

        panel = document.createElement('div');
        panel.id = 'quick-custom-clicker';
        panel.innerHTML = `
            <div class="qcc-header" id="qcc-drag">
                <div class="qcc-header-left">
                    <span class="qcc-logo">⚡</span>
                    <span class="qcc-title-text">国开刷点击次数</span>
                    <span class="qcc-badge">v2.2试用版</span>
                </div>
                <div class="qcc-header-right">
                    <button class="qcc-icon-btn" id="qcc-min" title="最小化">—</button>
                    <button class="qcc-icon-btn" id="qcc-close" title="关闭">×</button>
                </div>
            </div>

            <div class="qcc-body" id="qcc-body">
                <div class="qcc-section">
                    <div class="qcc-section-title">⚙️ 参数设置</div>
                    <div class="qcc-field qcc-field-block">
                        <div class="qcc-field-head">
                            <label>点击间隔</label>
                            <span class="qcc-interval-value" id="qcc-interval-value">0.5s</span>
                        </div>
                        <input id="qcc-interval" type="range"
                               min="0" max="${INTERVAL_STEPS.length - 1}" step="1"
                               value="${DEFAULT_STEP_INDEX}" class="qcc-range">
                        <div class="qcc-range-labels">
                            ${INTERVAL_STEPS.map((s, i) => `<span data-idx="${i}">${s.label}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <div class="qcc-section">
                    <div class="qcc-section-title">📂 第一步 · 目录展开</div>
                    <button id="qcc-expandRight" class="qcc-btn qcc-btn-blue">
                        <span class="qcc-btn-icon">📂</span> 一键展开（等下面展开完成）
                    </button>
                </div>

                <div class="qcc-section">
                    <div class="qcc-section-title">🎯 第二步 · 自动选择目录</div>
                    <button id="qcc-auto-pick" class="qcc-btn qcc-btn-primary">
                        <span class="qcc-btn-icon">🔍</span> 自动选择
                    </button>
                    <button id="qcc-clearList" class="qcc-btn qcc-btn-ghost qcc-btn-sm">
                        <span class="qcc-btn-icon">🗑️</span> 清空选择列表
                    </button>
                </div>

                <div class="qcc-section">
                    <div class="qcc-section-title">▶️ 第三步 · 执行</div>
                    <div class="qcc-btn-group">
                        <button id="qcc-start" class="qcc-btn qcc-btn-success">
                            <span class="qcc-btn-icon">▶</span> 开始
                        </button>
                        <button id="qcc-stop" class="qcc-btn qcc-btn-danger" disabled>
                            <span class="qcc-btn-icon">■</span> 停止
                        </button>
                    </div>
                </div>

                <div class="qcc-status" id="qcc-status">
                    <span class="qcc-status-dot"></span>
                    <span id="qcc-status-text">等待操作</span>
                </div>

                <div class="qcc-list-box">
                    <div class="qcc-list-header">
                        <span>已拾取元素</span>
                        <span class="qcc-list-count" id="qcc-list-count">0</span>
                    </div>
                    <div id="qcc-list" class="qcc-list">暂无元素</div>
                </div>

                <div class="qcc-tip">
                    💡 <b>第一步</b>：展开全部折叠章节<br>
                    💡 <b>第二步</b>：拾取悬停变色的链接（跳过加粗标题）<br>
                    💡 <b>第三步</b>：轮流点击已拾取链接，ESC 或【停止】结束<br>
                    💡 <b>间隔</b>：建议 5s以上，太快页面跟不上容易封禁
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #quick-custom-clicker{
                position:fixed; top:100px; right:20px; width:340px;
                background:#fff; border-radius:16px;
                box-shadow:0 10px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
                z-index:2147483647;
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;
                color:#1f2329; box-sizing:border-box; overflow:hidden;
                border:1px solid rgba(0,0,0,.06);
            }
            #quick-custom-clicker *{box-sizing:border-box;}
            .qcc-header{display:flex;justify-content:space-between;align-items:center;
                padding:12px 14px;background:linear-gradient(135deg,#4f6ef7 0%,#7b5cf5 100%);
                color:#fff;cursor:move;user-select:none;}
            .qcc-header-left{display:flex;align-items:center;gap:8px;}
            .qcc-logo{font-size:16px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.2));}
            .qcc-title-text{font-size:14px;font-weight:600;letter-spacing:.3px;}
            .qcc-badge{font-size:10px;background:rgba(255,255,255,.22);padding:1px 6px;border-radius:8px;font-weight:500;}
            .qcc-header-right{display:flex;gap:4px;}
            .qcc-icon-btn{width:22px;height:22px;border:0;background:rgba(255,255,255,.15);
                color:#fff;border-radius:6px;cursor:pointer;font-size:14px;line-height:1;
                display:flex;align-items:center;justify-content:center;transition:background .15s;padding:0;}
            .qcc-icon-btn:hover{background:rgba(255,255,255,.3);}
            .qcc-body{padding:12px 14px 14px;max-height:640px;overflow-y:auto;
                transition:max-height .25s ease,padding .25s ease,opacity .2s ease;}
            .qcc-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;opacity:0;overflow:hidden;}
            .qcc-body::-webkit-scrollbar{width:6px;}
            .qcc-body::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:3px;}
            .qcc-section{margin-bottom:12px;}
            .qcc-section:last-of-type{margin-bottom:10px;}
            .qcc-section-title{font-size:11.5px;font-weight:600;color:#8a94a6;
                text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;}
            .qcc-field-block{margin-bottom:8px;}
            .qcc-field-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
            .qcc-field-head label{font-size:13px;color:#4a5263;}
            .qcc-interval-value{font-size:12px;font-weight:600;color:#4f6ef7;background:#eef3ff;
                padding:2px 10px;border-radius:8px;min-width:52px;text-align:center;}
            input[type="range"].qcc-range{-webkit-appearance:none;appearance:none;
                width:100%;height:6px;border-radius:3px;background:#e2e5ea;
                outline:none;margin:4px 0 0;cursor:pointer;}
            input[type="range"].qcc-range::-webkit-slider-thumb{-webkit-appearance:none;
                width:18px;height:18px;border-radius:50%;
                background:linear-gradient(135deg,#4f6ef7 0%,#6b5cf5 100%);
                box-shadow:0 2px 6px rgba(79,110,247,.45);cursor:pointer;transition:transform .15s;}
            input[type="range"].qcc-range::-webkit-slider-thumb:hover{transform:scale(1.12);}
            input[type="range"].qcc-range::-moz-range-thumb{width:18px;height:18px;border:0;
                border-radius:50%;background:linear-gradient(135deg,#4f6ef7 0%,#6b5cf5 100%);
                box-shadow:0 2px 6px rgba(79,110,247,.45);cursor:pointer;}
            input[type="range"].qcc-range::-moz-range-track{height:6px;border-radius:3px;background:#e2e5ea;}
            .qcc-range-labels{display:flex;justify-content:space-between;margin-top:6px;
                font-size:10px;color:#8a94a6;user-select:none;}
            .qcc-range-labels span{cursor:pointer;transition:color .15s;}
            .qcc-range-labels span:hover{color:#4f6ef7;}
            .qcc-range-labels span.active{color:#4f6ef7;font-weight:600;}
            .qcc-btn{width:100%;border:0;border-radius:10px;padding:9px 12px;cursor:pointer;
                font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;
                gap:6px;transition:all .18s ease;font-family:inherit;line-height:1.2;}
            .qcc-btn-icon{font-size:13px;line-height:1;}
            .qcc-btn:disabled{opacity:.45;cursor:not-allowed;}
            .qcc-btn:not(:disabled):active{transform:scale(.98);}
            .qcc-btn-primary{background:linear-gradient(135deg,#4f6ef7 0%,#6b5cf5 100%);
                color:#fff;box-shadow:0 2px 8px rgba(79,110,247,.28);}
            .qcc-btn-primary:not(:disabled):hover{box-shadow:0 4px 14px rgba(79,110,247,.4);transform:translateY(-1px);}
            .qcc-btn-blue{background:#eef3ff;color:#3457d5;}
            .qcc-btn-blue:not(:disabled):hover{background:#e0e9ff;}
            .qcc-btn-success{background:linear-gradient(135deg,#12b76a 0%,#0e9f5c 100%);
                color:#fff;box-shadow:0 2px 8px rgba(18,183,106,.28);}
            .qcc-btn-success:not(:disabled):hover{box-shadow:0 4px 14px rgba(18,183,106,.4);transform:translateY(-1px);}
            .qcc-btn-danger{background:#fff1f0;color:#d92d20;}
            .qcc-btn-danger:not(:disabled):hover{background:#ffe4e2;}
            .qcc-btn-ghost{background:#f5f7fa;color:#4a5263;}
            .qcc-btn-ghost:not(:disabled):hover{background:#eceff4;}
            .qcc-btn-sm{padding:7px 10px;font-size:12px;margin-top:6px;}
            .qcc-btn-group{display:flex;gap:8px;}
            .qcc-status{display:flex;align-items:center;gap:8px;padding:8px 12px;
                background:#f5f7fa;border-radius:10px;font-size:12.5px;color:#4a5263;margin-bottom:12px;}
            .qcc-status-dot{width:8px;height:8px;border-radius:50%;background:#98a2b3;
                flex-shrink:0;transition:background .2s;}
            .qcc-status.running .qcc-status-dot{background:#12b76a;
                box-shadow:0 0 0 3px rgba(18,183,106,.18);animation:qcc-pulse 1.2s ease-in-out infinite;}
            @keyframes qcc-pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
            .qcc-list-box{background:#f5f7fa;border-radius:10px;padding:8px 10px;margin-bottom:12px;}
            .qcc-list-header{display:flex;justify-content:space-between;align-items:center;
                font-size:11.5px;color:#8a94a6;font-weight:600;margin-bottom:6px;}
            .qcc-list-count{background:#e2e5ea;color:#4a5263;padding:1px 7px;border-radius:8px;font-size:11px;}
            .qcc-list{max-height:120px;overflow-y:auto;font-size:12px;color:#4a5263;}
            .qcc-list::-webkit-scrollbar{width:5px;}
            .qcc-list::-webkit-scrollbar-thumb{background:#d0d5dd;border-radius:3px;}
            .qcc-list-item{display:flex;justify-content:space-between;align-items:center;gap:6px;
                padding:5px 8px;background:#fff;border-radius:7px;margin-bottom:4px;border:1px solid #eaecf0;}
            .qcc-list-item-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .qcc-list-item-del{border:0;background:transparent;color:#98a2b3;cursor:pointer;
                font-size:14px;line-height:1;padding:0 2px;flex-shrink:0;}
            .qcc-list-item-del:hover{color:#d92d20;}
            .qcc-tip{font-size:11px;color:#98a2b3;line-height:1.7;padding:8px 10px;
                background:#fafbfc;border-radius:9px;border-left:3px solid #e2e5ea;}
            .qcc-tip b{color:#667085;}
            .qcc-pick-selected{outline:2px solid #12b76a !important;outline-offset:1px !important;
                background:rgba(18,183,106,.1) !important;}
            .qcc-clicking{outline:3px solid #f79009 !important;outline-offset:1px !important;transition:outline .1s;}
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);

        statusEl        = document.getElementById('qcc-status');
        statusTextEl    = document.getElementById('qcc-status-text');
        listBox         = document.getElementById('qcc-list');
        listCountEl     = document.getElementById('qcc-list-count');
        intervalSlider  = document.getElementById('qcc-interval');
        intervalValueEl = document.getElementById('qcc-interval-value');
        intervalLabels  = panel.querySelectorAll('.qcc-range-labels span');

        intervalSlider.addEventListener('input', updateIntervalUI);
        intervalLabels.forEach(span => {
            span.addEventListener('click', () => {
                intervalSlider.value = span.dataset.idx;
                updateIntervalUI();
            });
        });
        updateIntervalUI();

        document.getElementById('qcc-auto-pick').addEventListener('click', autoPickLeftNav);
        document.getElementById('qcc-clearList').addEventListener('click', () => {
            clearSelected();
            setStatus('元素列表已清空', '');
        });

        document.getElementById('qcc-start').addEventListener('click', startClicking);
        document.getElementById('qcc-stop').addEventListener('click', stopClicking);

        document.getElementById('qcc-expandRight').addEventListener('click', () => {
            setStatus('正在展开目录…', 'running');
            setTimeout(expandAllChapters, 30);
        });

        document.getElementById('qcc-min').addEventListener('click', () => {
            const body = document.getElementById('qcc-body');
            body.classList.toggle('collapsed');
            document.getElementById('qcc-min').textContent =
                body.classList.contains('collapsed') ? '+' : '—';
        });
        document.getElementById('qcc-close').addEventListener('click', () => {
            stopClicking();
            panel.remove();
        });

        (function enableDrag() {
            const elDrag = document.getElementById('qcc-drag');
            let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
            elDrag.addEventListener('mousedown', (e) => {
                if (e.target.closest('.qcc-icon-btn')) return;
                dragging = true;
                startX = e.clientX; startY = e.clientY;
                const rect = panel.getBoundingClientRect();
                origX = rect.left; origY = rect.top;
                panel.style.right = 'auto';
                panel.style.left = origX + 'px';
                panel.style.top = origY + 'px';
                e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                let nx = origX + (e.clientX - startX);
                let ny = origY + (e.clientY - startY);
                nx = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, nx));
                ny = Math.max(0, Math.min(window.innerHeight - 40, ny));
                panel.style.left = nx + 'px';
                panel.style.top = ny + 'px';
            });
            document.addEventListener('mouseup', () => { dragging = false; });
        })();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (isRunning) {
                    stopClicking();
                    setStatus('ESC 已停止点击', '');
                }
            }
        });

        renderList();
        setStatus('等待操作', '');
    }

    /* ============================================================
     * 启动
     * ============================================================ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
    } else {
        buildPanel();
    }
})();