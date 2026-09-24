// ==UserScript==
// @name         新国开/国开/国家开放大学自动刷课+次数和时长
// @namespace    https://scriptcat.org/
// @version      5.0.4
// @description 目录展开与选择一栏｜轮流循环点击｜暂停/继续｜2/4/6/8/10倍速｜静音播放完再继续｜10分钟+超级保活｜苹果风格UI｜ESC停止｜后台也继续运行｜自建授权服务器｜运行日志与统计｜自动缩放
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

    /* ========== 常量 ========== */
    const CFG = {
        AUTH_SERVER: 'https://aitwo.icu',
        HEARTBEAT_MS: 50000, HEARTBEAT_FAIL_LIMIT: 3,
        RANDOM_MIN_SEC: 2, RANDOM_MAX_SEC: 12,
        VIDEO_WAIT_MS: 15000, VIDEO_POLL_MS: 300,
        EXPAND_HARD_LIMIT_MS: 5800, EXPAND_MAX_LOOPS: 50,
        EXPAND_CLICK_GAP_MS: 25, EXPAND_LOOP_GAP_MS: 100,
        ROOTS_THROTTLE_MS: 300, LOG_MAX: 80,
        SPEED_OPTIONS: [2, 4, 6, 8, 10],
        VIDEO_PLAY_GRACE_MS: 15000, VIDEO_STUCK_LIMIT: 30,
        TRIAL_CODE: 'CS-2VJY5A5T7Q'
    };
    const STORAGE_KEYS = { AUTH: 'qcc_auth_code_v3', EXPIRE: 'qcc_auth_expire_v3', DEVICE: 'qcc_device_id', CFG: 'qcc_cfg_v2' };

    let authCode = '', authorized = false;
    let __syncAuthUI = null, heartbeatTimer = null, heartbeatFailCount = 0;

    const KEYT_DEVICE_ID = (() => {
        try {
            let id = localStorage.getItem(STORAGE_KEYS.DEVICE);
            if (id) return id;
            let hex = '';
            for (let i = 0; i < 12; i++) hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
            id = hex + 'MAC';
            localStorage.setItem(STORAGE_KEYS.DEVICE, id);
            return id;
        } catch (e) { return 'FALLBACK' + Date.now().toString(16).slice(-6).toUpperCase() + 'MAC'; }
    })();

    /* ========== 授权 ========== */
    function apiPost(path, data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST', url: CFG.AUTH_SERVER + path,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(data || {}), timeout: 10000,
                onload: r => { try { resolve(JSON.parse(r.responseText || '{}')); } catch (e) { reject(new Error('bad json')); } },
                onerror: e => reject(e), ontimeout: () => reject(new Error('timeout'))
            });
        });
    }
    async function requestVerify(card, mac) {
        try { const res = await apiPost('/api/verify', { card, mac }); return res && typeof res === 'object' ? res : null; }
        catch (e) { return null; }
    }
    async function verifyAuthCode(rawCode) {
        const code = (rawCode || '').trim();
        if (!code) return { ok: false, msg: '请输入卡密' };
        try {
            const res = await requestVerify(code, KEYT_DEVICE_ID);
            if (!res) return { ok: false, msg: '❌ 网络请求失败，请检查网络后重试' };
            if (res.ok) {
                authorized = true; authCode = code;
                localStorage.setItem(STORAGE_KEYS.AUTH, code);
                // ★ 调试：打印服务端返回，便于排查字段名
                console.log('[QCC] 服务器返回：', res);
                // ★ 兼容多种服务端字段名
                let days = NaN;
                let explicitLifetime = false;
                if (typeof res.days === 'number') days = res.days;
                else if (typeof res.days === 'string' && res.days !== 'lifetime') days = parseInt(res.days, 10);
                else if (typeof res.remaining_days === 'number') days = res.remaining_days;
                else if (typeof res.remaining === 'number') days = res.remaining;
                else if (typeof res.duration === 'number') days = res.duration;
                if (res.lifetime === true || res.days === -1 || res.days === 'lifetime') explicitLifetime = true;

                if (typeof res.expire === 'number' && res.expire > 1000000000000) {
                    // 情形 A：到期时间戳（毫秒）
                    localStorage.setItem(STORAGE_KEYS.EXPIRE, String(res.expire));
                } else if (typeof res.expire === 'string') {
                    // 情形 B：到期时间字符串
                    const t = Date.parse(res.expire);
                    if (!isNaN(t)) localStorage.setItem(STORAGE_KEYS.EXPIRE, String(t));
                } else if (explicitLifetime) {
                    // 情形 C：明确终身
                    localStorage.setItem(STORAGE_KEYS.EXPIRE, 'lifetime');
                } else if (!isNaN(days) && days > 0) {
                    // 情形 D：天数字段
                    localStorage.setItem(STORAGE_KEYS.EXPIRE, String(Date.now() + days * 86400000));
                } else {
                    // 情形 E：什么都未提供 → 不写入，显示"已授权"
                    localStorage.removeItem(STORAGE_KEYS.EXPIRE);
                }

                startHeartbeat();
                if (typeof __syncAuthUI === 'function') { try { __syncAuthUI(); } catch (e) {} }
                let tail = '';
                if (explicitLifetime) tail = '（终身有效）';
                else if (!isNaN(days) && days > 0) tail = `（剩余 ${days} 天）`;
                else if (typeof res.expire !== 'undefined') tail = `（到期：${new Date(res.expire).toLocaleDateString()}）`;
                else tail = '（已授权）';
                return { ok: true, msg: '✅ ' + (res.msg || '验证通过') + tail };
            }
            return { ok: false, msg: '❌ ' + (res.msg || (res.code === 'device_mismatch'
                ? '设备不匹配（请在后台解绑该卡密或改用新卡密）' : '验证失败')) };
        } catch (e) { return { ok: false, msg: '❌ 网络请求失败，请检查网络后重试' }; }
    }
    function startHeartbeat() {
        stopHeartbeat(); heartbeatFailCount = 0;
        heartbeatTimer = setInterval(async () => {
            if (!authorized || !authCode) return;
            const res = await requestVerify(authCode, KEYT_DEVICE_ID);
            if (res && res.ok) { heartbeatFailCount = 0; return; }
            heartbeatFailCount++;
            if (heartbeatFailCount >= CFG.HEARTBEAT_FAIL_LIMIT) {
                authorized = false;
                if (typeof stopClicking === 'function') stopClicking();
                if (typeof __syncAuthUI === 'function') { try { __syncAuthUI(); } catch (e) {} }
                if (typeof setStatus === 'function') setStatus('⚠️ 网络异常，卡密已保留，请重新验证', '');
                if (typeof addLog === 'function') addLog('⚠️ 卡密心跳失败（已保留卡密）', 'err');
            }
        }, CFG.HEARTBEAT_MS);
    }
    function stopHeartbeat() { if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; } heartbeatFailCount = 0; }

    async function loadAuthFromStorage() {
        let saved = '';
        try { saved = (localStorage.getItem(STORAGE_KEYS.AUTH) || '').trim(); } catch (e) { return; }
        if (!saved) return;
        const ex = parseInt(localStorage.getItem(STORAGE_KEYS.EXPIRE) || '0', 10);
        if (ex && ex < Date.now()) { try { localStorage.removeItem(STORAGE_KEYS.AUTH); localStorage.removeItem(STORAGE_KEYS.EXPIRE); } catch (e) {} return; }
        const res = await requestVerify(saved, KEYT_DEVICE_ID);
        if (!res || !res.ok) { authCode = saved; return; }
        authCode = saved; authorized = true; startHeartbeat();
    }

    /* ========== 配置持久化 ========== */
    function loadConfig() {
        try {
            const c = JSON.parse(localStorage.getItem(STORAGE_KEYS.CFG) || '{}');
            if (typeof c.autoPlayVideo === 'boolean') autoPlayVideo = c.autoPlayVideo;
            if (CFG.SPEED_OPTIONS.includes(c.videoSpeed)) videoSpeed = c.videoSpeed;
            if (typeof c.maxClicks === 'number' && c.maxClicks >= 0) maxClicks = c.maxClicks;
        } catch (e) {}
    }
    function saveConfig() {
        try { localStorage.setItem(STORAGE_KEYS.CFG, JSON.stringify({ autoPlayVideo, videoSpeed, maxClicks })); } catch (e) {}
    }

    /* ========== Shadow DOM + 性能 ========== */
    const shadowRootMap = new Map();
    const nativeAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
        const root = nativeAttachShadow.call(this, init);
        try { shadowRootMap.set(this, root); } catch (e) {}
        return root;
    };
    function getShadowRoot(el) { if (!el || el.nodeType !== 1) return null; return el.shadowRoot || shadowRootMap.get(el) || null; }
    let __rootsCache = null, __rootsObserver = null, __rootsDirty = true, __rootsLastTime = 0;
    function ensureRootsObserver() {
        if (__rootsObserver || !document.documentElement) return;
        try { __rootsObserver = new MutationObserver(() => { __rootsDirty = true; }); __rootsObserver.observe(document.documentElement, { childList: true, subtree: true }); }
        catch (e) { __rootsObserver = null; }
    }
    function getAllRoots() {
        if (!__rootsDirty && __rootsCache) return __rootsCache;
        const now = Date.now();
        if (__rootsCache && (now - __rootsLastTime) < CFG.ROOTS_THROTTLE_MS) return __rootsCache;
        ensureRootsObserver();
        const roots = [document];
        const seen = new Set(roots);
        for (let i = 0; i < roots.length; i++) {
            let all;
            try { all = roots[i].querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) { const sr = getShadowRoot(el); if (sr && !seen.has(sr)) { seen.add(sr); roots.push(sr); } }
        }
        __rootsCache = roots; __rootsDirty = false; __rootsLastTime = now; return roots;
    }

    function reportError(tag, err, showInLog) {
        const msg = (err && err.message) || String(err) || '未知错误';
        console.warn(`[QCC] ${tag}:`, err);
        if (showInLog) addLog(`⚠️ ${tag}：${msg}`, 'err');
    }

    function realClick(el) {
        if (!el) return false;
        try {
            const r0 = el.getBoundingClientRect();
            if (r0.top < 0 || r0.bottom > window.innerHeight || r0.left < 0 || r0.right > window.innerWidth) {
                try { el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); } catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
            }
        } catch (e) {}
        let r;
        try { r = el.getBoundingClientRect(); } catch (e) { r = { left: 0, top: 0, width: 1, height: 1 }; }
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, button: 0, detail: 1 };
        try {
            if (window.PointerEvent) {
                try { el.dispatchEvent(new PointerEvent('pointerdown', Object.assign({}, base, { buttons: 1, pointerId: 1, pointerType: 'mouse', isPrimary: true }))); } catch (e) {}
            }
            el.dispatchEvent(new MouseEvent('mousedown', Object.assign({}, base, { buttons: 1 })));
            el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, base, { buttons: 0 })));
            el.dispatchEvent(new MouseEvent('click', Object.assign({}, base, { buttons: 0 })));
        } catch (e) { return false; }
        return true;
    }
    function pickClickTarget(el) {
        let cur = el;
        for (let i = 0; i < 4 && cur; i++) { try { if (getComputedStyle(cur).cursor === 'pointer') return cur; } catch (e) {} cur = cur.parentElement; }
        return el;
    }
    function isBoldText(el) {
        if (!el || el.nodeType !== 1) return false;
        const tag = (el.tagName || '').toUpperCase();
        if (tag === 'STRONG' || tag === 'B' || /^H[1-6]$/.test(tag)) return true;
        try {
            const fw = getComputedStyle(el).fontWeight;
            const n = fw === 'bold' ? 700 : (fw === 'bolder' ? 800 : parseInt(fw, 10));
            if (!isNaN(n) && n >= 600) return true;
        } catch (e) {}
        return false;
    }
    function getRandomDelayMs() {
        const sec = Math.random() * (CFG.RANDOM_MAX_SEC - CFG.RANDOM_MIN_SEC) + CFG.RANDOM_MIN_SEC;
        return Math.round(sec * 1000);
    }

    /* ========== Worker 后台延迟 ========== */
    const workerCode = `let timer=null;self.onmessage=function(e){if(e.data&&e.data.cmd==='start'){const ms=e.data.ms||1000;if(timer)clearInterval(timer);timer=setInterval(function(){self.postMessage({tick:Date.now()});},ms);}else if(e.data&&e.data.cmd==='stop'){if(timer){clearInterval(timer);timer=null;}}};`;
    let bgWorker = null;
    function ensureWorker() {
        if (bgWorker) return bgWorker;
        try { bgWorker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }))); }
        catch (e) { bgWorker = null; }
        return bgWorker;
    }
    let __delayResolve = null;
    function interruptDelay() {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        if (__delayResolve) { const r = __delayResolve; __delayResolve = null; try { r(); } catch (e) {} }
    }
    function waitDelay(ms) {
        return new Promise(resolve => {
            __delayResolve = () => { __delayResolve = null; resolve(); };
            const w = ensureWorker();
            if (w) {
                const handler = (e) => {
                    if (e.data && e.data.tick) {
                        w.removeEventListener('message', handler);
                        try { w.postMessage({ cmd: 'stop' }); } catch (_) {}
                        if (__delayResolve) { const r = __delayResolve; __delayResolve = null; r(); }
                    }
                };
                w.addEventListener('message', handler, { once: true });
                try { w.postMessage({ cmd: 'start', ms }); }
                catch (err) {
                    try { w.removeEventListener('message', handler); } catch (e2) {}
                    clickTimer = setTimeout(() => { if (__delayResolve) { const r = __delayResolve; __delayResolve = null; r(); } }, ms);
                }
            } else {
                clickTimer = setTimeout(() => { if (__delayResolve) { const r = __delayResolve; __delayResolve = null; r(); } }, ms);
            }
        });
    }

    /* ============================================================
     * 保活模块（含超级保活 v2）
     * ============================================================ */
    let keepAliveAudio = null, wakeLock = null, visibilityPatched = false;
    // ★ 超级保活变量
    let superKeepAliveTimer = null, videoMarkerTimer = null;
    let pauseHardPatched = false;
    let totalRecoverCount = 0;

    function patchVisibility() {
        if (visibilityPatched) return;
        visibilityPatched = true;
        try {
            Object.defineProperty(document, 'hidden', { configurable: true, get: function() { return false; } });
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: function() { return 'visible'; } });
            console.log('[QCC] ✓ visibility 伪装已启用');
        } catch (e) {}
    }
    function patchPauseMethod() {
        if (window.__QCC_PAUSE_PATCHED__) return;
        window.__QCC_PAUSE_PATCHED__ = true;
        try {
            const origPause = HTMLMediaElement.prototype.pause;
            window.__QCC_ORIG_PAUSE__ = origPause;
            HTMLMediaElement.prototype.pause = function() {
                if (!isRunning || this.ended) return origPause.call(this);
                if (document.hidden) return;
                return origPause.call(this);
            };
            console.log('[QCC] ✓ pause 拦截已启用');
        } catch (e) {}
    }
    // ★ 硬拦截：带 qccForcePlay 标记的 video 强制拒停
    function patchPauseHard() {
        if (pauseHardPatched) return;
        pauseHardPatched = true;
        try {
            const cur = HTMLMediaElement.prototype.pause;
            HTMLMediaElement.prototype.pause = function() {
                if (this.dataset && this.dataset.qccForcePlay === '1' && !this.ended) {
                    console.log('[QCC] 硬拦截 pause');
                    return;
                }
                return cur.call(this);
            };
            console.log('[QCC] ✓ 硬拦截 pause 已启用');
        } catch (e) {}
    }
    function markAllVideos() {
        try {
            document.querySelectorAll('video').forEach(v => {
                v.dataset.qccForcePlay = '1';
                if (!v.dataset.qccLastCT) v.dataset.qccLastCT = '0';
                if (!v.dataset.qccStuckCount) v.dataset.qccStuckCount = '0';
            });
        } catch (e) {}
    }
    // ★ 超级保活 v2：每秒检测视频 + 卡顿 30 秒放弃
    function startSuperKeepAlive() {
        if (superKeepAliveTimer) return;
        patchPauseHard();
        markAllVideos();
        totalRecoverCount = 0;
        superKeepAliveTimer = setInterval(() => {
            if (!isRunning) return;
            try {
                document.querySelectorAll('video').forEach(v => {
                    if (v.dataset.qccGiveUp === '1') return;
                    const ct = v.currentTime || 0;
                    if (v.dataset.qccLastCT === String(ct)) {
                        v.dataset.qccStuckCount = String(parseInt(v.dataset.qccStuckCount || '0', 10) + 1);
                    } else {
                        v.dataset.qccStuckCount = '0';
                        v.dataset.qccLastCT = String(ct);
                    }
                    const stuck = parseInt(v.dataset.qccStuckCount || '0', 10);

                    if (v.paused && !v.ended && ct > 0) {
                        totalRecoverCount++;
                        if (totalRecoverCount % 3 === 0) {
                            console.log('[QCC] 已恢复 ' + totalRecoverCount + ' 次（每3次打印）');
                        }
                        v.play().catch(() => {});
                    }

                    if (stuck >= 30 && v.dataset.qccGiveUp !== '1') {
                        v.dataset.qccGiveUp = '1';
                        console.warn('[QCC] ⚠️ 视频连续卡顿 30 秒，已放弃恢复');
                        try { addLog('⚠️ 视频卡顿，建议刷新页面 / 换网络 / 换课程', 'err'); } catch (e) {}
                    }
                });
            } catch (e) {}
        }, 1000);
        videoMarkerTimer = setInterval(markAllVideos, 3000);
        console.log('[QCC] ✓ 超级保活 v2 已启用');
    }
    function stopSuperKeepAlive() {
        if (superKeepAliveTimer) { clearInterval(superKeepAliveTimer); superKeepAliveTimer = null; }
        if (videoMarkerTimer) { clearInterval(videoMarkerTimer); videoMarkerTimer = null; }
        totalRecoverCount = 0;
        try {
            document.querySelectorAll('video').forEach(v => {
                delete v.dataset.qccForcePlay;
                delete v.dataset.qccLastCT;
                delete v.dataset.qccStuckCount;
                delete v.dataset.qccGiveUp;
            });
        } catch (e) {}
    }

    function startMediaSession() {
        try {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
                try { navigator.mediaSession.metadata = new MediaMetadata({ title: '学习视频', artist: '国开学习' }); } catch (e) {}
                console.log('[QCC] ✓ MediaSession 已启用');
            }
        } catch (e) {}
    }
    async function requestWakeLock() {
        try {
            if ('wakeLock' in navigator && !wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                console.log('[QCC] ✓ WakeLock 已获取');
                wakeLock.addEventListener('release', () => { wakeLock = null; if (isRunning) setTimeout(requestWakeLock, 1000); });
            }
        } catch (e) {}
    }
    function releaseWakeLock() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }
    function startKeepAlive() {
        if (keepAliveAudio) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = 440; gain.gain.value = 0.00005;
            osc.connect(gain).connect(ctx.destination); osc.start();
            const resumeTimer = setInterval(() => { try { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); } catch (e) {} }, 30000);
            keepAliveAudio = { ctx, osc, gain, resumeTimer };
            console.log('[QCC] ✓ 440Hz 保活音频已启用');
        } catch (e) {}
    }
    function stopKeepAlive() {
        try { if (keepAliveAudio) { if (keepAliveAudio.resumeTimer) clearInterval(keepAliveAudio.resumeTimer); keepAliveAudio.osc.stop(); keepAliveAudio.ctx.close(); } } catch (e) {}
        keepAliveAudio = null;
    }
    function enableAllKeepAlive() {
        patchVisibility();
        patchPauseMethod();
        startMediaSession();
        startKeepAlive();
        requestWakeLock();
        startSuperKeepAlive();   // ★ 启动超级保活
    }
    function disableAllKeepAlive() {
        stopKeepAlive();
        releaseWakeLock();
        stopSuperKeepAlive();    // ★ 停止超级保活
    }

    /* ========== 全局状态 ========== */
    let panel, statusEl, statusTextEl, listBox, listCountEl;
    let __leftNavCache = null;
    let selectedEls = [];
    let isRunning = false, isPaused = false;
    let clickTimer = null, clickIndex = 0, clickedTotal = 0, maxClicks = 0;
    let expanding = false, picking = false, processingVideo = false;
    const clickCountMap = new WeakMap();

    /* ========== 自动缩放 ========== */
    function calcAutoScale() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        let scale;
        if (w >= 3600)      scale = 1.40;
        else if (w >= 2800) scale = 1.25;
        else if (w >= 2200) scale = 1.10;
        else if (w >= 1920) scale = 1.00;
        else if (w >= 1600) scale = 0.92;
        else if (w >= 1400) scale = 0.85;
        else if (w >= 1200) scale = 0.78;
        else                scale = 0.72;
        if (h < 720 && scale > 0.9) scale = 0.9;
        if (h < 600 && scale > 0.8) scale = 0.8;
        return scale;
    }
    function applyAutoScale() {
        if (!panel) return;
        const scale = calcAutoScale();
        if ('zoom' in panel.style) {
            panel.style.zoom = scale;
        } else {
            panel.style.transformOrigin = 'top right';
            panel.style.transform = `scale(${scale})`;
        }
    }

    /* ========== 统计与日志 ========== */
    const runStats = { runStartTime: 0, lastRuntime: 0, videoCount: 0, videoSeconds: 0 };
    let logEntries = [];
    let logListEl = null, statRuntimeEl = null, statVideoEl = null, statVideosEl = null, statClicksEl = null;
    let logUpdateTimer = null;
    const _recordedVideos = new WeakSet();

    function fmtHMS(sec) {
        sec = Math.max(0, Math.floor(sec || 0));
        return `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    }
    function fmtMinSec(sec) {
        sec = Math.max(0, sec || 0);
        if (sec < 60) return `${sec.toFixed(0)}秒`;
        const m = sec / 60;
        if (m < 60) return `${m.toFixed(1)}分钟`;
        return `${Math.floor(m / 60)}小时${(m % 60).toFixed(0)}分`;
    }

    function addLog(text, type) {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        logEntries.push({ time, text, type: type || '' });
        if (logEntries.length > CFG.LOG_MAX) { logEntries.shift(); renderLog(); return; }
        if (!logListEl) return;
        if (logEntries.length === 1) logListEl.innerHTML = '';
        const row = document.createElement('div');
        row.className = 'qcc-log-item' + (type ? ' ' + type : '');
        const t = document.createElement('span'); t.className = 'qcc-log-time'; t.textContent = time;
        const x = document.createElement('span'); x.className = 'qcc-log-text'; x.textContent = text;
        row.appendChild(t); row.appendChild(x);
        logListEl.insertBefore(row, logListEl.firstChild);
    }
    function renderLog() {
        if (!logListEl) return;
        if (logEntries.length === 0) { logListEl.innerHTML = '<div class="qcc-log-empty">暂无日志</div>'; return; }
        const frag = document.createDocumentFragment();
        for (let i = logEntries.length - 1; i >= 0; i--) {
            const e = logEntries[i];
            const row = document.createElement('div');
            row.className = 'qcc-log-item' + (e.type ? ' ' + e.type : '');
            const t = document.createElement('span'); t.className = 'qcc-log-time'; t.textContent = e.time;
            const x = document.createElement('span'); x.className = 'qcc-log-text'; x.textContent = e.text;
            row.appendChild(t); row.appendChild(x);
            frag.appendChild(row);
        }
        logListEl.innerHTML = '';
        logListEl.appendChild(frag);
    }
    function updateStatsUI() {
        if (!statRuntimeEl) return;
        const runtime = isRunning ? (Date.now() - runStats.runStartTime) / 1000 : runStats.lastRuntime;
        statRuntimeEl.textContent = fmtHMS(runtime);
        statVideoEl.textContent = fmtMinSec(runStats.videoSeconds);
        statVideosEl.textContent = runStats.videoCount + '个';
        statClicksEl.textContent = clickedTotal + '次';
    }
    function resetStats() {
        logEntries = [];
        runStats.videoCount = 0; runStats.videoSeconds = 0; runStats.lastRuntime = 0;
        if (isRunning) runStats.runStartTime = Date.now();
        clickedTotal = 0;
        renderLog(); updateStatsUI();
    }
    function recordVideoWatched(video, watchedSeconds) {
        if (!video || _recordedVideos.has(video)) return;
        _recordedVideos.add(video);
        let watched = watchedSeconds;
        if (typeof watched !== 'number' || !isFinite(watched) || watched < 1) {
            try {
                const ct = video.currentTime || 0;
                const dur = video.duration;
                watched = (isFinite(dur) && dur > 0) ? Math.min(ct, dur) : ct;
            } catch (e) { watched = 0; }
        }
        if (!isFinite(watched) || watched < 1) return;
        runStats.videoSeconds += watched;
        runStats.videoCount += 1;
        addLog(`🎬 视频完成 +${fmtMinSec(watched)}（累计 ${fmtMinSec(runStats.videoSeconds)} / ${runStats.videoCount}个）`, 'ok');
        updateStatsUI();
    }

    /* VIP 授权时间显示（修复版：不再误判"终身有效"） */
    function formatAuthTime() {
        if (!authorized) {
            return authCode ? { text: '待验证', cls: 'warn' } : { text: '未授权', cls: '' };
        }
        const raw = localStorage.getItem(STORAGE_KEYS.EXPIRE) || '';
        // 情形 C：明确终身
        if (raw === 'lifetime') return { text: 'VIP · 终身有效', cls: 'ok' };
        const ex = parseInt(raw, 10);
        // 情形 E：无到期时间 → 中性显示
        if (!ex || ex <= 0) return { text: 'VIP · 已授权', cls: 'ok' };
        const left = ex - Date.now();
        if (left <= 0) return { text: 'VIP · 已过期', cls: 'err' };
        const days = Math.ceil(left / 86400000);
        if (days > 30) {
            const d = new Date(ex);
            const str = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
            return { text: `VIP · 至 ${str}`, cls: 'ok' };
        }
        if (days > 3) return { text: `VIP · 剩余 ${days} 天`, cls: 'ok' };
        return { text: `VIP · 仅剩 ${days} 天`, cls: 'warn' };
    }
    function updateAuthTimeUI() {
        const at = document.getElementById('qcc-auth-time');
        if (!at) return;
        const info = formatAuthTime();
        at.textContent = info.text;
        at.className = 'qcc-auth-time' + (info.cls ? ' ' + info.cls : '');
    }

    function setStatus(text, cls) { if (!statusTextEl) return; statusTextEl.textContent = text; statusEl.className = 'qcc-status' + (cls ? ' ' + cls : ''); }
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
            const item = document.createElement('div'); item.className = 'qcc-list-item';
            const txt = document.createElement('span'); txt.className = 'qcc-list-item-text';
            const cnt = clickCountMap.get(el) || 0;
            txt.textContent = `${i + 1}. ${getElText(el)}${cnt > 0 ? ' ×' + cnt : ''}`;
            const del = document.createElement('button'); del.className = 'qcc-list-item-del'; del.textContent = '×';
            del.addEventListener('click', (e) => { e.stopPropagation(); removeSelected(el); });
            item.appendChild(txt); item.appendChild(del); listBox.appendChild(item);
        });
    }
    function removeSelected(el) { try { el.classList.remove('qcc-pick-selected'); } catch (e) {} const i = selectedEls.indexOf(el); if (i > -1) selectedEls.splice(i, 1); renderList(); }
    function clearSelected() { selectedEls.forEach(el => { try { el.classList.remove('qcc-pick-selected'); } catch (e) {} }); selectedEls = []; renderList(); }

    function updateRunButtons() {
        const b1 = document.getElementById('qcc-start');
        const b2 = document.getElementById('qcc-stop');
        const b3 = document.getElementById('qcc-pause');
        if (b1) b1.disabled = isRunning;
        if (b2) b2.disabled = !isRunning;
        if (b3) {
            b3.disabled = !isRunning;
            b3.innerHTML = isPaused
                ? '<span class="qcc-btn-icon">▶</span> 继续'
                : '<span class="qcc-btn-icon">⏸</span> 暂停';
        }
    }

    /* ========== 手动拾取 ========== */
    let manualPicking = false, manualHoverEl = null, manualOverHandler = null, manualClickHandler = null;
    function pickManualTarget(el) {
        if (!el || el.nodeType !== 1) return null;
        if (panel && panel.contains(el)) return null;
        let cur = el;
        for (let i = 0; i < 5 && cur; i++) {
            const tag = (cur.tagName || '').toUpperCase();
            if (tag === 'A') return cur;
            if (cur.getAttribute && cur.getAttribute('href')) return cur;
            try { if (getComputedStyle(cur).cursor === 'pointer') return cur; } catch (e) {}
            cur = cur.parentElement;
        }
        return el;
    }
    function updatePickButton() {
        const btn = document.getElementById('qcc-auto-pick');
        if (!btn) return;
        if (authorized) btn.innerHTML = '<span class="qcc-btn-icon">🔍</span> 自动选择';
        else if (manualPicking) btn.innerHTML = '<span class="qcc-btn-icon">✋</span> 退出手动';
        else btn.innerHTML = '<span class="qcc-btn-icon">👆</span> 手动选择';
    }
    function enterManualPick() {
        if (manualPicking) return;
        manualPicking = true;
        manualOverHandler = (e) => {
            const el = pickManualTarget(e.target);
            if (!el || manualHoverEl === el) return;
            if (manualHoverEl) { try { manualHoverEl.classList.remove('qcc-manual-hover'); } catch (err) {} }
            manualHoverEl = el;
            try { el.classList.add('qcc-manual-hover'); } catch (err) {}
        };
        manualClickHandler = (e) => {
            if (panel && panel.contains(e.target)) return;
            e.preventDefault(); e.stopPropagation();
            const el = pickManualTarget(e.target);
            if (!el || selectedEls.includes(el)) return;
            selectedEls.push(el);
            try { el.classList.add('qcc-pick-selected'); } catch (err) {}
            renderList();
            setStatus(`👆 手动选择中… 已添加 ${selectedEls.length} 个元素`, 'running');
        };
        document.addEventListener('mouseover', manualOverHandler, true);
        document.addEventListener('click', manualClickHandler, true);
        try { document.body.style.cursor = 'crosshair'; } catch (e) {}
        updatePickButton();
        setStatus('👆 手动选择：点击页面元素添加（再次点击按钮或 ESC 退出）', 'running');
    }
    function exitManualPick() {
        if (!manualPicking) return;
        manualPicking = false;
        if (manualOverHandler) { try { document.removeEventListener('mouseover', manualOverHandler, true); } catch (e) {} manualOverHandler = null; }
        if (manualClickHandler) { try { document.removeEventListener('click', manualClickHandler, true); } catch (e) {} manualClickHandler = null; }
        if (manualHoverEl) { try { manualHoverEl.classList.remove('qcc-manual-hover'); } catch (e) {} manualHoverEl = null; }
        try { document.body.style.cursor = ''; } catch (e) {}
        updatePickButton();
        setStatus(`已退出手动选择，共 ${selectedEls.length} 个元素`, '');
    }

    /* ========== 展开 ========== */
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function expandAllCollapsed() {
        if (expanding) return;
        expanding = true;
        __leftNavCache = null; __rootsDirty = true;
        const startTime = Date.now();
        const deadline = startTime + CFG.EXPAND_HARD_LIMIT_MS;
        let totalClicked = 0;
        const clickedOnce = new WeakSet();
        setStatus('🔍 正在展开目录…', 'running');
        addLog('📂 开始展开目录…', '');
        try {
            for (let loop = 0; loop < CFG.EXPAND_MAX_LOOPS; loop++) {
                if (Date.now() > deadline) break;
                const arrows = [];
                const seen = new Set();
                for (const root of getAllRoots()) {
                    let items;
                    try { items = root.querySelectorAll('[class*="sub-menu-title"]'); } catch (e) { continue; }
                    for (const el of items) {
                        if (seen.has(el) || clickedOnce.has(el)) continue;
                        seen.add(el);
                        if (panel && panel.contains(el)) continue;
                        const svg = el.querySelector('svg.svg-icon');
                        if (!svg) continue;
                        const style = svg.getAttribute('style') || '';
                        if (style.includes('rotate(180deg)')) continue;
                        arrows.push({ svg, parent: el });
                    }
                }
                if (arrows.length === 0) break;
                setStatus(`展开中… 剩 ${arrows.length} 个，已点 ${totalClicked}`, 'running');
                for (const { svg, parent } of arrows) {
                    if (Date.now() > deadline) break;
                    if (!svg.isConnected) continue;
                    try { realClick(svg); totalClicked++; clickedOnce.add(parent); } catch (e) {}
                    await sleep(CFG.EXPAND_CLICK_GAP_MS);
                }
                await sleep(CFG.EXPAND_LOOP_GAP_MS);
                __leftNavCache = null;
            }
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            const hitLimit = Date.now() - startTime >= CFG.EXPAND_HARD_LIMIT_MS - 50;
            setStatus(hitLimit ? `展开完成 ${totalClicked} 个（${elapsed}秒，达上限）` : `展开完成，共点击 ${totalClicked} 个（${elapsed}秒）`, '');
            addLog(`📂 展开完成：点击 ${totalClicked} 个（${elapsed}s）`, 'ok');
        } finally {
            expanding = false;
            __leftNavCache = null; __rootsDirty = true;
        }
    }

    /* ========== 拾取 ========== */
    function findLeftNav() {
        if (__leftNavCache && __leftNavCache.isConnected) return __leftNavCache;
        for (const root of getAllRoots()) {
            let all;
            try { all = root.querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) {
                if (panel && panel.contains(el)) continue;
                let st;
                try { st = getComputedStyle(el); } catch (e) { continue; }
                if (st.overflowY !== 'auto' && st.overflowY !== 'scroll') continue;
                let r;
                try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                if (r.width < 100 || r.width > 400 || r.left > 100) continue;
                if (el.scrollHeight < el.clientHeight) continue;
                __leftNavCache = el; return el;
            }
        }
        return null;
    }
    function isInLeftNav(el) {
        const nav = findLeftNav();
        if (!nav) { try { const r = el.getBoundingClientRect(); return r.left >= 0 && r.left <= 280; } catch (e) { return false; } }
        return nav.contains(el);
    }
    function resolveClickTarget(el) {
        let cur = el;
        for (let i = 0; i < 4 && cur; i++) {
            const tag = (cur.tagName || '').toUpperCase();
            if (tag === 'A') return cur;
            if (cur.getAttribute && cur.getAttribute('href')) return cur;
            try { if (getComputedStyle(cur).cursor === 'pointer') return cur; } catch (e) {}
            cur = cur.parentElement;
        }
        return el;
    }
    function collectOnce(intoSet) {
        const roots = getAllRoots();
        let hits = 0;
        for (const root of roots) {
            let list;
            try { list = root.querySelectorAll('.text-too-long'); } catch (e) { list = []; }
            for (const el of list) {
                if (panel && panel.contains(el)) continue;
                if (isBoldText(el)) continue;
                if (!isInLeftNav(el)) continue;
                let r;
                try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                if (r.width < 20 || r.height < 8) continue;
                let st;
                try { st = getComputedStyle(el); } catch (e) { continue; }
                if (st.display === 'none' || st.visibility === 'hidden') continue;
                if (!(el.textContent || '').trim()) continue;
                intoSet.add(resolveClickTarget(el)); hits++;
            }
        }
        if (hits === 0) {
            for (const root of roots) {
                let all;
                try { all = root.querySelectorAll('*'); } catch (e) { continue; }
                for (const el of all) {
                    if (panel && panel.contains(el)) continue;
                    if (isBoldText(el)) continue;
                    if (!isInLeftNav(el)) continue;
                    let r;
                    try { r = el.getBoundingClientRect(); } catch (e) { continue; }
                    if (r.width < 30 || r.height < 12 || r.height > 60) continue;
                    let st;
                    try { st = getComputedStyle(el); } catch (e) { continue; }
                    if (st.cursor !== 'pointer' || st.display === 'none') continue;
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
        __leftNavCache = null;
        setStatus('🔍 正在拾取…', 'running');
        try {
            await sleep(200);
            __leftNavCache = null;
            const collected = new Set();
            collectOnce(collected);
            for (const el of collected) {
                if (selectedEls.includes(el)) continue;
                selectedEls.push(el);
                try { el.classList.add('qcc-pick-selected'); } catch (e) {}
            }
            renderList();
            setStatus(selectedEls.length === 0
                ? '⚠️ 未找到可点击链接，请先点「一键展开」'
                : `✅ 已拾取 ${selectedEls.length} 个可点击链接`, '');
            addLog(`🔍 拾取完成：${selectedEls.length} 个可点击元素`, selectedEls.length ? 'ok' : '');
        } finally {
            picking = false;
            __leftNavCache = null;
        }
    }

    /* ========== 视频 ========== */
    let autoPlayVideo = false, videoSpeed = 2;

    function getAllDocuments() {
        const docs = [document];
        for (let i = 0; i < docs.length; i++) {
            let iframes;
            try { iframes = docs[i].querySelectorAll('iframe'); } catch (e) { continue; }
            for (const f of iframes) { try { const d = f.contentDocument; if (d && !docs.includes(d)) docs.push(d); } catch (e) {} }
        }
        return docs;
    }
    function getAllVideoElements() {
        const seen = new Set(), result = [];
        for (const root of getAllRoots()) {
            let vs;
            try { vs = root.querySelectorAll('video'); } catch (e) { continue; }
            for (const v of vs) { if (v.isConnected && !seen.has(v)) { seen.add(v); result.push(v); } }
        }
        for (const doc of getAllDocuments()) {
            let vs;
            try { vs = doc.querySelectorAll('video'); } catch (e) { continue; }
            for (const v of vs) { if (v.isConnected && !seen.has(v)) { seen.add(v); result.push(v); } }
        }
        return result;
    }
    function videoKey(v) { return (v.currentSrc || v.src || '') + '::' + (v.getAttribute('data-src') || ''); }
    function snapshotVideoKeys() {
        const set = new Set();
        for (const v of getAllVideoElements()) set.add(videoKey(v));
        return set;
    }
    async function waitForNewVideo(oldKeys, maxWaitMs) {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            for (const v of getAllVideoElements()) {
                const k = videoKey(v);
                if (k && !oldKeys.has(k)) return v;
            }
            await sleep(CFG.VIDEO_POLL_MS);
        }
        return null;
    }
    async function waitMetadata(v, maxWaitMs = 8000) {
        if (v.readyState >= 1) return true;
        return await new Promise(resolve => {
            const timer = setTimeout(() => { v.removeEventListener('loadedmetadata', onL); resolve(false); }, maxWaitMs);
            const onL = () => { clearTimeout(timer); resolve(true); };
            v.addEventListener('loadedmetadata', onL, { once: true });
        });
    }

    async function playVideoToEnd(video) {
        await waitMetadata(video, 8000);
        const forceRate = () => {
            try {
                if (video.playbackRate !== videoSpeed) video.playbackRate = videoSpeed;
                if (video.defaultPlaybackRate !== videoSpeed) video.defaultPlaybackRate = videoSpeed;
            } catch (e) {}
        };
        const forceMute = () => { try { if (!video.muted) video.muted = true; if (video.volume !== 0) video.volume = 0; } catch (e) {} };
        const onPause = () => {
            if (!isRunning) return;
            setTimeout(() => { try { if (video.paused && video.isConnected && isRunning) video.play().catch(() => {}); } catch (e) {} }, 200);
        };
        const onRC = () => { if (video.playbackRate !== videoSpeed) forceRate(); };
        const onVC = () => { forceMute(); };

        let watchedSeconds = 0, lastCT = 0;
        const onTimeUpdate = () => {
            const ct = video.currentTime || 0;
            const delta = ct - lastCT;
            if (delta > 0 && delta < 2) watchedSeconds += delta;
            lastCT = ct;
        };

        video.addEventListener('ratechange', onRC);
        video.addEventListener('pause', onPause);
        video.addEventListener('volumechange', onVC);
        video.addEventListener('timeupdate', onTimeUpdate);

        const rateTimer = setInterval(forceRate, 500);
        const keepAliveTimer = setInterval(() => {
            if (!isRunning) return;
            try {
                if (video.paused && !video.ended && video.isConnected) video.play().catch(() => {});
                forceMute(); forceRate();
            } catch (e) {}
        }, 2000);

        const cleanup = () => {
            video.removeEventListener('ratechange', onRC);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('volumechange', onVC);
            video.removeEventListener('timeupdate', onTimeUpdate);
            clearInterval(rateTimer); clearInterval(keepAliveTimer);
        };

        try {
            video.muted = true; video.volume = 0; forceRate();
            try { video.currentTime = 0; } catch (e) {}
            await video.play(); forceRate();
            try { video.currentTime = 0; } catch (e) {}
        } catch (e) {
            reportError('视频 play() 失败', e, true);
            cleanup(); return false;
        }

        await new Promise(resolve => {
            let last = -1, stuck = 0;
            const st = Date.now();
            const check = () => {
                if (!video.isConnected || video.ended) { resolve(); return; }
                const ct = video.currentTime || 0, dur = video.duration || 0;
                if (dur > 0 && isFinite(dur) && ct >= dur - 0.3) { resolve(); return; }
                if (Date.now() - st > CFG.VIDEO_PLAY_GRACE_MS) {
                    if (ct > 0 && Math.abs(ct - last) < 0.05) { stuck++; if (stuck > CFG.VIDEO_STUCK_LIMIT) { resolve(); return; } }
                    else stuck = 0;
                }
                last = ct; forceRate(); forceMute(); setTimeout(check, 500);
            };
            check();
        });
        cleanup();
        try { recordVideoWatched(video, watchedSeconds); } catch (e) {}
        return true;
    }

    /* ========== 主循环 ========== */
    function highlightClick(el) { try { el.classList.add('qcc-clicking'); } catch (e) {} setTimeout(() => { try { el.classList.remove('qcc-clicking'); } catch (e) {} }, 200); }

    async function doClick() {
        if (!isRunning || processingVideo) return;
        if (selectedEls.length === 0) { stopClicking(); setStatus('没有可点击的元素', ''); return; }
        selectedEls = selectedEls.filter(el => el.isConnected);
        if (selectedEls.length === 0) { stopClicking(); setStatus('所有元素已从页面移除', ''); renderList(); return; }
        if (maxClicks > 0 && clickedTotal >= maxClicks) {
            setStatus(`✅ 已达最大点击次数 ${maxClicks}，自动停止`, 'ok');
            addLog(`✅ 已达最大点击次数 ${maxClicks}`, 'ok');
            stopClicking();
            return;
        }
        const el = selectedEls[clickIndex % selectedEls.length];
        const oldKeys = snapshotVideoKeys();
        const label = getElText(el);
        try { realClick(pickClickTarget(el) || el); highlightClick(el); } catch (err) {}
        clickedTotal++; clickIndex++;
        clickCountMap.set(el, (clickCountMap.get(el) || 0) + 1);
        renderList();
        setStatus(`执行中… [${label}] 已点击 ${clickedTotal} 次`, 'running');
        addLog(`👆 第 ${clickedTotal} 次：${label}`, '');
        updateStatsUI();

        if (!autoPlayVideo) return;

        const video = await waitForNewVideo(oldKeys, CFG.VIDEO_WAIT_MS);
        if (!video) { addLog('⏳ 未检测到新视频（跳过）', ''); return; }

        processingVideo = true;
        updateRunButtons();
        setStatus(`🎬 检测到新视频，正在 ${videoSpeed} 倍速静音播放…`, 'running');
        addLog(`🎬 检测到视频，${videoSpeed}x 静音播放中…`, '');
        try { await playVideoToEnd(video); if (isRunning) setStatus('✅ 视频播放完成，准备下一个', ''); }
        catch (e) { reportError('播放异常', e, false); }
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
                const delay = getRandomDelayMs();
                await waitDelay(delay);
            }
        } finally {
            loopRunning = false;
        }
    }

    function startClicking() {
        if (isRunning) return;
        if (selectedEls.length === 0) { setStatus('请先选择左侧目录元素', ''); return; }
        if (manualPicking) exitManualPick();
        interruptDelay();
        try { if (bgWorker) bgWorker.postMessage({ cmd: 'stop' }); } catch (e) {}
        isRunning = true; isPaused = false; processingVideo = false;
        clickIndex = 0; clickedTotal = 0;

        runStats.runStartTime = Date.now();
        runStats.videoCount = 0; runStats.videoSeconds = 0; runStats.lastRuntime = 0;
        updateStatsUI();
        enableAllKeepAlive();
        updateRunButtons();
        setStatus('开始执行…（无限循环，随机间隔 2~12 秒）', 'running');
        addLog(`▶ 开始运行（${selectedEls.length} 个元素，间隔 2~12 秒，${autoPlayVideo ? videoSpeed + 'x 自动播放' : '⚠ 未开启自动播放'}${maxClicks > 0 ? '，上限 ' + maxClicks + ' 次' : ''}）`, autoPlayVideo ? 'ok' : 'err');
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
        if (!isRunning) return;
        isRunning = false; isPaused = false;
        interruptDelay();
        disableAllKeepAlive();
        try { if (bgWorker) bgWorker.postMessage({ cmd: 'stop' }); } catch (e) {}
        runStats.lastRuntime = runStats.runStartTime ? (Date.now() - runStats.runStartTime) / 1000 : 0;
        updateRunButtons();
        if (statusEl && statusEl.classList.contains('running')) setStatus(`已停止，共点击 ${clickedTotal} 次`, '');
        addLog(`■ 已停止 · 运行 ${fmtHMS(runStats.lastRuntime)} · 点击 ${clickedTotal} 次 · 视频 ${runStats.videoCount} 个（${fmtMinSec(runStats.videoSeconds)}）`, 'err');
        updateStatsUI();
    }
    async function playCurrentPageVideo() {
        if (processingVideo) { setStatus('已有视频正在处理中', ''); return; }
        if (!autoPlayVideo) { setStatus('🔒 请先开启「自动播放视频」开关', ''); return; }
        const videos = getAllVideoElements();
        if (videos.length === 0) { setStatus('当前页面没检测到视频', ''); addLog('🎬 当前页面无视频', 'err'); return; }
        const v = videos.find(x => !x.ended) || videos[0];
        processingVideo = true; updateRunButtons();
        setStatus(`🎬 手动播放视频，${videoSpeed} 倍速静音…`, 'running');
        addLog(`🎬 手动播放当前页面视频`, '');
        try { await playVideoToEnd(v); setStatus('✅ 手动播放完成', ''); }
        catch (e) { reportError('手动播放失败', e, true); }
        finally { processingVideo = false; updateRunButtons(); }
    }

    async function exportLogs() {
        const text = logEntries.map(e => `[${e.time}] ${e.text}`).join('\n');
        if (!text) { setStatus('暂无日志可导出', ''); return; }
        try {
            await navigator.clipboard.writeText(text);
            setStatus(`📋 日志已复制（${logEntries.length} 条）`, 'ok');
            addLog('📋 日志已复制到剪贴板', 'ok');
        } catch (e) {
            const ta = document.createElement('textarea'); ta.value = text;
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); setStatus('📋 日志已复制', 'ok'); } catch (err) { setStatus('❌ 复制失败', ''); }
            document.body.removeChild(ta);
        }
    }

    /* ========== 授权弹窗 ========== */
    function openDonateModal() {
        if (document.getElementById('qcc-donate-modal')) return;
        const modal = document.createElement('div'); modal.id = 'qcc-donate-modal';
        modal.innerHTML = `
            <div class="qcc-donate-card">
                <div class="qcc-donate-emoji">❤️</div>
                <div class="qcc-donate-title">感谢您的支持</div>
                <div class="qcc-donate-desc">如果这个脚本帮到了您，<br>欢迎随意打赏一杯咖啡～</div>
                <div class="qcc-donate-links">
                    <div class="qcc-donate-qq">QQ：3365137745</div>
                    <div class="qcc-donate-qq">群号：1124065231</div>
                </div>
                <div class="qcc-donate-note">授权后可解锁「自动播放视频」和「一键展开」</div>
                <div class="qcc-trial-card">
                    <div class="qcc-trial-head">
                        <span class="qcc-trial-label">🎁 半天试用卡</span>
                        <button class="qcc-trial-copy" id="qcc-trial-copy">复制</button>
                    </div>
                    <div class="qcc-trial-code" id="qcc-trial-code">${CFG.TRIAL_CODE}</div>
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
        document.body.appendChild(modal);
        const inputEl = document.getElementById('qcc-donate-auth-input');
        const btnEl = document.getElementById('qcc-donate-auth-btn');
        const msgEl = document.getElementById('qcc-donate-auth-msg');
        const authWrap = document.getElementById('qcc-donate-auth');
        // 试用卡复制
        document.getElementById('qcc-trial-copy').addEventListener('click', async () => {
            const b = document.getElementById('qcc-trial-copy');
            let ok = false;
            try {
                await navigator.clipboard.writeText(CFG.TRIAL_CODE);
                ok = true;
            } catch (e) {
                const ta = document.createElement('textarea'); ta.value = CFG.TRIAL_CODE;
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); ok = true; } catch (err) {}
                document.body.removeChild(ta);
            }
            if (ok) {
                b.textContent = '已复制';
                b.classList.add('copied');
                if (inputEl && !inputEl.disabled) inputEl.value = CFG.TRIAL_CODE;
                setTimeout(() => { b.textContent = '复制'; b.classList.remove('copied'); }, 1500);
            }
        });
        let esc = null;
        function closeModal() { try { modal.remove(); } catch (e) {} if (esc) document.removeEventListener('keydown', esc); }
        function syncModalAuth() {
            if (authorized) {
                authWrap.classList.add('is-ok'); inputEl.value = authCode; inputEl.disabled = true;
                btnEl.disabled = true; btnEl.textContent = '已授权';
                msgEl.textContent = '✅ 功能已解锁，可以使用了'; msgEl.className = 'qcc-auth-msg ok';
            } else {
                authWrap.classList.remove('is-ok'); inputEl.disabled = false;
                btnEl.disabled = false; btnEl.textContent = '确认';
                msgEl.textContent = authCode ? '⚠️ 上次验证未通过，请重新验证' : '输入卡密后点击「确认」解锁功能';
                msgEl.className = 'qcc-auth-msg';
                if (authCode) inputEl.value = authCode;
            }
        }
        async function tryAuth() {
            btnEl.disabled = true; btnEl.textContent = '验证中…';
            const res = await verifyAuthCode(inputEl.value);
            btnEl.disabled = false;
            if (res.ok) { syncModalAuth(); setStatus(res.msg, ''); addLog('🔐 卡密验证成功', 'ok'); setTimeout(closeModal, 1200); }
            else {
                msgEl.textContent = res.msg; msgEl.className = 'qcc-auth-msg err';
                setStatus(res.msg.replace(/[✅❌⚠️]\s*/g, ''), '');
                addLog('🔐 ' + res.msg.replace(/[✅❌⚠️]\s*/g, ''), 'err');
                authWrap.classList.remove('qcc-shake'); void authWrap.offsetWidth; authWrap.classList.add('qcc-shake');
                try { inputEl.focus(); inputEl.select(); } catch (e) {}
                btnEl.textContent = '确认';
            }
        }
        btnEl.addEventListener('click', tryAuth);
        inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tryAuth(); } });
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
        document.getElementById('qcc-donate-close').addEventListener('click', closeModal);
        esc = e => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', esc);
        syncModalAuth();
        if (!authorized) setTimeout(() => { try { inputEl.focus(); } catch (e) {} }, 120);
    }

    /* ========== 面板 ========== */
    function buildPanel() {
        if (document.getElementById('quick-custom-clicker')) return;
        loadConfig();
        panel = document.createElement('div');
        panel.id = 'quick-custom-clicker';
        panel.innerHTML = `
            <div class="qcc-header" id="qcc-drag">
                <div class="qcc-header-left">
                    <span class="qcc-logo">⚡</span>
                    <span class="qcc-title-text qcc-title-full">国开刷点击次数和时长</span>
                    <span class="qcc-title-text qcc-title-short">国开学习</span>
                    <span class="qcc-badge">v5.0.4</span>
                </div>
                <div class="qcc-header-right">
                    <button class="qcc-icon-btn" id="qcc-min">−</button>
                    <button class="qcc-icon-btn" id="qcc-close">×</button>
                </div>
            </div>
            <div class="qcc-body" id="qcc-body">
                <div class="qcc-section">
                    <div class="qcc-section-title">
                        <span>⚙️ 参数设置</span>
                        <span class="qcc-auth-time" id="qcc-auth-time">未授权</span>
                    </div>
                    <div class="qcc-field qcc-field-row qcc-field-compact qcc-row-with-btn">
                        <label>点击间隔</label>
                        <span class="qcc-interval-value">2~12s 随机</span>
                        <button id="qcc-play-current" class="qcc-inline-btn"><span class="qcc-btn-icon">🎬</span> 手动播放</button>
                    </div>
                    <div class="qcc-field qcc-field-row qcc-field-compact qcc-field-double">
                        <div class="qcc-double-item">
                            <label>最大次数</label>
                            <input type="number" id="qcc-max-clicks" min="0" step="1" value="0" class="qcc-num-input" title="0 = 无限">
                        </div>
                        <div class="qcc-double-item">
                            <label id="qcc-auto-video-label">自动播放 🔒</label>
                            <label class="qcc-switch"><input type="checkbox" id="qcc-auto-video"><span class="qcc-switch-slider"></span></label>
                        </div>
                    </div>
                    <div class="qcc-field qcc-field-block" id="qcc-speed-block">
                        <div class="qcc-field-head"><label>视频倍速</label><span class="qcc-speed-value" id="qcc-speed-value">2x</span></div>
                        <div class="qcc-speed-btns" id="qcc-speed-btns">
                            <button class="qcc-speed-btn active" data-speed="2">2x</button>
                            <button class="qcc-speed-btn" data-speed="4">4x</button>
                            <button class="qcc-speed-btn" data-speed="6">6x</button>
                            <button class="qcc-speed-btn" data-speed="8">8x</button>
                            <button class="qcc-speed-btn" data-speed="10">10x</button>
                        </div>
                    </div>
                </div>
                <div class="qcc-section">
                    <div class="qcc-section-title">ℹ️ 说明：先 [一键展开] → 后 [自动选择] → 再 [开始]</div>
                    <div class="qcc-btn-group">
                        <button id="qcc-expandRight" class="qcc-btn qcc-btn-primary"><span class="qcc-btn-icon">📂</span> <span id="qcc-expandRight-text">一键展开 🔒</span></button>
                        <button id="qcc-auto-pick" class="qcc-btn qcc-btn-primary"><span class="qcc-btn-icon">👆</span> 手动选择</button>
                    </div>
                    <div class="qcc-btn-group qcc-btn-group-sm">
                        <button id="qcc-clearList" class="qcc-btn qcc-btn-ghost qcc-btn-sm"><span class="qcc-btn-icon">🗑️</span> 清空列表</button>
                        <button id="qcc-donate" class="qcc-btn qcc-btn-donate qcc-btn-sm"><span class="qcc-btn-icon">❤️</span> 捐赠 / 授权</button>
                    </div>
                </div>
                <div class="qcc-section">
                    <div class="qcc-section-title">📌 说明：赠送试用卡 点[捐赠] → 再 [复制] →点 [确认]</div>
                    <div class="qcc-btn-group">
                        <button id="qcc-start" class="qcc-btn qcc-btn-success"><span class="qcc-btn-icon">▶</span> 开始</button>
                        <button id="qcc-pause" class="qcc-btn qcc-btn-ghost" disabled><span class="qcc-btn-icon">⏸</span> 暂停</button>
                        <button id="qcc-stop" class="qcc-btn qcc-btn-danger" disabled><span class="qcc-btn-icon">■</span> 停止</button>
                    </div>
                </div>
                <div class="qcc-status" id="qcc-status"><span class="qcc-status-dot"></span><span id="qcc-status-text">等待操作</span></div>
                <div class="qcc-list-box">
                    <div class="qcc-list-header"><span>已拾取元素</span><span class="qcc-list-count" id="qcc-list-count">0</span></div>
                    <div id="qcc-list" class="qcc-list">暂无元素</div>
                </div>
                <div class="qcc-log-box">
                    <div class="qcc-log-header">
                        <span>📊 运行统计 · 日志</span>
                        <span class="qcc-log-actions">
                            <button class="qcc-log-reset" id="qcc-log-export">导出</button>
                            <button class="qcc-log-reset" id="qcc-log-reset">重置</button>
                        </span>
                    </div>
                    <div class="qcc-stat-compact">
                        <span>运行 <b id="qcc-stat-runtime">00:00:00</b></span>
                        <span>视频 <b id="qcc-stat-video">0分钟</b> (<b id="qcc-stat-videos">0个</b>)</span>
                        <span>点击 <b id="qcc-stat-clicks">0次</b></span>
                    </div>
                    <div class="qcc-log-list" id="qcc-log-list"><div class="qcc-log-empty">暂无日志</div></div>
                </div>
            </div>`;

        const style = document.createElement('style');
        style.textContent = `
            #quick-custom-clicker{position:fixed;top:100px;right:20px;width:280px;background:rgba(255,255,255,0.72);backdrop-filter:saturate(180%) blur(24px);-webkit-backdrop-filter:saturate(180%) blur(24px);border-radius:18px;box-shadow:0 20px 60px rgba(15,23,42,0.18),0 8px 24px rgba(15,23,42,0.10),0 1px 0 rgba(255,255,255,0.6) inset,0 0 0 0.5px rgba(15,23,42,0.08);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1d1d1f;box-sizing:border-box;overflow:hidden;font-size:12px;transition:width .28s cubic-bezier(.4,0,.2,1);-webkit-font-smoothing:antialiased;letter-spacing:-0.01em;}
            #quick-custom-clicker *{box-sizing:border-box;}
            .qcc-header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#6EBBCE;color:#fff;cursor:move;user-select:none;border-bottom:0.5px solid rgba(15,23,42,0.08);}
            .qcc-header-left{display:flex;align-items:center;gap:6px;}
            .qcc-logo{font-size:14px;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.2));}
            .qcc-title-text{font-size:13px;font-weight:600;color:#fff;}
            .qcc-badge{font-size:9px;background:rgba(255,255,255,0.22);color:#fff;padding:2px 6px;border-radius:6px;font-weight:600;}
            .qcc-header-right{display:flex;gap:6px;}
            .qcc-icon-btn{width:22px;height:22px;border:0;background:rgba(255,255,255,0.22);color:#fff;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;display:inline-flex;align-items:center;justify-content:center;transition:all .18s;padding:0;transform:translateY(-0.5px);}
            .qcc-icon-btn:hover{background:rgba(255,255,255,0.38);}
            .qcc-icon-btn#qcc-close:hover{background:rgba(255,59,48,0.75);}
            .qcc-body{padding:12px;max-height:720px;overflow-y:auto;transition:max-height .28s,padding .28s,opacity .2s;}
            .qcc-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;opacity:0;overflow:hidden;}
            .qcc-body::-webkit-scrollbar{width:6px;}
            .qcc-body::-webkit-scrollbar-thumb{background:rgba(15,23,42,0.12);border-radius:3px;}
            .qcc-section{margin-bottom:14px;}
            .qcc-section-title{font-size:10px;font-weight:600;color:#8e8e93;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px;padding-left:2px;display:flex;justify-content:space-between;align-items:center;}
            .qcc-auth-time{
                font-size:9.5px;
                font-weight:600;
                color:#fff;
                background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);
                padding:0 10px;
                height:20px;
                line-height:20px;
                border-radius:10px;
                letter-spacing:0;
                text-transform:none;
                font-variant-numeric:tabular-nums;
                white-space:nowrap;
                display:inline-flex;
                align-items:center;
                box-shadow:0 2px 6px rgba(18,183,106,0.28);
            }
            .qcc-auth-time.ok{color:#fff;background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);}
            .qcc-auth-time.warn{color:#fff;background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);box-shadow:0 2px 6px rgba(247,144,9,0.28);}
            .qcc-auth-time.err{color:#fff;background:linear-gradient(180deg,#ff6b61 0%,#ff3b30 100%);box-shadow:0 2px 6px rgba(255,59,48,0.28);}
            .qcc-field-block{margin-bottom:8px;}
            .qcc-field-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
            .qcc-field-head label{font-size:11px;color:#3a3a3c;font-weight:500;}
            .qcc-field-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:0.5px solid rgba(15,23,42,0.06);gap:8px;}
            .qcc-field-row label{font-size:11px;color:#3a3a3c;font-weight:500;flex:0 0 auto;white-space:nowrap;}
            .qcc-field-compact{padding:6px 0;}
            .qcc-interval-value{font-size:10px;font-weight:600;color:#4f6ef7;background:rgba(79,110,247,0.10);padding:3px 8px;border-radius:6px;flex:0 0 auto;}
            .qcc-row-with-btn{gap:6px;}
            .qcc-inline-btn{
                margin-left:auto;
                flex:0 0 auto;
                height:24px;
                padding:0 10px;
                border:0;
                border-radius:8px;
                background:rgba(15,23,42,0.05);
                color:#3a3a3c;
                font-size:10.5px;
                font-weight:500;
                cursor:pointer;
                font-family:inherit;
                display:inline-flex;
                align-items:center;
                gap:4px;
                transition:all .18s;
                white-space:nowrap;
            }
            .qcc-inline-btn:hover{background:rgba(15,23,42,0.09);}
            .qcc-inline-btn:active{transform:scale(.97);}
            .qcc-inline-btn .qcc-btn-icon{font-size:11px;line-height:1;}
            .qcc-num-input{
                flex:0 0 42px !important;
                width:42px !important;
                height:20px !important;
                min-height:20px !important;
                max-height:20px !important;
                margin:0 !important;
                border:0 !important;
                background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%) !important;
                color:#fff !important;
                border-radius:10px !important;
                padding:0 6px !important;
                font-size:10px !important;
                font-weight:600 !important;
                line-height:20px !important;
                outline:none !important;
                box-shadow:0 2px 6px rgba(18,183,106,0.28) !important;
                font-family:inherit !important;
                text-align:center !important;
                transition:background .18s,box-shadow .18s !important;
                -moz-appearance:textfield !important;
                font-variant-numeric:tabular-nums !important;
                display:inline-block !important;
                vertical-align:middle !important;
            }
            .qcc-num-input::-webkit-outer-spin-button,
            .qcc-num-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
            .qcc-num-input:hover{
                background:linear-gradient(180deg,#43dc8a 0%,#22c876 100%) !important;
                box-shadow:0 2px 8px rgba(18,183,106,0.38) !important;
            }
            .qcc-num-input:focus{
                box-shadow:0 0 0 3px rgba(18,183,106,0.25),0 2px 8px rgba(18,183,106,0.4) !important;
            }
            .qcc-field-double{gap:10px;}
            .qcc-double-item{
                flex:1;
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:6px;
                min-width:0;
                line-height:20px;
            }
            .qcc-double-item label{
                font-size:11px;
                color:#3a3a3c;
                white-space:nowrap;
                flex:0 0 auto;
                line-height:20px;
                height:20px;
                display:inline-flex;
                align-items:center;
            }
            .qcc-double-item .qcc-num-input{
                flex:0 0 42px !important;
                width:42px !important;
                height:20px !important;
                min-height:20px !important;
                max-height:20px !important;
                margin:0 !important;
                line-height:20px !important;
            }
            .qcc-double-item .qcc-switch{flex:0 0 36px;}
            .qcc-btn{
                width:100%;
                border:0;
                border-radius:10px;
                padding:0 12px;
                height:24px;
                cursor:pointer;
                font-size:10.5px;
                font-weight:500;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:6px;
                transition:all .18s;
                font-family:inherit;
                line-height:1;
            }
            .qcc-btn-icon{font-size:11px;line-height:1;}
            .qcc-btn:disabled{opacity:.4;cursor:not-allowed;}
            .qcc-btn:not(:disabled):active{transform:scale(.97);}
            .qcc-btn-primary{background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);color:#fff;box-shadow:0 4px 14px rgba(79,110,247,0.30),0 1px 0 rgba(255,255,255,0.2) inset;}
            .qcc-btn-primary:not(:disabled):hover{background:linear-gradient(180deg,#6b85ff 0%,#5b78ff 100%);transform:translateY(-1px);}
            .qcc-btn-success{background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);color:#fff;box-shadow:0 4px 14px rgba(18,183,106,0.30);}
            .qcc-btn-success:not(:disabled):hover{background:linear-gradient(180deg,#43dc8a 0%,#22c876 100%);transform:translateY(-1px);}
            .qcc-btn-danger{background:rgba(255,59,48,0.08);color:#ff3b30;}
            .qcc-btn-danger:not(:disabled):hover{background:rgba(255,59,48,0.15);}
            .qcc-btn-ghost{background:rgba(15,23,42,0.05);color:#3a3a3c;}
            .qcc-btn-ghost:not(:disabled):hover{background:rgba(15,23,42,0.09);}
            .qcc-btn-donate{background:linear-gradient(180deg,#ff7aa2 0%,#ff4d7d 100%);color:#fff;box-shadow:0 4px 14px rgba(255,77,125,0.30);}
            .qcc-btn-donate:not(:disabled):hover{background:linear-gradient(180deg,#ff8aae 0%,#ff5c88 100%);transform:translateY(-1px);}
            .qcc-btn-sm{
                padding:0 8px;
                height:24px;
                font-size:10.5px;
                margin-top:6px;
                gap:4px;
            }
            .qcc-btn-sm .qcc-btn-icon{font-size:11px;}
            .qcc-btn-group{display:flex;gap:6px;}
            .qcc-btn-group-sm{margin-top:6px;}
            .qcc-btn-group-sm .qcc-btn-sm{margin-top:0;flex:1;}
            .qcc-status{display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(15,23,42,0.04);border-radius:10px;font-size:10.5px;color:#3a3a3c;margin-bottom:12px;line-height:1.35;}
            .qcc-status-dot{width:7px;height:7px;border-radius:50%;background:#8e8e93;flex-shrink:0;}
            .qcc-status.running .qcc-status-dot{background:#12b76a;box-shadow:0 0 0 3px rgba(18,183,106,0.18);animation:qcc-pulse 1.4s infinite;}
            @keyframes qcc-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.55;transform:scale(1.15);}}
            .qcc-list-box{background:rgba(15,23,42,0.04);border-radius:10px;padding:8px 10px;margin-bottom:12px;}
            .qcc-list-header{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#8e8e93;font-weight:600;margin-bottom:6px;}
            .qcc-list-count{background:rgba(15,23,42,0.08);color:#3a3a3c;padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:600;}
            .qcc-list{max-height:90px;min-height:32px;overflow-y:auto;font-size:10.5px;color:#3a3a3c;}
            .qcc-list-item{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:6px 8px;background:rgba(255,255,255,0.7);border-radius:8px;margin-bottom:4px;border:0.5px solid rgba(15,23,42,0.06);}
            .qcc-list-item-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .qcc-list-item-del{border:0;background:transparent;color:#c7c7cc;cursor:pointer;font-size:12px;padding:0 2px;}
            .qcc-list-item-del:hover{color:#ff3b30;}
            .qcc-pick-selected{outline:2px solid #12b76a !important;outline-offset:1px !important;background:rgba(18,183,106,0.10) !important;border-radius:4px;}
            .qcc-clicking{outline:3px solid #f79009 !important;outline-offset:1px !important;}
            .qcc-manual-hover{outline:2px dashed #4f6ef7 !important;outline-offset:2px !important;background:rgba(79,110,247,0.08) !important;cursor:crosshair !important;}
            .qcc-switch{position:relative;width:36px;height:20px;flex:0 0 36px;display:inline-block;}
            .qcc-switch input{opacity:0;width:0;height:0;}
            .qcc-switch-slider{position:absolute;cursor:pointer;inset:0;background:rgba(15,23,42,0.12);border-radius:10px;transition:.28s;}
            .qcc-switch-slider:before{position:absolute;content:'';height:16px;width:16px;left:2px;bottom:2px;background:#fff;border-radius:50%;transition:.28s;box-shadow:0 1px 3px rgba(0,0,0,.18);}
            .qcc-switch input:checked + .qcc-switch-slider{background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);}
            .qcc-switch input:checked + .qcc-switch-slider:before{transform:translateX(16px);}
            .qcc-speed-btns{display:flex;gap:4px;margin-top:5px;}
            .qcc-speed-btn{
                flex:1;
                height:24px;
                border-radius:8px;
                border:0.5px solid rgba(15,23,42,0.10);
                background:rgba(255,255,255,0.6);
                color:#6b7280;
                font-size:10.5px;
                font-weight:600;
                cursor:pointer;
                padding:0;
                font-family:inherit;
                transition:all .18s;
            }
            .qcc-speed-btn:hover{background:rgba(255,255,255,0.95);color:#4f6ef7;}
            .qcc-speed-btn.active{background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);border-color:transparent;color:#fff;}
            .qcc-speed-value{font-size:10px;font-weight:600;color:#4f6ef7;background:rgba(79,110,247,0.10);padding:3px 8px;border-radius:6px;min-width:36px;text-align:center;}
            #qcc-speed-block.qcc-hidden{display:none;}
            .qcc-title-short{display:none;}
            #quick-custom-clicker.qcc-collapsed{width:105px;}
            #quick-custom-clicker.qcc-collapsed .qcc-header{padding:9px 9px 9px 12px;border-bottom:0;}
            #quick-custom-clicker.qcc-collapsed .qcc-logo,
            #quick-custom-clicker.qcc-collapsed .qcc-badge,
            #quick-custom-clicker.qcc-collapsed .qcc-title-full{display:none;}
            #quick-custom-clicker.qcc-collapsed .qcc-title-short{display:inline;font-size:13px;font-weight:600;color:#fff;}
            #quick-custom-clicker.qcc-collapsed .qcc-header-left{gap:0;flex:1;justify-content:flex-start;}
            #quick-custom-clicker.qcc-collapsed .qcc-icon-btn{width:26px;height:26px;font-size:18px;background:rgba(255,255,255,0.30);}
            #quick-custom-clicker.qcc-collapsed #qcc-close{display:none;}
            .qcc-log-box{background:rgba(15,23,42,0.04);border-radius:10px;padding:8px 10px;margin-bottom:12px;}
            .qcc-log-header{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#8e8e93;font-weight:600;margin-bottom:6px;}
            .qcc-log-actions{display:flex;gap:4px;}
            .qcc-log-reset{border:0;background:transparent;color:#8e8e93;font-size:9.5px;padding:2px 6px;border-radius:4px;cursor:pointer;font-family:inherit;transition:all .2s;}
            .qcc-log-reset:hover{background:rgba(79,110,247,0.10);color:#4f6ef7;}
            .qcc-stat-compact{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10px;color:#6b7280;padding:4px 0;margin-bottom:6px;border-bottom:0.5px dashed rgba(15,23,42,0.1);}
            .qcc-stat-compact b{font-weight:600;color:#1d1d1f;font-variant-numeric:tabular-nums;}
            .qcc-log-list{max-height:60px;overflow-y:auto;font-size:10px;line-height:1.5;}
            .qcc-log-list::-webkit-scrollbar{width:10px;}
            .qcc-log-list::-webkit-scrollbar-track{background:transparent;border-radius:5px;}
            .qcc-log-list::-webkit-scrollbar-thumb{
                background:rgba(120,120,120,0.55);
                border-radius:5px;
                border:2px solid transparent;
                background-clip:content-box;
            }
            .qcc-log-list::-webkit-scrollbar-thumb:hover{
                background:rgba(100,100,100,0.75);
                border:2px solid transparent;
                background-clip:content-box;
            }
            .qcc-log-list::-webkit-scrollbar-button{display:none;width:0;height:0;}
            .qcc-log-item{display:flex;gap:6px;padding:2px 0;border-bottom:0.5px solid rgba(15,23,42,0.04);}
            .qcc-log-time{color:#a1a1a6;flex-shrink:0;font-variant-numeric:tabular-nums;}
            .qcc-log-text{color:#3a3a3c;word-break:break-all;}
            .qcc-log-item.ok .qcc-log-text{color:#0e8f52;}
            .qcc-log-item.err .qcc-log-text{color:#ff3b30;}
            .qcc-log-empty{color:#a1a1a6;text-align:center;padding:8px 0;font-size:10px;}
            #qcc-donate-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,0.38);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;font-family:inherit;animation:qcc-fade-in .2s;}
            @keyframes qcc-fade-in{from{opacity:0}to{opacity:1}}
            .qcc-donate-card{width:290px;background:rgba(255,255,255,0.94);backdrop-filter:saturate(180%) blur(24px);border-radius:18px;padding:20px 18px 16px;text-align:center;box-shadow:0 24px 70px rgba(15,23,42,0.28);animation:qcc-pop-in .26s cubic-bezier(.2,1.2,.4,1);}
            @keyframes qcc-pop-in{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
            .qcc-donate-emoji{font-size:34px;margin-bottom:8px;}
            .qcc-donate-title{font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:6px;}
            .qcc-donate-desc{font-size:11px;color:#6b7280;line-height:1.6;margin-bottom:12px;}
            .qcc-donate-links{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;}
            .qcc-donate-links .qcc-donate-qq{margin-bottom:0;}
            .qcc-donate-qq{display:inline-block;font-size:12px;font-weight:600;color:#4f6ef7;background:rgba(79,110,247,0.10);padding:6px 12px;border-radius:8px;margin-bottom:6px;user-select:text;}
            .qcc-donate-note{font-size:10px;color:#a1a1a6;margin-bottom:12px;}
            .qcc-trial-card{text-align:left;background:linear-gradient(135deg,rgba(255,181,64,0.12) 0%,rgba(255,120,70,0.12) 100%);border:0.5px solid rgba(255,149,0,0.30);border-radius:10px;padding:9px 10px;margin-bottom:12px;}
            .qcc-trial-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
            .qcc-trial-label{font-size:10px;font-weight:600;color:#b25e00;}
            .qcc-trial-copy{height:20px;padding:0 8px;border:0;border-radius:6px;background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);color:#fff;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 6px rgba(247,144,9,0.30);transition:all .18s;display:inline-flex;align-items:center;}
            .qcc-trial-copy:hover{transform:translateY(-1px);}
            .qcc-trial-copy:active{transform:scale(.97);}
            .qcc-trial-copy.copied{background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);box-shadow:0 2px 6px rgba(18,183,106,0.30);}
            .qcc-trial-code{font-size:12px;font-weight:700;color:#1d1d1f;font-family:ui-monospace,Menlo,monospace;letter-spacing:.10em;word-break:break-all;background:rgba(255,255,255,0.75);padding:6px 9px;border-radius:6px;user-select:text;text-align:center;}
            .qcc-donate-auth{text-align:left;background:rgba(255,149,0,0.08);border:0.5px solid rgba(255,149,0,0.22);border-radius:10px;padding:10px;margin-bottom:12px;transition:.2s;}
            .qcc-donate-auth.is-ok{background:rgba(18,183,106,0.08);border-color:rgba(18,183,106,0.25);}
            .qcc-donate-auth.qcc-shake{animation:qcc-shake .36s;}
            @keyframes qcc-shake{10%,90%{transform:translateX(-1.5px);}20%,80%{transform:translateX(3px);}30%,50%,70%{transform:translateX(-5px);}40%,60%{transform:translateX(5px);}}
            .qcc-donate-auth-title{font-size:10px;font-weight:600;color:#b25e00;margin-bottom:7px;}
            .qcc-donate-auth.is-ok .qcc-donate-auth-title{color:#0e8f52;}
            .qcc-donate-auth-row{display:flex;gap:6px;}
            .qcc-auth-input{flex:1;min-width:0;height:26px;border:0.5px solid rgba(15,23,42,0.12);background:rgba(255,255,255,0.85);border-radius:7px;padding:0 8px;font-size:10.5px;outline:none;font-family:inherit;}
            .qcc-auth-input:focus{border-color:rgba(79,110,247,0.5);box-shadow:0 0 0 3px rgba(79,110,247,0.12);}
            .qcc-auth-input:disabled{background:rgba(15,23,42,0.04);color:#6b7280;}
            .qcc-auth-btn{height:26px;padding:0 12px;border:0;border-radius:7px;background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);color:#fff;font-size:10.5px;font-weight:600;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(247,144,9,0.3);}
            .qcc-auth-btn:disabled{opacity:.6;background:rgba(18,183,106,0.75);}
            .qcc-auth-msg{font-size:9.5px;color:#8e8e93;margin-top:5px;line-height:1.45;}
            .qcc-auth-msg.err{color:#ff3b30;}
            .qcc-auth-msg.ok{color:#12b76a;}
            .qcc-donate-close{width:100%;border:0;border-radius:10px;padding:9px 12px;background:rgba(15,23,42,0.06);color:#3a3a3c;font-size:11.5px;cursor:pointer;font-family:inherit;}
            .qcc-donate-close:hover{background:rgba(15,23,42,0.11);}
            @media (prefers-color-scheme: dark) {
                #quick-custom-clicker{background:rgba(30,30,32,0.85);color:#f5f5f7;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 8px 24px rgba(0,0,0,0.3),0 1px 0 rgba(255,255,255,0.06) inset,0 0 0 0.5px rgba(255,255,255,0.06);}
                #quick-custom-clicker .qcc-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);}
                #quick-custom-clicker .qcc-section-title{color:#8e8e93;}
                #quick-custom-clicker .qcc-field-head label,
                #quick-custom-clicker .qcc-field-row label,
                #quick-custom-clicker .qcc-double-item label{color:#c7c7cc;}
                #quick-custom-clicker .qcc-status{background:rgba(255,255,255,0.06);color:#c7c7cc;}
                #quick-custom-clicker .qcc-list-box,
                #quick-custom-clicker .qcc-log-box{background:rgba(255,255,255,0.05);}
                #quick-custom-clicker .qcc-list-item{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.08);color:#f5f5f7;}
                #quick-custom-clicker .qcc-list-item-text{color:#f5f5f7;}
                #quick-custom-clicker .qcc-list-header{color:#8e8e93;}
                #quick-custom-clicker .qcc-list-count{background:rgba(255,255,255,0.10);color:#c7c7cc;}
                #quick-custom-clicker .qcc-stat-compact{color:#8e8e93;border-bottom-color:rgba(255,255,255,0.10);}
                #quick-custom-clicker .qcc-stat-compact b{color:#f5f5f7;}
                #quick-custom-clicker .qcc-log-text{color:#c7c7cc;}
                #quick-custom-clicker .qcc-log-time{color:#8e8e93;}
                #quick-custom-clicker .qcc-log-item{border-bottom-color:rgba(255,255,255,0.05);}
                #quick-custom-clicker .qcc-btn-ghost{background:rgba(255,255,255,0.08);color:#c7c7cc;}
                #quick-custom-clicker .qcc-btn-ghost:not(:disabled):hover{background:rgba(255,255,255,0.14);}
                #quick-custom-clicker .qcc-inline-btn{background:rgba(255,255,255,0.08);color:#c7c7cc;}
                #quick-custom-clicker .qcc-inline-btn:hover{background:rgba(255,255,255,0.14);}
                #quick-custom-clicker .qcc-speed-btn{background:rgba(255,255,255,0.08);color:#c7c7cc;border-color:rgba(255,255,255,0.12);}
                #quick-custom-clicker .qcc-speed-btn:hover{background:rgba(255,255,255,0.15);}
                #quick-custom-clicker .qcc-log-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.35);border:2px solid transparent;background-clip:content-box;}
                #quick-custom-clicker .qcc-log-list::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.50);border:2px solid transparent;background-clip:content-box;}
                .qcc-trial-label{color:#fbbf24;}
                .qcc-trial-code{background:rgba(255,255,255,0.10);color:#f5f5f7;}
            }`;
        document.head.appendChild(style);
        document.body.appendChild(panel);
        applyAutoScale();

        statusEl = document.getElementById('qcc-status');
        statusTextEl = document.getElementById('qcc-status-text');
        listBox = document.getElementById('qcc-list');
        listCountEl = document.getElementById('qcc-list-count');
        logListEl = document.getElementById('qcc-log-list');
        statRuntimeEl = document.getElementById('qcc-stat-runtime');
        statVideoEl = document.getElementById('qcc-stat-video');
        statVideosEl = document.getElementById('qcc-stat-videos');
        statClicksEl = document.getElementById('qcc-stat-clicks');

        if (logUpdateTimer) clearInterval(logUpdateTimer);
        logUpdateTimer = setInterval(() => {
            updateStatsUI();
            updateAuthTimeUI();
        }, 1000);
        renderLog(); updateStatsUI(); updateAuthTimeUI();

        document.getElementById('qcc-log-reset').addEventListener('click', () => { resetStats(); setStatus('日志与统计已重置', ''); });
        document.getElementById('qcc-log-export').addEventListener('click', exportLogs);

        const autoVideoCheck = document.getElementById('qcc-auto-video');
        const speedBlock = document.getElementById('qcc-speed-block');
        const speedValueEl = document.getElementById('qcc-speed-value');
        const speedBtns = panel.querySelectorAll('.qcc-speed-btn');
        const maxClicksInput = document.getElementById('qcc-max-clicks');
        maxClicksInput.value = String(maxClicks || 0);
        maxClicksInput.addEventListener('input', () => {
            const n = parseInt(maxClicksInput.value, 10);
            maxClicks = (isNaN(n) || n < 0) ? 0 : n;
            saveConfig();
        });
        maxClicksInput.addEventListener('blur', () => {
            maxClicksInput.value = String(maxClicks || 0);
        });

        __syncAuthUI = function () {
            updatePickButton();
            const vl = document.getElementById('qcc-auto-video-label');
            if (vl) vl.textContent = authorized ? '自动播放' : '自动播放 🔒';
            const et = document.getElementById('qcc-expandRight-text');
            if (et) et.textContent = authorized ? '一键展开' : '一键展开 🔒';
            updateAuthTimeUI();
            if (authorized) { if (manualPicking) exitManualPick(); setStatus('✅ 已授权，功能可正常使用', ''); }
        };
        function syncVideoUI() {
            autoVideoCheck.checked = autoPlayVideo;
            speedBlock.classList.toggle('qcc-hidden', !autoPlayVideo);
            speedValueEl.textContent = videoSpeed + 'x';
            speedBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.speed, 10) === videoSpeed));
            updateRunButtons();
        }
        function flashDonateBtn() {
            const btn = document.getElementById('qcc-donate');
            if (!btn) return;
            btn.style.transition = 'all .2s'; btn.style.transform = 'scale(1.08)';
            btn.style.boxShadow = '0 0 0 4px rgba(255,77,125,0.3)';
            setTimeout(() => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = ''; }, 400);
        }
        autoVideoCheck.addEventListener('click', e => {
            if (!authorized) { e.preventDefault(); autoVideoCheck.checked = false; autoPlayVideo = false; syncVideoUI();
                setStatus('🔒 请点击【❤️ 捐赠 / 授权】解锁「自动播放视频」', ''); flashDonateBtn(); return; }
            autoPlayVideo = autoVideoCheck.checked; syncVideoUI(); saveConfig();
            setStatus(`自动播放视频: ${autoPlayVideo ? '开启' : '关闭'}`, '');
            addLog(`⚙️ 自动播放视频 ${autoPlayVideo ? '开启' : '关闭'}`, '');
        });
        speedBtns.forEach(btn => btn.addEventListener('click', () => {
            videoSpeed = parseInt(btn.dataset.speed, 10) || 2; syncVideoUI(); saveConfig();
            setStatus(`视频倍速已设为 ${videoSpeed}x`, '');
            addLog(`⚙️ 视频倍速 ${videoSpeed}x`, '');
        }));
        syncVideoUI();

        document.getElementById('qcc-auto-pick').addEventListener('click', () => {
            if (authorized) { if (manualPicking) exitManualPick(); autoPickLeftNav(); }
            else { if (manualPicking) exitManualPick(); else enterManualPick(); }
        });

        document.getElementById('qcc-expandRight').addEventListener('click', () => {
            if (!authorized) { setStatus('🔒 请点击【❤️ 捐赠 / 授权】解锁「一键展开」', ''); flashDonateBtn(); return; }
            if (expanding) { setStatus('⏳ 正在展开中，请稍候…', 'running'); return; }
            expandAllCollapsed();
        });

        document.getElementById('qcc-clearList').addEventListener('click', () => { clearSelected(); setStatus('元素列表已清空', ''); addLog('🗑️ 已清空选择列表', ''); });
        document.getElementById('qcc-donate').addEventListener('click', openDonateModal);
        document.getElementById('qcc-start').addEventListener('click', startClicking);
        document.getElementById('qcc-stop').addEventListener('click', stopClicking);
        document.getElementById('qcc-pause').addEventListener('click', () => { if (isPaused) resumeClicking(); else pauseClicking(); });
        document.getElementById('qcc-play-current').addEventListener('click', playCurrentPageVideo);

        function toggleCollapse() {
            const b = document.getElementById('qcc-body');
            const c = b.classList.toggle('collapsed');
            panel.classList.toggle('qcc-collapsed', c);
            document.getElementById('qcc-min').textContent = c ? '+' : '−';
        }
        document.getElementById('qcc-min').addEventListener('click', e => { e.stopPropagation(); toggleCollapse(); });
        document.getElementById('qcc-close').addEventListener('click', () => {
            stopHeartbeat(); if (manualPicking) exitManualPick(); stopClicking();
            if (logUpdateTimer) { clearInterval(logUpdateTimer); logUpdateTimer = null; }
            const dm = document.getElementById('qcc-donate-modal'); if (dm) dm.remove();
            panel.remove(); __syncAuthUI = null;
        });

        /* 拖动（修复缩放漂移） */
        (function drag() {
            const ed = document.getElementById('qcc-drag');
            let dr = false, sx = 0, sy = 0, baseLeftCSS = 0, baseTopCSS = 0;
            ed.addEventListener('mousedown', e => {
                if (e.target.closest('.qcc-icon-btn')) return;
                dr = true;
                const z = parseFloat(panel.style.zoom) || 1;
                sx = e.clientX; sy = e.clientY;
                const r = panel.getBoundingClientRect();
                baseLeftCSS = r.left / z;
                baseTopCSS  = r.top  / z;
                panel.style.right = 'auto';
                panel.style.left = baseLeftCSS + 'px';
                panel.style.top  = baseTopCSS  + 'px';
                e.preventDefault();
            });
            document.addEventListener('mousemove', e => {
                if (!dr) return;
                const z = parseFloat(panel.style.zoom) || 1;
                const dx = (e.clientX - sx) / z;
                const dy = (e.clientY - sy) / z;
                let nx = baseLeftCSS + dx;
                let ny = baseTopCSS  + dy;
                const maxX = window.innerWidth  / z - panel.offsetWidth;
                const maxY = window.innerHeight / z - 40;
                nx = Math.max(0, Math.min(maxX, nx));
                ny = Math.max(0, Math.min(maxY, ny));
                panel.style.left = nx + 'px';
                panel.style.top  = ny + 'px';
            });
            document.addEventListener('mouseup', () => { dr = false; });
        })();

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (manualPicking) { exitManualPick(); return; }
                if (isRunning) { stopClicking(); setStatus('ESC 已停止点击', ''); }
            }
        });

        updatePickButton(); renderList(); updateRunButtons();
        if (typeof __syncAuthUI === 'function') { try { __syncAuthUI(); } catch (e) {} }
        (async () => {
            await loadAuthFromStorage();
            updatePickButton();
            if (typeof __syncAuthUI === 'function') { try { __syncAuthUI(); } catch (e) {} }
            setStatus(authorized ? '已授权，可以开始使用' : (authCode ? '⚠️ 上次验证未通过，请重新验证' : '等待操作'), '');
        })();
    }

    function safeBuildPanel() {
        try { if (!document.body) { setTimeout(safeBuildPanel, 50); return; } buildPanel(); }
        catch (e) { reportError('面板构建失败', e, false); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeBuildPanel, { once: true });
    else safeBuildPanel();

    window.addEventListener('resize', () => {
        try { applyAutoScale(); } catch (e) {}
    });
})();
