// ==UserScript==
// @name         新国开/国开/国家开放大学自动刷课+次数和时长（试用卡版）
// @namespace    https://scriptcat.org/
// @version      5.2.6
// @description 浅色/深色主题切换｜点击绿框保持｜未授权提示｜停止保留选择/退出选择才清空｜授权后全自动展开×2→选择→点击｜暂停继续｜2/4/6/8/10倍速｜10分钟保活
// @author       You
// @match        *://lms.ouchn.cn/*
// @icon         https://raw.githubusercontent.com/yrtyrtyrtygfr/cjtfky/main/gd1.png
// @grant        GM_xmlhttpRequest
// @connect      aitwo.icu
// @run-at       document-start
// @license      MPL-2.0
// ==/UserScript==
(function () {
    'use strict';
    if (window.__QCC_INSTALLED__) return;
    window.__QCC_INSTALLED__ = true;

    /* ===== 常量 ===== */
    const SERVER = 'https://aitwo.icu';
    const HB_MS = 50000, HB_FAIL = 3;
    const RAND_MIN = 2, RAND_MAX = 12;
    const V_WAIT = 15000, V_POLL = 300;
    const EXPAND_LIMIT = 5800, EXPAND_LOOPS = 50, EXPAND_GAP = 25, EXPAND_LOOP_GAP = 100, EXPAND_ROUND_GAP = 2000;
    const ROOTS_MS = 300, LOG_MAX = 80;
    const SPEEDS = [2, 4, 6, 8, 10];
    const V_GRACE = 15000, V_STUCK = 30;
    const TRIAL = 'CS-2VJY5A5T7Q';
    const UI_SCALE = 1.00;
    const K = { AUTH: 'qcc_auth_code_v3', EXP: 'qcc_auth_expire_v3', DEV: 'qcc_device_id', CFG: 'qcc_cfg_v2', THEME: 'qcc_theme_v1' };

    /* ===== 状态 ===== */
    let authCode = '', authorized = false;
    let heartbeatTimer = null, hbFail = 0;
    let syncAuthUI = null;
    let isDarkTheme = false;

    const DEVICE_ID = (() => {
    try {
        // 尝试恢复
        let id = localStorage.getItem(K.DEV);
        if (id) return id;
        
        // 生成：指纹 + 随机
        const parts = [
            navigator.hardwareConcurrency || 0,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.platform || '',
            navigator.language || ''
        ].join('|');
        let h = 0;
        for (let i = 0; i < parts.length; i++) h = ((h << 5) - h + parts.charCodeAt(i)) | 0;
        const fp = (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
        const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
        id = fp + '-' + rand + 'FP';
        
        localStorage.setItem(K.DEV, id);
        try { document.cookie = `${K.DEV}=${id}; max-age=31536000; path=/`; } catch (e) {}
        return id;
    } catch (e) {
        return 'FB' + Date.now().toString(16).slice(-6).toUpperCase() + 'FP';
    }
})();

    /* ===== 主题 ===== */
    function loadTheme() {
        try {
            const t = localStorage.getItem(K.THEME);
            if (t === 'dark') isDarkTheme = true;
            else if (t === 'light') isDarkTheme = false;
            else isDarkTheme = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches);
        } catch (e) { isDarkTheme = false; }
    }
    function applyTheme() {
        if (!panel) return;
        panel.classList.toggle('qcc-dark', isDarkTheme);
        const toggle = document.getElementById('qcc-theme-toggle');
        if (toggle) toggle.checked = isDarkTheme;
        try {
            panel.querySelectorAll('.qcc-theme-label').forEach(l => {
                const isDarkLabel = l.dataset.theme === 'dark';
                l.classList.toggle('active', isDarkTheme === isDarkLabel);
            });
        } catch (e) {}
        try { localStorage.setItem(K.THEME, isDarkTheme ? 'dark' : 'light'); } catch (e) {}
    }

    /* ===== 授权 ===== */
    const api = (path, data) => new Promise((res, rej) => {
        GM_xmlhttpRequest({
            method: 'POST', url: SERVER + path, headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify(data || {}), timeout: 10000,
            onload: r => { try { res(JSON.parse(r.responseText || '{}')); } catch (e) { rej(); } },
            onerror: rej, ontimeout: rej
        });
    });
    const verify = async code => { try { const r = await api('/api/verify', { card: code, mac: DEVICE_ID }); return r && typeof r === 'object' ? r : null; } catch (e) { return null; } };

    async function doVerify(raw) {
        const code = (raw || '').trim();
        if (!code) return { ok: false, msg: '请输入卡密' };
        const res = await verify(code);
        if (!res) return { ok: false, msg: '❌ 网络请求失败，请检查网络后重试' };
        if (res.ok) {
            authorized = true; authCode = code;
            localStorage.setItem(K.AUTH, code);
            console.log('[QCC] 服务器返回：', res);
            let days = NaN, lifetime = false;
            if (typeof res.days === 'number') days = res.days;
            else if (typeof res.days === 'string' && res.days !== 'lifetime') days = parseInt(res.days, 10);
            else if (typeof res.remaining_days === 'number') days = res.remaining_days;
            else if (typeof res.remaining === 'number') days = res.remaining;
            else if (typeof res.duration === 'number') days = res.duration;
            if (res.lifetime === true || res.days === -1 || res.days === 'lifetime') lifetime = true;
            if (typeof res.expire === 'number' && res.expire > 1e12) localStorage.setItem(K.EXP, String(res.expire));
            else if (typeof res.expire === 'string' && !isNaN(Date.parse(res.expire))) localStorage.setItem(K.EXP, String(Date.parse(res.expire)));
            else if (lifetime) localStorage.setItem(K.EXP, 'lifetime');
            else if (!isNaN(days) && days > 0) localStorage.setItem(K.EXP, String(Date.now() + days * 864e5));
            else localStorage.removeItem(K.EXP);
            startHB();
            if (syncAuthUI) try { syncAuthUI(); } catch (e) {}
            const tail = lifetime ? '（终身有效）' : (!isNaN(days) && days > 0 ? `（剩余 ${days} 天）` : (typeof res.expire !== 'undefined' ? `（到期：${new Date(res.expire).toLocaleDateString()}）` : '（已授权）'));
            return { ok: true, msg: '✅ ' + (res.msg || '验证通过') + tail };
        }
        return { ok: false, msg: '❌ ' + (res.msg || (res.code === 'device_mismatch' ? '设备不匹配（请在后台解绑该卡密或改用新卡密）' : '验证失败')) };
    }
    function startHB() {
        stopHB(); hbFail = 0;
        heartbeatTimer = setInterval(async () => {
            if (!authorized || !authCode) return;
            const r = await verify(authCode);
            if (r && r.ok) { hbFail = 0; return; }
            if (++hbFail >= HB_FAIL) {
                authorized = false; stopHB();
                if (typeof stopClicking === 'function') stopClicking();
                if (syncAuthUI) try { syncAuthUI(); } catch (e) {}
                setStatus('⚠️ 网络异常，卡密已保留，请重新验证', '');
                addLog('⚠️ 卡密心跳失败（已保留卡密）', 'err');
            }
        }, HB_MS);
    }
    function stopHB() { if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; } hbFail = 0; }

    async function loadAuth() {
        let saved = '';
        try { saved = (localStorage.getItem(K.AUTH) || '').trim(); } catch (e) { return; }
        if (!saved) return;
        const ex = parseInt(localStorage.getItem(K.EXP) || '0', 10);
        if (ex && ex < Date.now()) { try { localStorage.removeItem(K.AUTH); localStorage.removeItem(K.EXP); } catch (e) {} return; }
        const r = await verify(saved);
        if (!r || !r.ok) { authCode = saved; return; }
        authCode = saved; authorized = true; startHB();
    }

    /* ===== 配置 ===== */
    function loadCfg() {
        try {
            const c = JSON.parse(localStorage.getItem(K.CFG) || '{}');
            if (typeof c.autoPlayVideo === 'boolean') autoPlayVideo = c.autoPlayVideo;
            if (SPEEDS.includes(c.videoSpeed)) videoSpeed = c.videoSpeed;
            if (typeof c.maxClicks === 'number' && c.maxClicks >= 0) maxClicks = c.maxClicks;
        } catch (e) {}
    }
    const saveCfg = () => { try { localStorage.setItem(K.CFG, JSON.stringify({ autoPlayVideo, videoSpeed, maxClicks })); } catch (e) {} };

    /* ===== Shadow DOM ===== */
    const shadowMap = new Map(), nativeAttach = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
        const r = nativeAttach.call(this, init);
        try { shadowMap.set(this, r); } catch (e) {}
        return r;
    };
    const getShadow = el => (el && el.nodeType === 1) ? (el.shadowRoot || shadowMap.get(el) || null) : null;
    let rootsCache = null, rootsObs = null, rootsDirty = true, rootsLast = 0;
    function ensureRootsObs() {
        if (rootsObs || !document.documentElement) return;
        try { rootsObs = new MutationObserver(() => { rootsDirty = true; }); rootsObs.observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { rootsObs = null; }
    }
    function getAllRoots() {
        if (!rootsDirty && rootsCache) return rootsCache;
        const now = Date.now();
        if (rootsCache && now - rootsLast < ROOTS_MS) return rootsCache;
        ensureRootsObs();
        const roots = [document], seen = new Set(roots);
        for (let i = 0; i < roots.length; i++) {
            let all;
            try { all = roots[i].querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) { const sr = getShadow(el); if (sr && !seen.has(sr)) { seen.add(sr); roots.push(sr); } }
        }
        rootsCache = roots; rootsDirty = false; rootsLast = now; return roots;
    }

    /* ===== 通用工具 ===== */
    const reportErr = (tag, err, log) => { console.warn(`[QCC] ${tag}:`, err); if (log) addLog(`⚠️ ${tag}：${(err && err.message) || err}`, 'err'); };

    function realClick(el) {
        if (!el) return false;
        try {
            const r0 = el.getBoundingClientRect();
            if (r0.top < 0 || r0.bottom > innerHeight || r0.left < 0 || r0.right > innerWidth) {
                try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); } catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
            }
        } catch (e) {}
        let r;
        try { r = el.getBoundingClientRect(); } catch (e) { r = { left: 0, top: 0, width: 1, height: 1 }; }
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, detail: 1 };
        try {
            if (window.PointerEvent) { try { el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, base, { buttons: 1, pointerId: 1, pointerType: 'mouse', isPrimary: true }))); } catch (e) {} }
            el.dispatchEvent(new MouseEvent('mousedown', Object.assign({}, base, { buttons: 1 })));
            el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
            el.dispatchEvent(new MouseEvent('click', Object.assign({}, base, { buttons: 0 })));
        } catch (e) { return false; }
        return true;
    }
    const pickClick = el => { let c = el; for (let i = 0; i < 4 && c; i++) { try { if (getComputedStyle(c).cursor === 'pointer') return c; } catch (e) {} c = c.parentElement; } return el; };
    const isBold = el => {
        if (!el || el.nodeType !== 1) return false;
        const t = (el.tagName || '').toUpperCase();
        if (t === 'STRONG' || t === 'B' || /^H[1-6]$/.test(t)) return true;
        try { const n = parseInt(getComputedStyle(el).fontWeight, 10) || 0; return n >= 600; } catch (e) { return false; }
    };
    const randDelay = () => Math.round((Math.random() * (RAND_MAX - RAND_MIN) + RAND_MIN) * 1000);

    /* ===== Worker ===== */
    const workerSrc = `let t=null;self.onmessage=e=>{if(e.data.cmd==='start'){if(t)clearInterval(t);t=setInterval(()=>self.postMessage({tick:1}),e.data.ms||1000);}else if(e.data.cmd==='stop'){if(t){clearInterval(t);t=null;}}};`;
    let worker = null;
    const getWorker = () => {
        if (worker) return worker;
        try { worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'application/javascript' }))); } catch (e) { worker = null; }
        return worker;
    };
    let delayResolve = null, delayTimer = null;
    function interruptDelay() {
        if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }
        if (delayResolve) { const r = delayResolve; delayResolve = null; r(); }
    }
    function waitDelay(ms) {
        return new Promise(res => {
            delayResolve = () => { delayResolve = null; res(); };
            const w = getWorker();
            if (w) {
                const h = e => {
                    if (e.data && e.data.tick) {
                        w.removeEventListener('message', h);
                        try { w.postMessage({ cmd: 'stop' }); } catch (_) {}
                        if (delayResolve) { const r = delayResolve; delayResolve = null; r(); }
                    }
                };
                w.addEventListener('message', h, { once: true });
                try { w.postMessage({ cmd: 'start', ms }); } catch (e) {
                    try { w.removeEventListener('message', h); } catch (e2) {}
                    delayTimer = setTimeout(() => { if (delayResolve) { const r = delayResolve; delayResolve = null; r(); } }, ms);
                }
            } else delayTimer = setTimeout(() => { if (delayResolve) { const r = delayResolve; delayResolve = null; r(); } }, ms);
        });
    }

    /* ===== 保活（7 层）===== */
    let keepAudio = null, wakeLock = null, visPatched = false, pauseHardPatched = false;
    let superTimer = null, markerTimer = null, recoverCount = 0;

    function patchVisibility() {
        if (visPatched) return; visPatched = true;
        try {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        } catch (e) {}
    }
    function patchPause() {
        if (window.__QCC_PAUSE__) return;
        window.__QCC_PAUSE__ = true;
        try {
            const orig = HTMLMediaElement.prototype.pause;
            window.__QCC_ORIG_PAUSE__ = orig;
            HTMLMediaElement.prototype.pause = function () {
                if (!isRunning || this.ended) return orig.call(this);
                if (document.hidden) return;
                return orig.call(this);
            };
        } catch (e) {}
    }
    function patchPauseHard() {
        if (pauseHardPatched) return; pauseHardPatched = true;
        try {
            const cur = HTMLMediaElement.prototype.pause;
            HTMLMediaElement.prototype.pause = function () {
                if (this.dataset && this.dataset.qccForce === '1' && !this.ended) return;
                return cur.call(this);
            };
        } catch (e) {}
    }
    function markVideos() {
        try { document.querySelectorAll('video').forEach(v => { v.dataset.qccForce = '1'; if (!v.dataset.qccLast) v.dataset.qccLast = '0'; if (!v.dataset.qccStuck) v.dataset.qccStuck = '0'; }); } catch (e) {}
    }
    function startSuperKA() {
        if (superTimer) return;
        patchPauseHard(); markVideos(); recoverCount = 0;
        superTimer = setInterval(() => {
            if (!isRunning) return;
            try {
                document.querySelectorAll('video').forEach(v => {
                    if (v.dataset.qccGiveUp === '1') return;
                    const ct = v.currentTime || 0;
                    v.dataset.qccStuck = String(v.dataset.qccLast === String(ct) ? parseInt(v.dataset.qccStuck || '0', 10) + 1 : 0);
                    v.dataset.qccLast = String(ct);
                    if (v.paused && !v.ended && ct > 0) {
                        recoverCount++;
                        if (recoverCount % 3 === 0) console.log('[QCC] 已恢复 ' + recoverCount + ' 次');
                        v.play().catch(() => {});
                    }
                    if (parseInt(v.dataset.qccStuck, 10) >= 30 && v.dataset.qccGiveUp !== '1') {
                        v.dataset.qccGiveUp = '1';
                        addLog('⚠️ 视频卡顿，建议刷新页面 / 换网络 / 换课程', 'err');
                    }
                });
            } catch (e) {}
        }, 1000);
        markerTimer = setInterval(markVideos, 3000);
    }
    function stopSuperKA() {
        if (superTimer) { clearInterval(superTimer); superTimer = null; }
        if (markerTimer) { clearInterval(markerTimer); markerTimer = null; }
        recoverCount = 0;
        try { document.querySelectorAll('video').forEach(v => { delete v.dataset.qccForce; delete v.dataset.qccLast; delete v.dataset.qccStuck; delete v.dataset.qccGiveUp; }); } catch (e) {}
    }
    function startMediaSession() { try { if ('mediaSession' in navigator) { navigator.mediaSession.playbackState = 'playing'; try { navigator.mediaSession.metadata = new MediaMetadata({ title: '学习视频', artist: '国开' }); } catch (e) {} } } catch (e) {} }
    async function reqWakeLock() {
        try {
            if ('wakeLock' in navigator && !wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; if (isRunning) setTimeout(reqWakeLock, 1000); });
            }
        } catch (e) {}
    }
    function startKA() {
        if (keepAudio) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const osc = ctx.createOscillator(), g = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = 440; g.gain.value = 0.00005;
            osc.connect(g).connect(ctx.destination); osc.start();
            const rt = setInterval(() => { try { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch (e) {} }, 30000);
            keepAudio = { ctx, osc, rt };
        } catch (e) {}
    }
    function stopKA() { try { if (keepAudio) { clearInterval(keepAudio.rt); keepAudio.osc.stop(); keepAudio.ctx.close(); } } catch (e) {} keepAudio = null; }
    function enableKA() { patchVisibility(); patchPause(); startMediaSession(); startKA(); reqWakeLock(); startSuperKA(); }
    function disableKA() { stopKA(); try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} stopSuperKA(); }

    /* ===== 全局状态 ===== */
    let panel, statusEl, statusTextEl, listCountEl;
    let leftNavCache = null, selectedEls = [], isRunning = false, isPaused = false;
    let clickTimer = null, clickIndex = 0, clickedTotal = 0, maxClicks = 0;
    let expanding = false, picking = false, processingVideo = false, preparing = false;
    let currentClickingEl = null, clickHighlightTimer = null;
    const clickCountMap = new WeakMap();

    /* ===== 缩放 ===== */
    function calcScale() {
        const w = innerWidth, h = innerHeight;
        let s = w >= 3600 ? 1.40 : w >= 2800 ? 1.25 : w >= 2200 ? 1.10 : w >= 1920 ? 1.00 : w >= 1600 ? 0.92 : w >= 1400 ? 0.85 : w >= 1200 ? 0.78 : 0.72;
        if (h < 720 && s > 0.9) s = 0.9;
        if (h < 600 && s > 0.8) s = 0.8;
        return s * UI_SCALE;
    }
    function applyScale() {
        if (!panel) return;
        const s = calcScale();
        if ('zoom' in panel.style) panel.style.zoom = s;
        else { panel.style.transformOrigin = 'top right'; panel.style.transform = `scale(${s})`; }
    }

    /* ===== 统计与日志 ===== */
    const runStats = { start: 0, last: 0, vCount: 0, vSec: 0 };
    let logEntries = [], logListEl = null, statRT = null, statV = null, statVC = null, statC = null;
    let logTimer = null;
    const _vRec = new WeakSet();

    const fmtHMS = s => { s = Math.max(0, Math.floor(s || 0)); return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    const fmtMS = s => { s = Math.max(0, s || 0); if (s < 60) return `${s.toFixed(0)}秒`; const m = s / 60; return m < 60 ? `${m.toFixed(1)}分钟` : `${Math.floor(m / 60)}小时${(m % 60).toFixed(0)}分`; };

    function addLog(text, type) {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        logEntries.push({ time, text, type: type || '' });
        if (logEntries.length > LOG_MAX) { logEntries.shift(); renderLog(); return; }
        if (!logListEl) return;
        if (logEntries.length === 1) logListEl.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'qcc-log-item' + (type ? ' ' + type : '');
        const t = document.createElement('span'); t.className = 'qcc-log-time'; t.textContent = time;
        const x = document.createElement('span'); x.className = 'qcc-log-text'; x.textContent = text;
        row.append(t, x);
        logListEl.insertBefore(row, logListEl.firstChild);
    }
    function renderLog() {
        if (!logListEl) return;
        if (!logEntries.length) { logListEl.innerHTML = '<div class="qcc-log-empty">暂无日志</div>'; return; }
        logListEl.innerHTML = logEntries.slice().reverse().map(e => {
            const cls = 'qcc-log-item' + (e.type ? ' ' + e.type : '');
            return `<div class="${cls}"><span class="qcc-log-time">${e.time}</span><span class="qcc-log-text">${e.text.replace(/</g, '&lt;')}</span></div>`;
        }).join('');
    }
    function updateStats() {
        if (!statRT) return;
        const rt = isRunning ? (Date.now() - runStats.start) / 1000 : runStats.last;
        statRT.textContent = fmtHMS(rt);
        statV.textContent = fmtMS(runStats.vSec);
        statVC.textContent = runStats.vCount + '个';
        statC.textContent = clickedTotal + '次';
    }
    function resetStats() {
        logEntries = []; runStats.vCount = 0; runStats.vSec = 0; runStats.last = 0;
        if (isRunning) runStats.start = Date.now();
        clickedTotal = 0;
        renderLog(); updateStats();
    }
    function recVideo(video, sec) {
        if (!video || _vRec.has(video)) return;
        _vRec.add(video);
        let w = sec;
        if (typeof w !== 'number' || !isFinite(w) || w < 1) {
            try { const ct = video.currentTime || 0, d = video.duration; w = (isFinite(d) && d > 0) ? Math.min(ct, d) : ct; } catch (e) { w = 0; }
        }
        if (!isFinite(w) || w < 1) return;
        runStats.vSec += w; runStats.vCount++;
        addLog(`🎬 视频完成 +${fmtMS(w)}（累计 ${fmtMS(runStats.vSec)} / ${runStats.vCount}个）`, 'ok');
        updateStats();
    }

    /* ===== 授权时间显示 ===== */
    function updateAuthTime() {
        const at = document.getElementById('qcc-auth-time');
        if (!at) return;
        let info;
        if (!authorized) info = authCode ? { text: '待验证', cls: 'warn' } : { text: '未授权', cls: '' };
        else {
            const raw = localStorage.getItem(K.EXP) || '';
            if (raw === 'lifetime') info = { text: 'VIP · 终身有效', cls: 'ok' };
            else {
                const ex = parseInt(raw, 10);
                if (!ex || ex <= 0) info = { text: 'VIP · 已授权', cls: 'ok' };
                else {
                    const left = ex - Date.now();
                    if (left <= 0) info = { text: 'VIP · 已过期', cls: 'err' };
                    else {
                        const d = Math.ceil(left / 864e5);
                        if (d > 30) { const dt = new Date(ex); info = { text: `VIP · 至 ${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`, cls: 'ok' }; }
                        else if (d > 3) info = { text: `VIP · 剩余 ${d} 天`, cls: 'ok' };
                        else info = { text: `VIP · 仅剩 ${d} 天`, cls: 'warn' };
                    }
                }
            }
        }
        at.textContent = info.text;
        at.className = 'qcc-auth-time' + (info.cls ? ' ' + info.cls : '');
    }

    /* ===== UI 状态 ===== */
    function setStatus(text, cls) { if (!statusTextEl) return; statusTextEl.textContent = text; statusEl.className = 'qcc-status' + (cls ? ' ' + cls : ''); }
    function getElText(el) {
        if (!el) return '未知元素';
        const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
        return t ? (t.length > 30 ? t.slice(0, 30) + '…' : t) : `[${(el.tagName || 'el').toLowerCase()}]`;
    }
    function renderList() {
        if (!listCountEl) return;
        listCountEl.textContent = selectedEls.length + '个';
    }
    function clearClickHighlight() {
        if (clickHighlightTimer) { clearInterval(clickHighlightTimer); clickHighlightTimer = null; }
        try { document.querySelectorAll('.qcc-clicking').forEach(x => x.classList.remove('qcc-clicking')); } catch (e) {}
        currentClickingEl = null;
    }
    function clearSelected() {
        clearClickHighlight();
        selectedEls.forEach(el => { try { el.classList.remove('qcc-pick-selected'); } catch (e) {} });
        selectedEls = [];
        renderList();
    }
    function updateRunButtons() {
        const b1 = document.getElementById('qcc-start'), b2 = document.getElementById('qcc-stop'), b3 = document.getElementById('qcc-pause');
        if (b1) { b1.disabled = isRunning; b1.innerHTML = preparing ? '<span class="qcc-btn-icon">⏳</span> 准备中…' : '<span class="qcc-btn-icon">▶</span> 开始'; }
        if (b2) b2.disabled = false;
        if (b3) {
            b3.disabled = !isRunning || preparing;
            b3.innerHTML = isPaused ? '<span class="qcc-btn-icon">▶</span> 继续' : '<span class="qcc-btn-icon">⏸</span> 暂停';
        }
    }

    /* ===== 手动选择 ===== */
    let manualPicking = false, hoverEl = null, overH = null, clickH = null;
    function pickTarget(el) {
        if (!el || el.nodeType !== 1 || (panel && panel.contains(el))) return null;
        let c = el;
        for (let i = 0; i < 5 && c; i++) {
            const t = (c.tagName || '').toUpperCase();
            if (t === 'A') return c;
            if (c.getAttribute && c.getAttribute('href')) return c;
            try { if (getComputedStyle(c).cursor === 'pointer') return c; } catch (e) {}
            c = c.parentElement;
        }
        return el;
    }
    function updatePickBtn() {
        const b = document.getElementById('qcc-auto-pick');
        if (!b) return;
        b.innerHTML = manualPicking ? '<span class="qcc-btn-icon">✋</span> 退出选择' : '<span class="qcc-btn-icon">👆</span> 手动选择';
    }
    function enterPick() {
        if (manualPicking) return;
        manualPicking = true;
        overH = e => {
            const el = pickTarget(e.target);
            if (!el || hoverEl === el) return;
            if (hoverEl) try { hoverEl.classList.remove('qcc-manual-hover'); } catch (e) {}
            hoverEl = el; try { el.classList.add('qcc-manual-hover'); } catch (e) {}
        };
        clickH = e => {
            if (panel && panel.contains(e.target)) return;
            e.preventDefault(); e.stopPropagation();
            const el = pickTarget(e.target);
            if (!el || selectedEls.includes(el)) return;
            selectedEls.push(el);
            try { el.classList.add('qcc-pick-selected'); } catch (e) {}
            renderList();
            setStatus(`👆 手动选择中… 已添加 ${selectedEls.length} 个元素`, 'running');
        };
        document.addEventListener('mouseover', overH, true);
        document.addEventListener('click', clickH, true);
        try { document.body.style.cursor = 'crosshair'; } catch (e) {}
        updatePickBtn();
        setStatus('👆 手动选择：点击页面中的学习内容添加', 'running');
    }
    function exitPick(clear) {
        if (!manualPicking) return;
        manualPicking = false;
        if (overH) try { document.removeEventListener('mouseover', overH, true); } catch (e) {}
        if (clickH) try { document.removeEventListener('click', clickH, true); } catch (e) {}
        if (hoverEl) { try { hoverEl.classList.remove('qcc-manual-hover'); } catch (e) {} hoverEl = null; }
        try { document.body.style.cursor = ''; } catch (e) {}
        updatePickBtn();
        if (clear) {
            const n = selectedEls.length;
            clearSelected();
            setStatus(n > 0 ? `已退出选择，已清空 ${n} 个元素` : '已退出选择', '');
            if (n > 0) addLog(`🗑️ 已退出选择，清空 ${n} 个元素`, '');
        } else {
            setStatus(selectedEls.length > 0 ? `已退出选择，保留 ${selectedEls.length} 个元素` : '已退出选择', '');
        }
    }

    /* ===== 展开 ===== */
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function expandAll() {
        if (expanding) return;
        expanding = true; leftNavCache = null; rootsDirty = true;
        const st = Date.now(), dl = st + EXPAND_LIMIT;
        let total = 0;
        const once = new WeakSet();
        setStatus('🔍 正在展开目录…', 'running');
        addLog('📂 开始展开目录…', '');
        try {
            for (let loop = 0; loop < EXPAND_LOOPS; loop++) {
                if (Date.now() > dl) break;
                const arrows = [], seen = new Set();
                for (const root of getAllRoots()) {
                    let items;
                    try { items = root.querySelectorAll('[class*="sub-menu-title"]'); } catch (e) { continue; }
                    for (const el of items) {
                        if (seen.has(el) || once.has(el) || (panel && panel.contains(el))) continue;
                        seen.add(el);
                        const svg = el.querySelector('svg.svg-icon');
                        if (!svg) continue;
                        const s = svg.getAttribute('style') || '';
                        if (s.includes('rotate(180deg)')) continue;
                        arrows.push({ svg, parent: el });
                    }
                }
                if (!arrows.length) break;
                setStatus(`展开中… 剩 ${arrows.length} 个，已点 ${total}`, 'running');
                for (const { svg, parent } of arrows) {
                    if (Date.now() > dl) break;
                    if (!svg.isConnected) continue;
                    try { realClick(svg); total++; once.add(parent); } catch (e) {}
                    await sleep(EXPAND_GAP);
                }
                await sleep(EXPAND_LOOP_GAP);
                leftNavCache = null;
            }
            const el = ((Date.now() - st) / 1000).toFixed(2);
            setStatus(`展开完成，共点击 ${total} 个（${el}秒）`, '');
            addLog(`📂 展开完成：点击 ${total} 个（${el}s）`, 'ok');
        } finally { expanding = false; leftNavCache = null; rootsDirty = true; }
    }

    /* ===== 自动选择 ===== */
    function findLeftNav() {
        if (leftNavCache && leftNavCache.isConnected) return leftNavCache;
        for (const root of getAllRoots()) {
            let all;
            try { all = root.querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) {
                if (panel && panel.contains(el)) continue;
                let s;
                try { s = getComputedStyle(el); } catch (e) { continue; }
                if (s.overflowY !== 'auto' && s.overflowY !== 'scroll') continue;
                let r;
                try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                if (r.width < 100 || r.width > 400 || r.left > 100) continue;
                if (el.scrollHeight < el.clientHeight) continue;
                leftNavCache = el; return el;
            }
        }
        return null;
    }
    function inLeftNav(el) {
        const nav = findLeftNav();
        if (!nav) try { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left <= 280; } catch (e) { return false; }
        return nav.contains(el);
    }
    function resolveTarget(el) {
        let c = el;
        for (let i = 0; i < 4 && c; i++) {
            const t = (c.tagName || '').toUpperCase();
            if (t === 'A') return c;
            if (c.getAttribute && c.getAttribute('href')) return c;
            try { if (getComputedStyle(c).cursor === 'pointer') return c; } catch (e) {}
            c = c.parentElement;
        }
        return el;
    }
    function collect() {
        const out = new Set();
        for (const root of getAllRoots()) {
            let list;
            try { list = root.querySelectorAll('.text-too-long'); } catch (e) { list = []; }
            for (const el of list) {
                if (panel && panel.contains(el) || isBold(el) || !inLeftNav(el)) continue;
                let r;
                try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                if (r.width < 20 || r.height < 8) continue;
                let s;
                try { s = getComputedStyle(el); } catch (e) { continue; }
                if (s.display === 'none' || s.visibility === 'hidden') continue;
                if (!(el.textContent || '').trim()) continue;
                out.add(resolveTarget(el));
            }
        }
        if (!out.size) {
            for (const root of getAllRoots()) {
                let all;
                try { all = root.querySelectorAll('*'); } catch (e) { continue; }
                for (const el of all) {
                    if (panel && panel.contains(el) || isBold(el) || !inLeftNav(el)) continue;
                    let r;
                    try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                    if (r.width < 30 || r.height < 12 || r.height > 60) continue;
                    let s;
                    try { s = getComputedStyle(el); } catch (e) { continue; }
                    if (s.cursor !== 'pointer' || s.display === 'none') continue;
                    const t = (el.textContent || '').trim();
                    if (!t || t.length > 80) continue;
                    out.add(el);
                }
            }
        }
        return out;
    }
    async function autoPick() {
        if (picking) return;
        picking = true;
        clearSelected(); leftNavCache = null;
        setStatus('🔍 正在选择…', 'running');
        try {
            await sleep(200);
            leftNavCache = null;
            for (const el of collect()) {
                if (selectedEls.includes(el)) continue;
                selectedEls.push(el);
                try { el.classList.add('qcc-pick-selected'); } catch (e) {}
            }
            renderList();
            setStatus(selectedEls.length === 0 ? '⚠️ 未找到可点击链接' : `✅ 已选择 ${selectedEls.length} 个可点击链接`, '');
            addLog(`🔍 选择完成：${selectedEls.length} 个可点击元素`, selectedEls.length ? 'ok' : '');
        } finally { picking = false; leftNavCache = null; }
    }

    /* ===== 视频 ===== */
    let autoPlayVideo = false, videoSpeed = 2;

    function allVideos() {
        const out = [], seen = new Set();
        const add = vs => { for (const v of vs) if (v.isConnected && !seen.has(v)) { seen.add(v); out.push(v); } };
        for (const root of getAllRoots()) { let vs; try { vs = root.querySelectorAll('video'); } catch (e) { continue; } add(vs); }
        const docs = [document];
        for (let i = 0; i < docs.length; i++) {
            let ifs;
            try { ifs = docs[i].querySelectorAll('iframe'); } catch (e) { continue; }
            for (const f of ifs) { try { const d = f.contentDocument; if (d && !docs.includes(d)) docs.push(d); } catch (e) {} }
        }
        for (const d of docs) { let vs; try { vs = d.querySelectorAll('video'); } catch (e) { continue; } add(vs); }
        return out;
    }
    const vKey = v => (v.currentSrc || v.src || '') + '::' + (v.getAttribute('data-src') || '');
    const snapVKeys = () => new Set(allVideos().map(vKey));
    async function waitNewVideo(oldKeys, maxMs) {
        const st = Date.now();
        while (Date.now() - st < maxMs) {
            for (const v of allVideos()) { const k = vKey(v); if (k && !oldKeys.has(k)) return v; }
            await sleep(V_POLL);
        }
        return null;
    }
    async function waitMeta(v, ms = 8000) {
        if (v.readyState >= 1) return true;
        return await new Promise(res => {
            const t = setTimeout(() => { v.removeEventListener('loadedmetadata', on); res(false); }, ms);
            const on = () => { clearTimeout(t); res(true); };
            v.addEventListener('loadedmetadata', on, { once: true });
        });
    }
    async function playVideo(video) {
        await waitMeta(video, 8000);
        const fr = () => { try { if (video.playbackRate !== videoSpeed) video.playbackRate = videoSpeed; if (video.defaultPlaybackRate !== videoSpeed) video.defaultPlaybackRate = videoSpeed; } catch (e) {} };
        const fm = () => { try { if (!video.muted) video.muted = true; if (video.volume !== 0) video.volume = 0; } catch (e) {} };
        const onPause = () => { if (!isRunning) return; setTimeout(() => { if (video.paused && video.isConnected && isRunning) video.play().catch(() => {}); }, 200); };
        const onRC = () => { if (video.playbackRate !== videoSpeed) fr(); };
        const onVC = () => fm();
        let watched = 0, lastCT = 0;
        const onTU = () => { const ct = video.currentTime || 0; const d = ct - lastCT; if (d > 0 && d < 2) watched += d; lastCT = ct; };
        video.addEventListener('ratechange', onRC);
        video.addEventListener('pause', onPause);
        video.addEventListener('volumechange', onVC);
        video.addEventListener('timeupdate', onTU);
        const rt = setInterval(fr, 500);
        const kt = setInterval(() => {
            if (!isRunning) return;
            try { if (video.paused && !video.ended && video.isConnected) video.play().catch(() => {}); fm(); fr(); } catch (e) {}
        }, 2000);
        const cleanup = () => {
            video.removeEventListener('ratechange', onRC); video.removeEventListener('pause', onPause);
            video.removeEventListener('volumechange', onVC); video.removeEventListener('timeupdate', onTU);
            clearInterval(rt); clearInterval(kt);
        };
        try {
            video.muted = true; video.volume = 0; fr();
            try { video.currentTime = 0; } catch (e) {}
            await video.play(); fr();
            try { video.currentTime = 0; } catch (e) {}
        } catch (e) { reportErr('视频 play() 失败', e, true); cleanup(); return false; }
        await new Promise(res => {
            let last = -1, stuck = 0;
            const st = Date.now();
            const check = () => {
                if (!video.isConnected || video.ended) return res();
                const ct = video.currentTime || 0, d = video.duration || 0;
                if (d > 0 && isFinite(d) && ct >= d - 0.3) return res();
                if (Date.now() - st > V_GRACE) {
                    if (ct > 0 && Math.abs(ct - last) < 0.05) { stuck++; if (stuck > V_STUCK) return res(); } else stuck = 0;
                }
                last = ct; fr(); fm(); setTimeout(check, 500);
            };
            check();
        });
        cleanup();
        try { recVideo(video, watched); } catch (e) {}
        return true;
    }

    /* ===== 主循环 ===== */
    function highlightClick(el) {
        try { document.querySelectorAll('.qcc-clicking').forEach(x => x.classList.remove('qcc-clicking')); } catch (e) {}
        try { el.classList.add('qcc-clicking'); } catch (e) {}
        currentClickingEl = el;
        if (clickHighlightTimer) clearInterval(clickHighlightTimer);
        clickHighlightTimer = setInterval(() => {
            if (!currentClickingEl) return;
            try { if (currentClickingEl.isConnected && !currentClickingEl.classList.contains('qcc-clicking')) currentClickingEl.classList.add('qcc-clicking'); } catch (e) {}
        }, 150);
    }

    async function doClick() {
        if (!isRunning || processingVideo) return;
        if (!selectedEls.length) { stopClicking(); setStatus('没有可点击的元素', ''); return; }
        selectedEls = selectedEls.filter(el => el.isConnected);
        if (!selectedEls.length) { stopClicking(); setStatus('所有元素已从页面移除', ''); renderList(); return; }
        if (maxClicks > 0 && clickedTotal >= maxClicks) {
            setStatus(`✅ 已达最大点击次数 ${maxClicks}，自动停止`, 'ok');
            addLog(`✅ 已达最大点击次数 ${maxClicks}`, 'ok');
            stopClicking(); return;
        }
        const el = selectedEls[clickIndex % selectedEls.length];
        const oldKeys = snapVKeys();
        const label = getElText(el);
        try { realClick(pickClick(el) || el); highlightClick(el); } catch (e) {}
        clickedTotal++; clickIndex++;
        clickCountMap.set(el, (clickCountMap.get(el) || 0) + 1);
        renderList();
        setStatus(`执行中… [${label}] 已点击 ${clickedTotal} 次`, 'running');
        addLog(`👆 第 ${clickedTotal} 次：${label}`, '');
        updateStats();
        if (!autoPlayVideo) return;
        const video = await waitNewVideo(oldKeys, V_WAIT);
        if (!video) { addLog('⏳ 未检测到新视频（跳过）', ''); return; }
        processingVideo = true; updateRunButtons();
        setStatus(`🎬 检测到新视频，正在 ${videoSpeed} 倍速静音播放…`, 'running');
        addLog(`🎬 检测到视频，${videoSpeed}x 静音播放中…`, '');
        try { await playVideo(video); if (isRunning) setStatus('✅ 视频播放完成，准备下一个', ''); }
        catch (e) { reportErr('播放异常', e, false); }
        finally { processingVideo = false; updateRunButtons(); }
    }

    let loopRunning = false;
    async function mainLoop() {
        if (loopRunning || !isRunning) return;
        loopRunning = true;
        try {
            while (isRunning) {
                while (isPaused && isRunning) await sleep(300);
                if (!isRunning) break;
                await doClick();
                if (!isRunning) break;
                if (isPaused) continue;
                await waitDelay(randDelay());
            }
        } finally { loopRunning = false; }
    }

    async function startClicking() {
        if (isRunning) return;
        if (manualPicking) exitPick(false);
        if (!selectedEls.length && !authorized) {
            setStatus('请先手动选择元素，或授权后自动处理', '');
            addLog('⚠️ 无法开始：未授权且未选择任何元素', 'err');
            return;
        }
        interruptDelay();
        try { if (worker) worker.postMessage({ cmd: 'stop' }); } catch (e) {}
        isRunning = true; isPaused = false; processingVideo = false; preparing = false;
        clickIndex = 0; clickedTotal = 0;
        if (authorized && !selectedEls.length) {
            preparing = true; updateRunButtons();
            addLog('▶ 开始运行 - 准备阶段', 'ok');
            setStatus('⏳ 准备中：正在展开目录（第 1/2 轮）…', 'running');
            await expandAll();
            if (!isRunning) { preparing = false; updateRunButtons(); addLog('■ 用户在展开阶段停止了运行', 'err'); return; }
            await sleep(EXPAND_ROUND_GAP);
            setStatus('⏳ 准备中：正在展开目录（第 2/2 轮）…', 'running');
            await expandAll();
            if (!isRunning) { preparing = false; updateRunButtons(); addLog('■ 用户在展开阶段停止了运行', 'err'); return; }
            setStatus('⏳ 准备中：正在自动选择元素…', 'running');
            await autoPick();
            if (!isRunning) { preparing = false; updateRunButtons(); addLog('■ 用户在选择阶段停止了运行', 'err'); return; }
            preparing = false; updateRunButtons();
        } else if (authorized && selectedEls.length) {
            addLog(`▶ 开始运行 - 使用已选择的 ${selectedEls.length} 个元素（跳过展开）`, 'ok');
        }
        if (!selectedEls.length) {
            isRunning = false; preparing = false; updateRunButtons();
            setStatus('⚠️ 未找到可点击元素，无法开始', '');
            addLog('⚠️ 未找到可点击元素，无法开始', 'err');
            return;
        }
        runStats.start = Date.now(); runStats.vCount = 0; runStats.vSec = 0; runStats.last = 0;
        updateStats(); enableKA(); updateRunButtons();
        setStatus('开始执行…（无限循环，随机间隔 2~12 秒）', 'running');
        addLog(`▶ 正式开始（${selectedEls.length} 个元素，间隔 2~12 秒，${autoPlayVideo ? videoSpeed + 'x 自动播放' : '⚠ 未开启自动播放'}${maxClicks > 0 ? '，上限 ' + maxClicks + ' 次' : ''}）`, autoPlayVideo ? 'ok' : 'err');
        mainLoop();
    }
    function pauseClicking() {
        if (!isRunning || isPaused) return;
        isPaused = true;
        setStatus('⏸ 已暂停，点击「继续」恢复', '');
        addLog('⏸ 已暂停', '');
        updateRunButtons();
    }
    function resumeClicking() {
        if (!isRunning || !isPaused) return;
        isPaused = false;
        setStatus('▶ 继续执行…', 'running');
        addLog('▶ 继续', 'ok');
        updateRunButtons();
    }
    function stopClicking() {
        if (!isRunning) { setStatus('当前未运行', ''); return; }
        isRunning = false; isPaused = false; preparing = false;
        interruptDelay(); disableKA();
        try { if (worker) worker.postMessage({ cmd: 'stop' }); } catch (e) {}
        clearClickHighlight();
        runStats.last = runStats.start ? (Date.now() - runStats.start) / 1000 : 0;
        updateRunButtons();
        addLog(`■ 已停止 · 运行 ${fmtHMS(runStats.last)} · 点击 ${clickedTotal} 次 · 视频 ${runStats.vCount} 个（${fmtMS(runStats.vSec)}）`, 'err');
        setStatus(selectedEls.length ? `已停止（选择列表保留 ${selectedEls.length} 个）` : '已停止', '');
        updateStats();
    }

    async function exportLogs() {
        const text = logEntries.map(e => `[${e.time}] ${e.text}`).join('\n');
        if (!text) { setStatus('暂无日志可导出', ''); return; }
        try { await navigator.clipboard.writeText(text); setStatus(`📋 日志已复制（${logEntries.length} 条）`, 'ok'); addLog('📋 日志已复制到剪贴板', 'ok'); }
        catch (e) {
            const ta = document.createElement('textarea'); ta.value = text;
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); setStatus('📋 日志已复制', 'ok'); } catch (err) { setStatus('❌ 复制失败', ''); }
            document.body.removeChild(ta);
        }
    }

    /* ===== 授权弹窗 ===== */
    function openDonate() {
        if (document.getElementById('qcc-donate-modal')) return;
        const m = document.createElement('div'); m.id = 'qcc-donate-modal';
        m.innerHTML = `
            <div class="qcc-donate-card">
                <div class="qcc-donate-emoji">❤️</div>
                <div class="qcc-donate-title">感谢您的支持</div>
                <div class="qcc-donate-desc">如果这个脚本帮到了您，<br>欢迎随意打赏一杯咖啡～</div>
                <div class="qcc-donate-links">
                    <div class="qcc-donate-qq">QQ：3365137745</div>
                    <div class="qcc-donate-qq">群号：1124065231</div>
                </div>
                <div class="qcc-donate-note">授权后可解锁「自动播放视频」和「全自动展开」</div>
                <div class="qcc-trial-card">
                    <div class="qcc-trial-head"><span class="qcc-trial-label">🎁 半天试用卡</span><button class="qcc-trial-copy" id="qcc-trial-copy">复制</button></div>
                    <div class="qcc-trial-code">${TRIAL}</div>
                </div>
                <div class="qcc-donate-auth" id="qcc-donate-auth">
                    <div class="qcc-donate-auth-title">🔐 卡密验证</div>
                    <div class="qcc-donate-auth-row">
                        <input type="text" class="qcc-auth-input" id="qcc-donate-auth-input" placeholder="请输入卡密" autocomplete="off">
                        <button class="qcc-auth-btn" id="qcc-donate-auth-btn">确认</button>
                    </div>
                    <div class="qcc-auth-msg" id="qcc-donate-auth-msg">输入卡密后点击「确认」解锁功能</div>
                </div>
                <button class="qcc-donate-close" id="qcc-donate-close">关闭</button>
            </div>`;
        document.body.appendChild(m);
        const inp = document.getElementById('qcc-donate-auth-input');
        const btn = document.getElementById('qcc-donate-auth-btn');
        const msg = document.getElementById('qcc-donate-auth-msg');
        const wrap = document.getElementById('qcc-donate-auth');
        document.getElementById('qcc-trial-copy').addEventListener('click', async () => {
            const b = document.getElementById('qcc-trial-copy');
            let ok = false;
            try { await navigator.clipboard.writeText(TRIAL); ok = true; }
            catch (e) { const ta = document.createElement('textarea'); ta.value = TRIAL; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok = true; } catch (err) {} document.body.removeChild(ta); }
            if (ok) { b.textContent = '已复制'; b.classList.add('copied'); if (inp && !inp.disabled) inp.value = TRIAL; setTimeout(() => { b.textContent = '复制'; b.classList.remove('copied'); }, 1500); }
        });
        let esc = null;
        const close = () => { try { m.remove(); } catch (e) {} if (esc) document.removeEventListener('keydown', esc); };
        const sync = () => {
            if (authorized) { wrap.classList.add('is-ok'); inp.value = authCode; inp.disabled = true; btn.disabled = true; btn.textContent = '已授权'; msg.textContent = '✅ 功能已解锁，可以使用了'; msg.className = 'qcc-auth-msg ok'; }
            else { wrap.classList.remove('is-ok'); inp.disabled = false; btn.disabled = false; btn.textContent = '确认'; msg.textContent = authCode ? '⚠️ 上次验证未通过，请重新验证' : '输入卡密后点击「确认」解锁功能'; msg.className = 'qcc-auth-msg'; if (authCode) inp.value = authCode; }
        };
        const tryAuth = async () => {
            btn.disabled = true; btn.textContent = '验证中…';
            const r = await doVerify(inp.value);
            btn.disabled = false;
            if (r.ok) { sync(); setStatus(r.msg, ''); addLog('🔐 卡密验证成功', 'ok'); setTimeout(close, 1200); }
            else {
                msg.textContent = r.msg; msg.className = 'qcc-auth-msg err';
                setStatus(r.msg.replace(/[✅❌⚠️]\s*/g, ''), '');
                addLog('🔐 ' + r.msg.replace(/[✅❌⚠️]\s*/g, ''), 'err');
                wrap.classList.remove('qcc-shake'); void wrap.offsetWidth; wrap.classList.add('qcc-shake');
                try { inp.focus(); inp.select(); } catch (e) {}
                btn.textContent = '确认';
            }
        };
        btn.addEventListener('click', tryAuth);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tryAuth(); } });
        m.addEventListener('click', e => { if (e.target === m) close(); });
        document.getElementById('qcc-donate-close').addEventListener('click', close);
        esc = e => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', esc);
        sync();
        if (!authorized) setTimeout(() => { try { inp.focus(); } catch (e) {} }, 120);
    }

    /* ===== 面板 ===== */
    function buildPanel() {
        if (document.getElementById('quick-custom-clicker')) return;
        loadCfg();
        loadTheme();
        panel = document.createElement('div');
        panel.id = 'quick-custom-clicker';
        panel.innerHTML = `
            <div class="qcc-header" id="qcc-drag">
                <div class="qcc-header-left">
                    <span class="qcc-logo">⚡</span>
                    <span class="qcc-title-text qcc-title-full">国开刷点击次数和时长</span>
                    <span class="qcc-title-text qcc-title-short">国开学习</span>
                    <span class="qcc-badge">v5.2.5</span>
                </div>
                <div class="qcc-header-right">
                    <button class="qcc-icon-btn" id="qcc-min">−</button>
                    <button class="qcc-icon-btn" id="qcc-close">×</button>
                </div>
            </div>
            <div class="qcc-body" id="qcc-body">
                <div class="qcc-section">
                    <div class="qcc-section-title">
                        <span>⚙️</span>
                        <span class="qcc-theme-mini">
                            <span class="qcc-theme-label" data-theme="light">浅</span>
                            <label class="qcc-switch qcc-theme-switch-mini">
                                <input type="checkbox" id="qcc-theme-toggle">
                                <span class="qcc-switch-slider"></span>
                            </label>
                            <span class="qcc-theme-label" data-theme="dark">深</span>
                        </span>
                        <span class="qcc-auth-tip" id="qcc-auth-tip">授权后可全自动学习</span>
                        <span class="qcc-auth-time" id="qcc-auth-time">未授权</span>
                    </div>
                    <div class="qcc-field qcc-field-row qcc-field-compact qcc-field-double">
                        <div class="qcc-double-item"><label>最大次数</label><input type="number" id="qcc-max-clicks" min="0" step="1" value="0" class="qcc-num-input" title="0 = 无限"></div>
                        <div class="qcc-double-item"><label id="qcc-auto-video-label">自动播放 🔒</label><label class="qcc-switch"><input type="checkbox" id="qcc-auto-video"><span class="qcc-switch-slider"></span></label></div>
                    </div>
                    <div class="qcc-field qcc-field-block" id="qcc-speed-block">
                        <div class="qcc-field-head"><label>视频倍速</label><span class="qcc-speed-value" id="qcc-speed-value">2x</span></div>
                        <div class="qcc-speed-btns" id="qcc-speed-btns">
                            <button class="qcc-speed-btn active" data-speed="2">2x</button><button class="qcc-speed-btn" data-speed="4">4x</button><button class="qcc-speed-btn" data-speed="6">6x</button><button class="qcc-speed-btn" data-speed="8">8x</button><button class="qcc-speed-btn" data-speed="10">10x</button>
                        </div>
                    </div>
                </div>
                <div class="qcc-section">
                    <div class="qcc-section-title" id="qcc-execute-title">▶️ 执行</div>
                    <div class="qcc-btn-group">
                        <button id="qcc-start" class="qcc-btn qcc-btn-success"><span class="qcc-btn-icon">▶</span> 开始</button>
                        <button id="qcc-pause" class="qcc-btn qcc-btn-ghost" disabled><span class="qcc-btn-icon">⏸</span> 暂停</button>
                        <button id="qcc-stop" class="qcc-btn qcc-btn-danger"><span class="qcc-btn-icon">■</span> 停止</button>
                    </div>
                    <div class="qcc-field qcc-field-row qcc-field-compact qcc-row-with-btn">
                        <label>模拟手动</label><span class="qcc-interval-value">2~12s 随机学习</span>
                        <button id="qcc-auto-pick" class="qcc-inline-btn"><span class="qcc-btn-icon">👆</span> 手动选择</button>
                    </div>
                    <div class="qcc-btn-group qcc-btn-group-sm"><button id="qcc-donate" class="qcc-btn qcc-btn-donate qcc-btn-sm"><span class="qcc-btn-icon">❤️</span> 捐赠 / 授权</button></div>
                </div>
                <div class="qcc-status" id="qcc-status"><span class="qcc-status-dot"></span><span id="qcc-status-text">等待操作</span></div>
                <div class="qcc-log-box">
                    <div class="qcc-picked-bar"><span>已选择学习的目标的数量</span><span class="qcc-list-count" id="qcc-list-count">0个</span></div>
                    <div class="qcc-log-header">
                        <span>📊 运行统计 · 日志</span>
                        <span class="qcc-log-actions"><button class="qcc-log-reset" id="qcc-log-export">导出</button><button class="qcc-log-reset" id="qcc-log-reset">重置</button></span>
                    </div>
                    <div class="qcc-stat-compact">
                        <span>运行 <b id="qcc-stat-runtime">00:00:00</b></span>
                        <span>视频 <b id="qcc-stat-video">0分钟</b> (<b id="qcc-stat-videos">0个</b>)</span>
                        <span>点击 <b id="qcc-stat-clicks">0次</b></span>
                    </div>
                    <div class="qcc-log-list" id="qcc-log-list"><div class="qcc-log-empty">暂无日志</div></div>
                </div>
            </div>`;

        const s = document.createElement('style');
        s.textContent = `
#quick-custom-clicker{position:fixed;top:100px;right:20px;width:280px;background:rgba(255,255,255,.72);backdrop-filter:saturate(180%) blur(24px);-webkit-backdrop-filter:saturate(180%) blur(24px);border-radius:18px;box-shadow:0 20px 60px rgba(15,23,42,.18),0 8px 24px rgba(15,23,42,.10),0 1px 0 rgba(255,255,255,.6) inset,0 0 0 .5px rgba(15,23,42,.08);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1d1d1f;box-sizing:border-box;overflow:hidden;font-size:12px;transition:width .28s cubic-bezier(.4,0,.2,1),background .25s;color-scheme:light;-webkit-font-smoothing:antialiased;letter-spacing:-.01em}
#quick-custom-clicker *{box-sizing:border-box}
.qcc-header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#6EBBCE;color:#fff;cursor:move;user-select:none;border-bottom:.5px solid rgba(15,23,42,.08);transition:background .25s}
.qcc-header-left{display:flex;align-items:center;gap:6px}
.qcc-logo{font-size:14px;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.2))}
.qcc-title-text{font-size:13px;font-weight:600;color:#fff}
.qcc-badge{font-size:9px;background:rgba(255,255,255,.22);color:#fff;padding:2px 6px;border-radius:6px;font-weight:600}
.qcc-header-right{display:flex;gap:6px}
.qcc-icon-btn{width:22px;height:22px;border:0;background:rgba(255,255,255,.22);color:#fff;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;transition:all .18s;padding:0;transform:translateY(-.5px)}
.qcc-icon-btn:hover{background:rgba(255,255,255,.38)}
.qcc-icon-btn#qcc-close:hover{background:rgba(255,59,48,.75)}
.qcc-body{padding:12px;max-height:720px;overflow-y:auto;transition:max-height .28s,padding .28s,opacity .2s}
.qcc-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;opacity:0;overflow:hidden}
.qcc-body::-webkit-scrollbar{width:6px}
.qcc-body::-webkit-scrollbar-thumb{background:rgba(15,23,42,.12);border-radius:3px}
.qcc-section{margin-bottom:14px}
.qcc-section-title{font-size:10px;font-weight:600;color:#8e8e93;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;padding-left:2px;display:flex;justify-content:space-between;align-items:center;gap:6px}
.qcc-auth-tip{font-size:9px;color:#1d1d1f;font-weight:500;margin-left:auto;white-space:nowrap;letter-spacing:0;text-transform:none}
.qcc-auth-time{font-size:9.5px;font-weight:600;color:#fff;background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);padding:0 10px;height:20px;line-height:20px;border-radius:10px;font-variant-numeric:tabular-nums;white-space:nowrap;display:inline-flex;align-items:center;box-shadow:0 2px 6px rgba(18,183,106,.28);flex:0 0 auto}
.qcc-auth-time.warn{background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);box-shadow:0 2px 6px rgba(247,144,9,.28)}
.qcc-auth-time.err{background:linear-gradient(180deg,#ff6b61 0%,#ff3b30 100%);box-shadow:0 2px 6px rgba(255,59,48,.28)}
.qcc-theme-mini{display:inline-flex;align-items:center;gap:3px;flex:0 0 auto;margin-left:8px}
.qcc-theme-mini .qcc-theme-label{font-size:9px;font-weight:500;color:#8e8e93;cursor:pointer;user-select:none;transition:color .2s;letter-spacing:0}
.qcc-theme-mini .qcc-theme-label.active{color:#4f6ef7;font-weight:600}
.qcc-theme-switch-mini{width:26px !important;height:14px !important;flex:0 0 26px !important}
.qcc-theme-switch-mini .qcc-switch-slider{border-radius:7px}
.qcc-theme-switch-mini .qcc-switch-slider:before{height:10px;width:10px;left:2px;bottom:2px}
.qcc-theme-switch-mini input:checked + .qcc-switch-slider:before{transform:translateX(12px)}
.qcc-field-block{margin-bottom:8px}
.qcc-field-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.qcc-field-head label,.qcc-field-row label,.qcc-double-item label{font-size:11px;color:#3a3a3c;font-weight:500}
.qcc-field-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:.5px solid rgba(15,23,42,.06);gap:8px}
.qcc-field-compact{padding:6px 0}
.qcc-interval-value{font-size:10px;font-weight:600;color:#4f6ef7;background:rgba(79,110,247,.10);padding:3px 8px;border-radius:6px;flex:0 0 auto}
.qcc-row-with-btn{gap:6px}
.qcc-inline-btn{margin-left:auto;flex:0 0 auto;height:24px;padding:0 10px;border:0;border-radius:8px;background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);color:#fff;font-size:10.5px;font-weight:500;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px;transition:all .18s;white-space:nowrap;box-shadow:0 3px 10px rgba(79,110,247,.28)}
.qcc-inline-btn:hover{background:linear-gradient(180deg,#6b85ff 0%,#5b78ff 100%);transform:translateY(-1px)}
.qcc-inline-btn:active{transform:scale(.97)}
.qcc-inline-btn .qcc-btn-icon{font-size:11px;line-height:1}
.qcc-num-input{flex:0 0 42px !important;width:42px !important;height:20px !important;min-height:20px !important;max-height:20px !important;margin:0 !important;border:0 !important;background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%) !important;color:#fff !important;border-radius:10px !important;padding:0 6px !important;font-size:10px !important;font-weight:600 !important;line-height:20px !important;outline:none !important;box-shadow:0 2px 6px rgba(18,183,106,.28) !important;font-family:inherit !important;text-align:center !important;transition:background .18s,box-shadow .18s !important;-moz-appearance:textfield !important;font-variant-numeric:tabular-nums !important;display:inline-block !important;vertical-align:middle !important}
.qcc-num-input::-webkit-outer-spin-button,.qcc-num-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.qcc-num-input:hover:not(:disabled){background:linear-gradient(180deg,#43dc8a 0%,#22c876 100%) !important;box-shadow:0 2px 8px rgba(18,183,106,.38) !important}
.qcc-num-input:focus{box-shadow:0 0 0 3px rgba(18,183,106,.25),0 2px 8px rgba(18,183,106,.4) !important}
.qcc-num-input:disabled{opacity:.35;filter:grayscale(1);cursor:not-allowed}
.qcc-field-double{gap:10px}
.qcc-double-item{flex:1;display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;line-height:20px}
.qcc-double-item label{white-space:nowrap;flex:0 0 auto;height:20px;display:inline-flex;align-items:center}
.qcc-double-item .qcc-num-input{flex:0 0 42px !important;width:42px !important;line-height:20px !important}
.qcc-double-item .qcc-switch{flex:0 0 36px}
.qcc-btn{width:100%;border:0;border-radius:10px;padding:0 12px;height:24px;cursor:pointer;font-size:10.5px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .18s;font-family:inherit;line-height:1}
.qcc-btn-icon{font-size:11px;line-height:1}
.qcc-btn:disabled{opacity:.4;cursor:not-allowed}
.qcc-btn:not(:disabled):active{transform:scale(.97)}
.qcc-btn-primary{background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);color:#fff;box-shadow:0 4px 14px rgba(79,110,247,.3)}
.qcc-btn-success{
    background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);
    color:#0a3d2e;   /* 深墨绿色，清晰可见 */
    box-shadow:0 4px 14px rgba(18,183,106,.3);
}
#quick-custom-clicker.qcc-dark .qcc-btn-success{
    color:#0a3d2e;   /* 深色模式同样用深色字，因为背景是亮绿 */
}
.qcc-btn-danger{background:rgba(255,59,48,.08);color:#ff3b30}
.qcc-btn-danger:not(:disabled):hover{background:rgba(255,59,48,.15)}
.qcc-btn-ghost{background:rgba(15,23,42,.05);color:#3a3a3c}
.qcc-btn-ghost:not(:disabled):hover{background:rgba(15,23,42,.09)}
.qcc-btn-donate{background:linear-gradient(180deg,#ff7aa2 0%,#ff4d7d 100%);color:#fff;box-shadow:0 4px 14px rgba(255,77,125,.3)}
.qcc-btn-sm{padding:0 8px;height:24px;font-size:10.5px;margin-top:6px;gap:4px}
.qcc-btn-sm .qcc-btn-icon{font-size:11px}
.qcc-btn-group{display:flex;gap:6px}
.qcc-btn-group-sm{margin-top:6px}
.qcc-btn-group-sm .qcc-btn-sm{margin-top:0;flex:1}
.qcc-status{display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(15,23,42,.04);border-radius:10px;font-size:10.5px;color:#3a3a3c;margin-bottom:12px;line-height:1.35}
.qcc-status-dot{width:7px;height:7px;border-radius:50%;background:#8e8e93;flex-shrink:0}
.qcc-status.running .qcc-status-dot{background:#12b76a;box-shadow:0 0 0 3px rgba(18,183,106,.18);animation:qcc-pulse 1.4s infinite}
@keyframes qcc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.15)}}
.qcc-list-count{background:rgba(79,110,247,.12);color:#4f6ef7;padding:2px 8px;border-radius:6px;font-size:9.5px;font-weight:600;min-width:20px;text-align:center}
.qcc-pick-selected{outline:3px solid #ff6b00 !important;outline-offset:2px !important;background:linear-gradient(90deg,rgba(255,196,0,.55) 0%,rgba(255,140,0,.45) 100%) !important;border-radius:6px;box-shadow:0 0 0 2px rgba(255,107,0,.2) inset,0 3px 10px rgba(255,107,0,.3) !important;color:#7a3a00 !important;transition:all .15s}
.qcc-pick-selected *{color:#7a3a00 !important}
.qcc-clicking{outline:3px solid #12b76a !important;outline-offset:2px !important;background:linear-gradient(90deg,rgba(52,209,122,.6) 0%,rgba(18,183,106,.5) 100%) !important;border-radius:6px;box-shadow:0 0 0 2px rgba(18,183,106,.25) inset,0 3px 10px rgba(18,183,106,.35) !important;color:#0e5c34 !important;transition:all .15s}
.qcc-clicking *{color:#0e5c34 !important}
.qcc-manual-hover{outline:2px dashed #4f6ef7 !important;outline-offset:2px !important;background:rgba(79,110,247,.08) !important;cursor:crosshair !important}
.qcc-switch{position:relative;width:36px;height:20px;flex:0 0 36px;display:inline-block}
.qcc-switch input{opacity:0;width:0;height:0}
.qcc-switch-slider{position:absolute;cursor:pointer;inset:0;background:rgba(15,23,42,.12);border-radius:10px;transition:.28s}
.qcc-switch-slider:before{position:absolute;content:'';height:16px;width:16px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:.28s;box-shadow:0 1px 3px rgba(0,0,0,.18)}
.qcc-switch input:checked + .qcc-switch-slider{background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%)}
.qcc-switch input:checked + .qcc-switch-slider:before{transform:translateX(16px)}
.qcc-switch input:disabled + .qcc-switch-slider{opacity:.35;cursor:not-allowed}
.qcc-speed-btns{display:flex;gap:4px;margin-top:5px}
.qcc-speed-btn{flex:1;height:24px;border-radius:8px;border:.5px solid rgba(15,23,42,.1);background:rgba(255,255,255,.6);color:#6b7280;font-size:10.5px;font-weight:600;cursor:pointer;padding:0;font-family:inherit;transition:all .18s}
.qcc-speed-btn:hover{background:rgba(255,255,255,.95);color:#4f6ef7}
.qcc-speed-btn.active{background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);border-color:transparent;color:#fff}
.qcc-speed-value{font-size:10px;font-weight:600;color:#4f6ef7;background:rgba(79,110,247,.10);padding:3px 8px;border-radius:6px;min-width:36px;text-align:center}
#qcc-speed-block.qcc-hidden{display:none}
.qcc-title-short{display:none}
#quick-custom-clicker.qcc-collapsed{width:105px}
#quick-custom-clicker.qcc-collapsed .qcc-header{padding:9px 9px 9px 12px;border-bottom:0}
#quick-custom-clicker.qcc-collapsed .qcc-logo,#quick-custom-clicker.qcc-collapsed .qcc-badge,#quick-custom-clicker.qcc-collapsed .qcc-title-full{display:none}
#quick-custom-clicker.qcc-collapsed .qcc-title-short{display:inline;font-size:13px;font-weight:600;color:#fff}
#quick-custom-clicker.qcc-collapsed .qcc-header-left{gap:0;flex:1;justify-content:flex-start}
#quick-custom-clicker.qcc-collapsed .qcc-icon-btn{width:26px;height:26px;font-size:18px;background:rgba(255,255,255,.3)}
#quick-custom-clicker.qcc-collapsed #qcc-close{display:none}
.qcc-log-box{background:rgba(15,23,42,.04);border-radius:10px;padding:8px 10px;margin-bottom:12px}
.qcc-picked-bar{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#8e8e93;font-weight:600;padding-bottom:6px;margin-bottom:6px;border-bottom:.5px dashed rgba(15,23,42,.1)}
.qcc-log-header{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#8e8e93;font-weight:600;margin-bottom:6px}
.qcc-log-actions{display:flex;gap:4px}
.qcc-log-reset{border:0;background:transparent;color:#8e8e93;font-size:9.5px;padding:2px 6px;border-radius:4px;cursor:pointer;font-family:inherit;transition:all .2s}
.qcc-log-reset:hover{background:rgba(79,110,247,.1);color:#4f6ef7}
.qcc-stat-compact{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10px;color:#6b7280;padding:4px 0;margin-bottom:6px;border-bottom:.5px dashed rgba(15,23,42,.1)}
.qcc-stat-compact b{font-weight:600;color:#1d1d1f;font-variant-numeric:tabular-nums}
.qcc-log-list{max-height:60px;overflow-y:auto;font-size:10px;line-height:1.5}
.qcc-log-list::-webkit-scrollbar{width:10px}
.qcc-log-list::-webkit-scrollbar-thumb{background:rgba(120,120,120,.55);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.qcc-log-list::-webkit-scrollbar-thumb:hover{background:rgba(100,100,100,.75)}
.qcc-log-list::-webkit-scrollbar-button{display:none;width:0;height:0}
.qcc-log-item{display:flex;gap:6px;padding:2px 0;border-bottom:.5px solid rgba(15,23,42,.04)}
.qcc-log-time{color:#a1a1a6;flex-shrink:0;font-variant-numeric:tabular-nums}
.qcc-log-text{color:#3a3a3c;word-break:break-all}
.qcc-log-item.ok .qcc-log-text{color:#0e8f52}
.qcc-log-item.err .qcc-log-text{color:#ff3b30}
.qcc-log-empty{color:#a1a1a6;text-align:center;padding:8px 0;font-size:10px}
#qcc-donate-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.38);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;font-family:inherit;animation:qcc-fade-in .2s}
@keyframes qcc-fade-in{from{opacity:0}to{opacity:1}}
.qcc-donate-card{width:290px;background:rgba(255,255,255,.94);backdrop-filter:saturate(180%) blur(24px);border-radius:18px;padding:20px 18px 16px;text-align:center;box-shadow:0 24px 70px rgba(15,23,42,.28);animation:qcc-pop-in .26s cubic-bezier(.2,1.2,.4,1)}
@keyframes qcc-pop-in{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
.qcc-donate-emoji{font-size:34px;margin-bottom:8px}
.qcc-donate-title{font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:6px}
.qcc-donate-desc{font-size:11px;color:#6b7280;line-height:1.6;margin-bottom:12px}
.qcc-donate-links{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.qcc-donate-links .qcc-donate-qq{margin-bottom:0}
.qcc-donate-qq{display:inline-block;font-size:12px;font-weight:600;color:#4f6ef7;background:rgba(79,110,247,.10);padding:6px 12px;border-radius:8px;margin-bottom:6px;user-select:text}
.qcc-donate-note{font-size:10px;color:#a1a1a6;margin-bottom:12px}
.qcc-trial-card{text-align:left;background:linear-gradient(135deg,rgba(255,181,64,.12) 0%,rgba(255,120,70,.12) 100%);border:.5px solid rgba(255,149,0,.3);border-radius:10px;padding:9px 10px;margin-bottom:12px}
.qcc-trial-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.qcc-trial-label{font-size:10px;font-weight:600;color:#b25e00}
.qcc-trial-copy{height:20px;padding:0 8px;border:0;border-radius:6px;background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);color:#fff;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 6px rgba(247,144,9,.3);transition:all .18s;display:inline-flex;align-items:center}
.qcc-trial-copy.copied{background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);box-shadow:0 2px 6px rgba(18,183,106,.3)}
.qcc-trial-code{font-size:12px;font-weight:700;color:#1d1d1f;font-family:ui-monospace,Menlo,monospace;letter-spacing:.1em;word-break:break-all;background:rgba(255,255,255,.75);padding:6px 9px;border-radius:6px;user-select:text;text-align:center}
.qcc-donate-auth{text-align:left;background:rgba(255,149,0,.08);border:.5px solid rgba(255,149,0,.22);border-radius:10px;padding:10px;margin-bottom:12px;transition:.2s}
.qcc-donate-auth.is-ok{background:rgba(18,183,106,.08);border-color:rgba(18,183,106,.25)}
.qcc-donate-auth.qcc-shake{animation:qcc-shake .36s}
@keyframes qcc-shake{10%,90%{transform:translateX(-1.5px)}20%,80%{transform:translateX(3px)}30%,50%,70%{transform:translateX(-5px)}40%,60%{transform:translateX(5px)}}
.qcc-donate-auth-title{font-size:10px;font-weight:600;color:#b25e00;margin-bottom:7px}
.qcc-donate-auth.is-ok .qcc-donate-auth-title{color:#0e8f52}
.qcc-donate-auth-row{display:flex;gap:6px}
.qcc-auth-input{flex:1;min-width:0;height:26px;border:.5px solid rgba(15,23,42,.12);background:rgba(255,255,255,.85);border-radius:7px;padding:0 8px;font-size:10.5px;outline:none;font-family:inherit}
.qcc-auth-input:focus{border-color:rgba(79,110,247,.5);box-shadow:0 0 0 3px rgba(79,110,247,.12)}
.qcc-auth-input:disabled{background:rgba(15,23,42,.04);color:#6b7280}
.qcc-auth-btn{height:26px;padding:0 12px;border:0;border-radius:7px;background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);color:#fff;font-size:10.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(247,144,9,.3)}
.qcc-auth-btn:disabled{opacity:.6;background:rgba(18,183,106,.75)}
.qcc-auth-msg{font-size:9.5px;color:#8e8e93;margin-top:5px;line-height:1.45}
.qcc-auth-msg.err{color:#ff3b30}
.qcc-auth-msg.ok{color:#12b76a}
.qcc-donate-close{width:100%;border:0;border-radius:10px;padding:9px 12px;background:rgba(15,23,42,.06);color:#3a3a3c;font-size:11.5px;cursor:pointer;font-family:inherit}
.qcc-donate-close:hover{background:rgba(15,23,42,.11)}
/* ★ 深色主题（由 .qcc-dark 类激活）★ */
#quick-custom-clicker.qcc-dark .qcc-switch-slider {
    background: rgba(255, 255, 255, 0.22);
}
#quick-custom-clicker.qcc-dark{background:rgba(30,30,32,.88);color:#f5f5f7;color-scheme:dark;box-shadow:0 20px 60px rgba(0,0,0,.5),0 8px 24px rgba(0,0,0,.3),0 1px 0 rgba(255,255,255,.06) inset,0 0 0 .5px rgba(255,255,255,.06)}
#quick-custom-clicker.qcc-dark .qcc-header{background:#3a4a55}
#quick-custom-clicker.qcc-dark .qcc-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18)}
#quick-custom-clicker.qcc-dark .qcc-section-title{color:#8e8e93}
#quick-custom-clicker.qcc-dark .qcc-field-head label,
#quick-custom-clicker.qcc-dark .qcc-field-row label,
#quick-custom-clicker.qcc-dark .qcc-double-item label{color:#c7c7cc}
#quick-custom-clicker.qcc-dark .qcc-auth-tip{color:#f5f5f7}
#quick-custom-clicker.qcc-dark .qcc-theme-mini .qcc-theme-label{color:#8e8e93}
#quick-custom-clicker.qcc-dark .qcc-theme-mini .qcc-theme-label.active{color:#8ba0ff}
#quick-custom-clicker.qcc-dark .qcc-status{background:rgba(255,255,255,.06);color:#c7c7cc}
#quick-custom-clicker.qcc-dark .qcc-log-box{background:rgba(255,255,255,.05)}
#quick-custom-clicker.qcc-dark .qcc-picked-bar{color:#8e8e93;border-bottom-color:rgba(255,255,255,.1)}
#quick-custom-clicker.qcc-dark .qcc-list-count{background:rgba(79,110,247,.25);color:#8ba0ff}
#quick-custom-clicker.qcc-dark .qcc-stat-compact{color:#8e8e93;border-bottom-color:rgba(255,255,255,.1)}
#quick-custom-clicker.qcc-dark .qcc-stat-compact b{color:#f5f5f7}
#quick-custom-clicker.qcc-dark .qcc-log-text{color:#c7c7cc}
#quick-custom-clicker.qcc-dark .qcc-log-time{color:#8e8e93}
#quick-custom-clicker.qcc-dark .qcc-log-item{border-bottom-color:rgba(255,255,255,.05)}
#quick-custom-clicker.qcc-dark .qcc-btn-ghost{background:rgba(255,255,255,.08);color:#c7c7cc}
#quick-custom-clicker.qcc-dark .qcc-btn-ghost:not(:disabled):hover{background:rgba(255,255,255,.14)}
#quick-custom-clicker.qcc-dark .qcc-speed-btn{background:rgba(255,255,255,.08);color:#c7c7cc;border-color:rgba(255,255,255,.12)}
#quick-custom-clicker.qcc-dark .qcc-speed-btn:hover{background:rgba(255,255,255,.15)}
#quick-custom-clicker.qcc-dark .qcc-speed-btn.active {
    background: linear-gradient(180deg, #6b85ff 0%, #5b78ff 100%);
    color: #fff;
    border-color: transparent;
    box-shadow: 0 2px 8px rgba(79,110,247,.4);
}
#quick-custom-clicker.qcc-dark .qcc-log-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.35);border:2px solid transparent;background-clip:content-box}
#quick-custom-clicker.qcc-dark .qcc-log-list::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.5)}
/* ===== 顶部状态行字体统一为“执行 · 手动模式”样式 ===== */
#quick-custom-clicker .qcc-section-title .qcc-theme-mini .qcc-theme-label,
#quick-custom-clicker .qcc-section-title .qcc-auth-tip,
#quick-custom-clicker .qcc-section-title .qcc-auth-time {
    font-size: 10px !important;
    font-weight: 600 !important;
    letter-spacing: .04em !important;
    text-transform: uppercase !important;
}
/* 主题开关上的 浅/深 文字保持切换颜色不被覆盖 */
#quick-custom-clicker .qcc-section-title .qcc-theme-mini .qcc-theme-label.active {
    color: #4f6ef7 !important;
}
#quick-custom-clicker.qcc-dark .qcc-section-title .qcc-theme-mini .qcc-theme-label.active {
    color: #8ba0ff !important;
}
/* [未授权]/[VIP] 徽章保持胶囊高度 */
#quick-custom-clicker .qcc-section-title .qcc-auth-time {
    height: 20px !important;
    line-height: 20px !important;
    letter-spacing: 0 !important;
    text-transform: none !important;
}
/* “授权后可全自动学习”与执行标题同色 */
#quick-custom-clicker .qcc-section-title .qcc-auth-tip {
    color: #8e8e93 !important;
}
#quick-custom-clicker.qcc-dark .qcc-section-title .qcc-auth-tip {
    color: #8e8e93 !important;
}`;
        document.head.appendChild(s);
        document.body.appendChild(panel);
        applyScale();
        applyTheme();

        statusEl = document.getElementById('qcc-status');
        statusTextEl = document.getElementById('qcc-status-text');
        listCountEl = document.getElementById('qcc-list-count');
        logListEl = document.getElementById('qcc-log-list');
        statRT = document.getElementById('qcc-stat-runtime');
        statV = document.getElementById('qcc-stat-video');
        statVC = document.getElementById('qcc-stat-videos');
        statC = document.getElementById('qcc-stat-clicks');

        if (logTimer) clearInterval(logTimer);
        logTimer = setInterval(() => { updateStats(); updateAuthTime(); }, 1000);
        renderLog(); updateStats(); updateAuthTime();

        document.getElementById('qcc-log-reset').addEventListener('click', () => { resetStats(); setStatus('日志与统计已重置', ''); });
        document.getElementById('qcc-log-export').addEventListener('click', exportLogs);

        /* 主题切换：开关 + 文字点击 */
        const themeToggle = document.getElementById('qcc-theme-toggle');
        if (themeToggle) {
            themeToggle.checked = isDarkTheme;
            themeToggle.addEventListener('change', () => { isDarkTheme = themeToggle.checked; applyTheme(); });
        }
        panel.querySelectorAll('.qcc-theme-label').forEach(l => {
            l.addEventListener('click', () => { isDarkTheme = (l.dataset.theme === 'dark'); applyTheme(); });
        });

        const av = document.getElementById('qcc-auto-video');
        const sb = document.getElementById('qcc-speed-block');
        const sv = document.getElementById('qcc-speed-value');
        const speedBtns = panel.querySelectorAll('.qcc-speed-btn');
        const mci = document.getElementById('qcc-max-clicks');
        mci.value = String(maxClicks || 0);
        mci.addEventListener('input', () => { const n = parseInt(mci.value, 10); maxClicks = (isNaN(n) || n < 0) ? 0 : n; saveCfg(); });
        mci.addEventListener('blur', () => { mci.value = String(maxClicks || 0); });

        syncAuthUI = function () {
            updatePickBtn();
            const avEl = document.getElementById('qcc-auto-video');
            const mcEl = document.getElementById('qcc-max-clicks');
            const sBlk = document.getElementById('qcc-speed-block');
            const eT = document.getElementById('qcc-execute-title');
            const aL = document.getElementById('qcc-auto-video-label');
            const aTip = document.getElementById('qcc-auth-tip');
            if (authorized) {
                if (avEl) avEl.disabled = false;
                if (mcEl) mcEl.disabled = false;
                if (aL) aL.textContent = '自动播放';
                if (sBlk) sBlk.classList.toggle('qcc-hidden', !autoPlayVideo);
                if (eT) eT.innerHTML = '▶️ 执行 · 点→开始→ [全自动开始你的学习]';
                if (aTip) aTip.style.display = 'none';
            } else {
                if (avEl) { avEl.checked = false; avEl.disabled = true; }
                if (mcEl) { mcEl.value = '0'; mcEl.disabled = true; maxClicks = 0; }
                if (aL) aL.textContent = '自动播放 🔒';
                if (sBlk) sBlk.classList.add('qcc-hidden');
                if (eT) eT.innerHTML = '▶️ 执行 · 手动模式';
                if (aTip) aTip.style.display = '';
            }
            updateAuthTime();
            if (authorized && manualPicking) exitPick(false);
        };
        function syncVUI() {
            av.checked = autoPlayVideo;
            sb.classList.toggle('qcc-hidden', !authorized || !autoPlayVideo);
            sv.textContent = videoSpeed + 'x';
            speedBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.speed, 10) === videoSpeed));
            updateRunButtons();
        }
        function flashDonate() {
            const b = document.getElementById('qcc-donate');
            if (!b) return;
            b.style.transition = 'all .2s'; b.style.transform = 'scale(1.08)'; b.style.boxShadow = '0 0 0 4px rgba(255,77,125,.3)';
            setTimeout(() => { b.style.transform = 'scale(1)'; b.style.boxShadow = ''; }, 400);
        }
        av.addEventListener('click', e => {
            if (!authorized) { e.preventDefault(); av.checked = false; autoPlayVideo = false; syncVUI(); setStatus('🔒 请点击【❤️ 捐赠 / 授权】解锁「自动播放视频」', ''); flashDonate(); return; }
            autoPlayVideo = av.checked; syncVUI(); saveCfg();
            setStatus(`自动播放视频: ${autoPlayVideo ? '开启' : '关闭'}`, '');
            addLog(`⚙️ 自动播放视频 ${autoPlayVideo ? '开启' : '关闭'}`, '');
        });
        speedBtns.forEach(b => b.addEventListener('click', () => {
            if (!authorized) { setStatus('🔒 请先授权', ''); return; }
            videoSpeed = parseInt(b.dataset.speed, 10) || 2; syncVUI(); saveCfg();
            setStatus(`视频倍速已设为 ${videoSpeed}x`, '');
            addLog(`⚙️ 视频倍速 ${videoSpeed}x`, '');
        }));
        syncVUI();

        document.getElementById('qcc-auto-pick').addEventListener('click', () => { if (manualPicking) exitPick(true); else enterPick(); });
        document.getElementById('qcc-donate').addEventListener('click', openDonate);
        document.getElementById('qcc-start').addEventListener('click', startClicking);
        document.getElementById('qcc-stop').addEventListener('click', stopClicking);
        document.getElementById('qcc-pause').addEventListener('click', () => { if (isPaused) resumeClicking(); else pauseClicking(); });

        function toggleCollapse() {
            const b = document.getElementById('qcc-body');
            const c = b.classList.toggle('collapsed');
            panel.classList.toggle('qcc-collapsed', c);
            document.getElementById('qcc-min').textContent = c ? '+' : '−';
        }
        document.getElementById('qcc-min').addEventListener('click', e => { e.stopPropagation(); toggleCollapse(); });
        document.getElementById('qcc-close').addEventListener('click', () => {
            stopHB(); if (manualPicking) exitPick(false); stopClicking();
            if (logTimer) { clearInterval(logTimer); logTimer = null; }
            const dm = document.getElementById('qcc-donate-modal'); if (dm) dm.remove();
            panel.remove(); syncAuthUI = null;
        });

        (function drag() {
            const ed = document.getElementById('qcc-drag');
            let dr = false, sx = 0, sy = 0, bl = 0, bt = 0;
            ed.addEventListener('mousedown', e => {
                if (e.target.closest('.qcc-icon-btn')) return;
                dr = true;
                const z = parseFloat(panel.style.zoom) || 1;
                sx = e.clientX; sy = e.clientY;
                const r = panel.getBoundingClientRect();
                bl = r.left / z; bt = r.top / z;
                panel.style.right = 'auto'; panel.style.left = bl + 'px'; panel.style.top = bt + 'px';
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!dr) return;
                const z = parseFloat(panel.style.zoom) || 1;
                const nx = Math.max(0, Math.min(innerWidth / z - panel.offsetWidth, bl + (e.clientX - sx) / z));
                const ny = Math.max(0, Math.min(innerHeight / z - 40, bt + (e.clientY - sy) / z));
                panel.style.left = nx + 'px'; panel.style.top = ny + 'px';
            });
            document.addEventListener('mouseup', () => { dr = false; });
        })();

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (manualPicking) { exitPick(false); return; }
                if (isRunning) stopClicking();
            }
        });

        updatePickBtn(); renderList(); updateRunButtons();
        if (syncAuthUI) try { syncAuthUI(); } catch (e) {}
        (async () => {
            await loadAuth();
            updatePickBtn();
            if (syncAuthUI) try { syncAuthUI(); } catch (e) {}
            setStatus(authorized ? '✅ 已授权，点开始自动运行' : (authCode ? '⚠️ 上次验证未通过，请重新验证' : '等待操作'), '');
        })();
    }

    function safeBuild() {
        try { if (!document.body) { setTimeout(safeBuild, 50); return; } buildPanel(); }
        catch (e) { reportErr('面板构建失败', e, false); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeBuild, { once: true });
    else safeBuild();
    window.addEventListener('resize', () => { try { applyScale(); } catch (e) {} });
})();
