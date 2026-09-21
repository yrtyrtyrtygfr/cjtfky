// ==UserScript==
// @name         国开刷点击次数和时长
// @namespace    https://scriptcat.org/
// @version      2.9.0
// @description 目录展开与选择一栏｜轮流循环点击｜视频开关｜2/4/6/8/10倍速｜自动静音播放完再继续｜苹果风格UI｜ESC停止｜后台也继续运行
// @author       You
// @match        *://lms.ouchn.cn/*
// @icon         https://cdn.jsdelivr.net/gh/yrtyrtyrtygfr/cjtfky@2caf2337025d9bc8779c692acf1d6469fe372637/gd.png
// @grant        none
// @run-at       document-start
// @license 二开请联系作者
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

    /* ============================================================
     * ★ 修复 #7：getAllRoots 缓存（MutationObserver 失效）
     * ============================================================ */
    let __rootsCache = null;
    let __rootsObserver = null;
    let __rootsDirty = true;

    function invalidateRootsCache() {
        __rootsDirty = true;
    }

    function ensureRootsObserver() {
        if (__rootsObserver || !document.documentElement) return;
        try {
            __rootsObserver = new MutationObserver(() => {
                __rootsDirty = true;
            });
            __rootsObserver.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        } catch (e) {
            __rootsObserver = null;
        }
    }

    function getAllRoots() {
        if (!__rootsDirty && __rootsCache) return __rootsCache;

        ensureRootsObserver();

        const roots = [document];
        for (let i = 0; i < roots.length; i++) {
            let all;
            try { all = roots[i].querySelectorAll('*'); } catch (e) { continue; }
            for (const el of all) {
                const sr = getShadowRoot(el);
                if (sr && !roots.includes(sr)) roots.push(sr);
            }
        }

        __rootsCache = roots;
        __rootsDirty = false;
        return roots;
    }

    /* ============================================================
     * ★ 修复 #5：realClick 先 scrollIntoView
     * ============================================================ */
    function realClick(el) {
        if (!el) return false;

        // 元素不在视口内时，先滚到视口中央，避免 clientX/Y 为负数或超屏
        try {
            const r0 = el.getBoundingClientRect();
            if (r0.top < 0 || r0.bottom > window.innerHeight ||
                r0.left < 0 || r0.right > window.innerWidth) {
                try {
                    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
                } catch (e) {
                    el.scrollIntoView();
                }
            }
        } catch (e) {}

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
     * 加粗判断
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
     * 随机间隔：3 ~ 18 秒
     * ============================================================ */
    const RANDOM_MIN_SEC = 3;
    const RANDOM_MAX_SEC = 18;
    function getRandomDelayMs() {
        const sec = Math.random() * (RANDOM_MAX_SEC - RANDOM_MIN_SEC) + RANDOM_MIN_SEC;
        return Math.round(sec * 1000);
    }

    /* ============================================================
     * 后台计时器（Web Worker）+ 静音保活音频
     * ============================================================ */
    const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
            if (e.data && e.data.cmd === 'start') {
                const ms = e.data.ms || 1000;
                if (timer) clearInterval(timer);
                timer = setInterval(function() {
                    self.postMessage({ tick: Date.now() });
                }, ms);
            } else if (e.data && e.data.cmd === 'stop') {
                if (timer) { clearInterval(timer); timer = null; }
            }
        };
    `;
    let bgWorker = null;
    function ensureWorker() {
        if (bgWorker) return bgWorker;
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            bgWorker = new Worker(URL.createObjectURL(blob));
        } catch (e) {
            console.warn('[QCC] Worker 创建失败，退回主线程定时器', e);
            bgWorker = null;
        }
        return bgWorker;
    }

    let keepAliveAudio = null;
    function startKeepAlive() {
        if (keepAliveAudio) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.0001;
            osc.frequency.value = 20;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            keepAliveAudio = { ctx, osc };
        } catch (e) {}
    }
    function stopKeepAlive() {
        try {
            if (keepAliveAudio) {
                keepAliveAudio.osc.stop();
                keepAliveAudio.ctx.close();
            }
        } catch (e) {}
        keepAliveAudio = null;
    }

    /* ============================================================
     * 状态
     * ============================================================ */
    let panel, statusEl, statusTextEl, listBox, listCountEl;

    let selectedEls = [];
    let isRunning   = false;
    let clickTimer  = null;
    let clickIndex  = 0;
    let clickedTotal = 0;
    let expanding   = false;
    let picking     = false;
    let processingVideo = false;
    let workerTickHandler = null;

    function setStatus(text, cls) {
        if (!statusTextEl) return;
        statusTextEl.textContent = text;
        statusEl.className = 'qcc-status' + (cls ? ' ' + cls : '');
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
     * 自动拾取左侧目录
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

        for (const root of roots) {
            let list;
            try { list = root.querySelectorAll('.text-too-long'); }
            catch (e) { list = []; }

            for (const el of list) {
                if (panel && panel.contains(el)) continue;
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
     * 视频处理
     * ============================================================ */
    const VIDEO_WAIT_MS = 15000;
    const VIDEO_POLL_MS = 300;

    let autoPlayVideo = false;
    let videoSpeed    = 2;
    const VIDEO_SPEED_STEPS = [2, 4, 6, 8, 10];

    function getAllDocuments() {
        const docs = [document];
        for (let i = 0; i < docs.length; i++) {
            let iframes;
            try { iframes = docs[i].querySelectorAll('iframe'); } catch (e) { continue; }
            for (const f of iframes) {
                try {
                    const d = f.contentDocument;
                    if (d && !docs.includes(d)) docs.push(d);
                } catch (e) {}
            }
        }
        return docs;
    }

    function findPlayableVideoInDoc(doc) {
        let videos;
        try { videos = doc.querySelectorAll('video'); } catch (e) { return null; }
        let best = null, bestArea = 0;
        for (const v of videos) {
            if (!v.isConnected) continue;
            let r;
            try { r = v.getBoundingClientRect(); } catch (e) { continue; }
            if (r.width < 100 || r.height < 60) continue;
            if (r.bottom < 0 || r.top > window.innerHeight) continue;
            const area = r.width * r.height;
            if (area > bestArea) { bestArea = area; best = v; }
        }
        return best;
    }

    function findPlayableVideo() {
        for (const doc of getAllDocuments()) {
            const v = findPlayableVideoInDoc(doc);
            if (v) return v;
        }
        return null;
    }

    function videoKey(v) {
        return (v.currentSrc || v.src || '') + '::' + (v.getAttribute('data-src') || '');
    }

    function snapshotVideoKeys() {
        const set = new Set();
        for (const doc of getAllDocuments()) {
            let videos;
            try { videos = doc.querySelectorAll('video'); } catch (e) { continue; }
            for (const v of videos) set.add(videoKey(v));
        }
        return set;
    }

    async function waitForNewVideo(oldKeys, maxWaitMs) {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            for (const doc of getAllDocuments()) {
                let videos;
                try { videos = doc.querySelectorAll('video'); } catch (e) { continue; }
                for (const v of videos) {
                    if (!v.isConnected) continue;
                    const k = videoKey(v);
                    if (k && !oldKeys.has(k)) return v;
                }
            }
            await sleep(VIDEO_POLL_MS);
        }
        return null;
    }

    async function waitMetadata(v, maxWaitMs = 8000) {
        if (v.readyState >= 1) return true;
        return await new Promise(resolve => {
            const timer = setTimeout(() => {
                v.removeEventListener('loadedmetadata', onLoaded);
                resolve(false);
            }, maxWaitMs);
            const onLoaded = () => {
                clearTimeout(timer);
                resolve(true);
            };
            v.addEventListener('loadedmetadata', onLoaded, { once: true });
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
        const onRateChange = () => { if (video.playbackRate !== videoSpeed) forceRate(); };
        video.addEventListener('ratechange', onRateChange);
        const rateTimer = setInterval(forceRate, 500);

        try {
            video.muted = true;
            forceRate();
            try { video.currentTime = 0; } catch (e) {}
            await video.play();
            forceRate();
            try { video.currentTime = 0; } catch (e) {}
        } catch (e) {
            console.warn('[QCC] 视频播放失败:', e);
            video.removeEventListener('ratechange', onRateChange);
            clearInterval(rateTimer);
            return false;
        }

        await new Promise((resolve) => {
            let lastTime = -1;
            let stuckCount = 0;
            const startTime = Date.now();
            const GRACE_MS = 15000;
            const check = () => {
                if (!video.isConnected) { resolve(); return; }
                if (video.ended) { resolve(); return; }
                const ct = video.currentTime || 0;
                const dur = video.duration || 0;
                if (dur > 0 && isFinite(dur) && ct >= dur - 0.3) { resolve(); return; }
                if (Date.now() - startTime > GRACE_MS) {
                    if (ct > 0 && Math.abs(ct - lastTime) < 0.05) {
                        stuckCount++;
                        if (stuckCount > 30) { resolve(); return; }
                    } else {
                        stuckCount = 0;
                    }
                }
                lastTime = ct;
                forceRate();
                setTimeout(check, 500);
            };
            check();
        });

        video.removeEventListener('ratechange', onRateChange);
        clearInterval(rateTimer);
        return true;
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

    async function doClick() {
        if (!isRunning) return;
        if (processingVideo) return;

        if (selectedEls.length === 0) { stopClicking(); setStatus('没有可点击的元素', ''); return; }

        selectedEls = selectedEls.filter(el => el.isConnected);
        if (selectedEls.length === 0) {
            stopClicking();
            setStatus('所有元素已从页面移除', '');
            renderList();
            return;
        }

        const el = selectedEls[clickIndex % selectedEls.length];
        const oldKeys = snapshotVideoKeys();

        try {
            realClick(pickClickTarget(el) || el);
            highlightClick(el);
        } catch (err) {
            console.warn('[轮流点击器] 点击失败:', err);
        }
        clickedTotal++;
        clickIndex++;
        setStatus(`执行中… 已点击 ${clickedTotal} 次 / 共 ${selectedEls.length} 个元素`, 'running');

        if (!autoPlayVideo) return;

        const video = await waitForNewVideo(oldKeys, VIDEO_WAIT_MS);
        if (!video) return;

        processingVideo = true;
        setStatus(`🎬 检测到新视频，正在 ${videoSpeed} 倍速静音播放…`, 'running');

        try {
            await playVideoToEnd(video);
            if (isRunning) setStatus('✅ 视频播放完成，准备下一个', '');
        } catch (e) {
            console.warn('[QCC] 视频处理异常:', e);
        } finally {
            processingVideo = false;
        }
    }

    /* ============================================================
     * ★ 修复 #2：clickLoop 用 { once: true }，避免监听器泄漏
     * ============================================================ */
    async function clickLoop() {
        if (!isRunning) return;
        await doClick();
        if (!isRunning) return;

        const delay = getRandomDelayMs();

        const w = ensureWorker();
        if (w) {
            if (workerTickHandler) {
                try { w.removeEventListener('message', workerTickHandler); } catch (e) {}
                workerTickHandler = null;
            }

            workerTickHandler = function (e) {
                if (!e.data || !e.data.tick) return;
                workerTickHandler = null;
                try { w.postMessage({ cmd: 'stop' }); } catch (err) {}
                if (isRunning) clickLoop();
            };

            w.addEventListener('message', workerTickHandler, { once: true });

            try {
                w.postMessage({ cmd: 'start', ms: delay });
            } catch (err) {
                if (workerTickHandler) {
                    try { w.removeEventListener('message', workerTickHandler); } catch (e2) {}
                    workerTickHandler = null;
                }
                clickTimer = setTimeout(clickLoop, delay);
            }
        } else {
            clickTimer = setTimeout(clickLoop, delay);
        }
    }

    /* ============================================================
     * ★ 修复 #4：startClicking 开头彻底清理
     * ============================================================ */
    function startClicking() {
        if (isRunning) return;
        if (selectedEls.length === 0) { setStatus('请先自动拾取左侧目录', ''); return; }

        try { if (bgWorker) bgWorker.postMessage({ cmd: 'stop' }); } catch (e) {}
        if (bgWorker && workerTickHandler) {
            try { bgWorker.removeEventListener('message', workerTickHandler); } catch (e) {}
            workerTickHandler = null;
        }
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }

        isRunning = true;
        processingVideo = false;
        clickIndex = 0;
        clickedTotal = 0;

        const b1 = document.getElementById('qcc-start');
        const b2 = document.getElementById('qcc-stop');
        if (b1) b1.disabled = true;
        if (b2) b2.disabled = false;

        setStatus('开始执行…（无限循环，随机间隔 3~18 秒）', 'running');

        startKeepAlive();
        clickLoop();
    }

    /* ============================================================
     * ★ 修复 #3：stopClicking 清理 Worker 监听器
     * ============================================================ */
    function stopClicking() {
        if (!isRunning) return;
        isRunning = false;
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        stopKeepAlive();
        try { if (bgWorker) bgWorker.postMessage({ cmd: 'stop' }); } catch (e) {}

        if (bgWorker && workerTickHandler) {
            try { bgWorker.removeEventListener('message', workerTickHandler); } catch (e) {}
            workerTickHandler = null;
        }

        const b1 = document.getElementById('qcc-start');
        const b2 = document.getElementById('qcc-stop');
        if (b1) b1.disabled = false;
        if (b2) b2.disabled = true;
        if (statusEl && statusEl.classList.contains('running')) {
            setStatus(`已停止，共点击 ${clickedTotal} 次`, '');
        }
    }

    /* ============================================================
     * 一键展开
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
                    <span class="qcc-title-text qcc-title-full">国开刷点击次数和时长</span>
                    <span class="qcc-title-text qcc-title-short">国开学习</span>
                    <span class="qcc-badge">v2.9.0</span>
                </div>
                <div class="qcc-header-right">
                    <button class="qcc-icon-btn" id="qcc-min" title="最小化">−</button>
                    <button class="qcc-icon-btn" id="qcc-close" title="关闭">×</button>
                </div>
            </div>

            <div class="qcc-body" id="qcc-body">
                <div class="qcc-section">
                    <div class="qcc-section-title">⚙️ 参数设置</div>
                    <div class="qcc-field qcc-field-block">
                        <div class="qcc-field-head">
                            <label>点击间隔</label>
                            <span class="qcc-interval-value">3~18s 随机</span>
                        </div>
                    </div>
                    <div class="qcc-field qcc-field-row">
                        <label>自动播放视频</label>
                        <label class="qcc-switch">
                            <input type="checkbox" id="qcc-auto-video">
                            <span class="qcc-switch-slider"></span>
                        </label>
                    </div>
                    <div class="qcc-field qcc-field-block" id="qcc-speed-block">
                        <div class="qcc-field-head">
                            <label>视频倍速</label>
                            <span class="qcc-speed-value" id="qcc-speed-value">2x</span>
                        </div>
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
                    <div class="qcc-section-title">📂 目录准备 · 展开与选择</div>
                    <div class="qcc-btn-group">
                        <button id="qcc-expandRight" class="qcc-btn qcc-btn-primary">
                            <span class="qcc-btn-icon">📂</span> 一键展开
                        </button>
                        <button id="qcc-auto-pick" class="qcc-btn qcc-btn-primary">
                            <span class="qcc-btn-icon">🔍</span> 自动选择
                        </button>
                    </div>
                    <button id="qcc-clearList" class="qcc-btn qcc-btn-ghost qcc-btn-sm">
                        <span class="qcc-btn-icon">🗑️</span> 清空选择列表
                    </button>
                </div>

                <div class="qcc-section">
                    <div class="qcc-section-title">▶️ 执行 · 开始与停止</div>
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
                    💡 <b>使用</b>：先「一键展开」→ 再「自动选择」→ 最后「开始」<br>
                    💡 <b>间隔</b>：每次点击后随机等待 3~18 秒<br>
                    💡 <b>后台</b>：切标签 / 最小化也会继续点击<br>
                    💡 <b>停止</b>：ESC 或【停止】按钮<br>
                    📮 <b>联系QQ</b>：3365137745
                </div>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            #quick-custom-clicker{
                position:fixed; top:100px; right:20px; width:272px;
                background:rgba(255,255,255,0.72);
                backdrop-filter:saturate(180%) blur(24px);
                -webkit-backdrop-filter:saturate(180%) blur(24px);
                border-radius:18px;
                box-shadow:
                    0 20px 60px rgba(15, 23, 42, 0.18),
                    0 8px 24px rgba(15, 23, 42, 0.10),
                    0 1px 0 rgba(255,255,255,0.6) inset,
                    0 0 0 0.5px rgba(15, 23, 42, 0.08);
                z-index:2147483647;
                font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
                color:#1d1d1f; box-sizing:border-box; overflow:hidden;
                font-size:12px;
                transition:width .28s cubic-bezier(.4,0,.2,1);
                -webkit-font-smoothing:antialiased;
                letter-spacing:-0.01em;
            }
            #quick-custom-clicker *{box-sizing:border-box;}

            .qcc-header{
                display:flex;justify-content:space-between;align-items:center;
                padding:10px 12px;
                background:#6EBBCE;
                color:#ffffff;
                cursor:move;user-select:none;
                border-bottom:0.5px solid rgba(15,23,42,0.08);
            }
            .qcc-header-left{display:flex;align-items:center;gap:6px;}
            .qcc-logo{
                font-size:14px;
                filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.20));
            }
            .qcc-title-text{
                font-size:13px;
                font-weight:600;
                letter-spacing:-0.01em;
                color:#ffffff;
            }
            .qcc-badge{
                font-size:9px;
                background:rgba(255,255,255,0.22);
                color:#ffffff;
                padding:2px 6px;border-radius:6px;font-weight:600;
                letter-spacing:0;
            }
            .qcc-header-right{display:flex;gap:6px;}
            .qcc-icon-btn{
                width:22px;height:22px;
                border:0;
                background:rgba(255,255,255,0.22);
                color:#ffffff;
                border-radius:50%;
                cursor:pointer;
                font-size:14px;
                line-height:1;
                font-weight:400;
                display:inline-flex;
                align-items:center;
                justify-content:center;
                transition:all .18s ease;
                padding:0;
                margin:0;
                box-sizing:border-box;
                font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
                transform:translateY(-0.5px);
            }
            .qcc-icon-btn:hover{background:rgba(255,255,255,0.38);color:#ffffff;}
            .qcc-icon-btn#qcc-close:hover{background:rgba(255,59,48,0.75);color:#ffffff;}

            .qcc-body{
                padding:12px 12px 14px;
                max-height:680px;overflow-y:auto;
                transition:max-height .28s ease,padding .28s ease,opacity .2s ease;
            }
            .qcc-body.collapsed{max-height:0;padding-top:0;padding-bottom:0;opacity:0;overflow:hidden;}
            .qcc-body::-webkit-scrollbar{width:6px;}
            .qcc-body::-webkit-scrollbar-thumb{background:rgba(15,23,42,0.12);border-radius:3px;}
            .qcc-body::-webkit-scrollbar-thumb:hover{background:rgba(15,23,42,0.2);}

            .qcc-section{margin-bottom:14px;}
            .qcc-section:last-of-type{margin-bottom:10px;}
            .qcc-section-title{
                font-size:10px;font-weight:600;
                color:#8e8e93;
                letter-spacing:.04em;text-transform:uppercase;
                margin-bottom:8px;padding-left:2px;
            }

            .qcc-field-block{margin-bottom:8px;}
            .qcc-field-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
            .qcc-field-head label{font-size:11px;color:#3a3a3c;font-weight:500;}
            .qcc-interval-value{
                font-size:10px;font-weight:600;
                color:#4f6ef7;background:rgba(79,110,247,0.10);
                padding:3px 8px;border-radius:6px;min-width:42px;text-align:center;
            }

            .qcc-btn{
                width:100%;border:0;border-radius:10px;
                padding:9px 12px;cursor:pointer;
                font-size:11.5px;font-weight:500;
                display:flex;align-items:center;justify-content:center;
                gap:6px;transition:all .18s cubic-bezier(.4,0,.2,1);
                font-family:inherit;line-height:1.2;
                letter-spacing:-0.005em;
            }
            .qcc-btn-icon{font-size:12px;line-height:1;}
            .qcc-btn:disabled{opacity:.4;cursor:not-allowed;}
            .qcc-btn:not(:disabled):active{transform:scale(.97);}

            .qcc-btn-primary{
                background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);
                color:#fff;
                box-shadow:
                    0 4px 14px rgba(79,110,247,0.30),
                    0 1px 0 rgba(255,255,255,0.2) inset;
            }
            .qcc-btn-primary:not(:disabled):hover{
                background:linear-gradient(180deg,#6b85ff 0%,#5b78ff 100%);
                box-shadow:0 6px 20px rgba(79,110,247,0.42);
                transform:translateY(-1px);
            }

            .qcc-btn-blue{
                background:rgba(79,110,247,0.08);
                color:#4f6ef7;
            }
            .qcc-btn-blue:not(:disabled):hover{background:rgba(79,110,247,0.14);}

            .qcc-btn-success{
                background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);
                color:#fff;
                box-shadow:
                    0 4px 14px rgba(18,183,106,0.30),
                    0 1px 0 rgba(255,255,255,0.2) inset;
            }
            .qcc-btn-success:not(:disabled):hover{
                background:linear-gradient(180deg,#43dc8a 0%,#22c876 100%);
                box-shadow:0 6px 20px rgba(18,183,106,0.42);
                transform:translateY(-1px);
            }

            .qcc-btn-danger{
                background:rgba(255,59,48,0.08);
                color:#ff3b30;
            }
            .qcc-btn-danger:not(:disabled):hover{background:rgba(255,59,48,0.15);}

            .qcc-btn-ghost{
                background:rgba(15,23,42,0.05);
                color:#3a3a3c;
            }
            .qcc-btn-ghost:not(:disabled):hover{background:rgba(15,23,42,0.09);}

            .qcc-btn-sm{padding:7px 10px;font-size:10.5px;margin-top:6px;}
            .qcc-btn-group{display:flex;gap:8px;}

            .qcc-status{
                display:flex;align-items:center;gap:8px;
                padding:9px 12px;
                background:rgba(15,23,42,0.04);
                border-radius:10px;
                font-size:10.5px;color:#3a3a3c;
                margin-bottom:12px;
                line-height:1.35;
                letter-spacing:-0.005em;
            }
            .qcc-status-dot{
                width:7px;height:7px;border-radius:50%;
                background:#8e8e93;flex-shrink:0;
                transition:background .2s;
            }
            .qcc-status.running .qcc-status-dot{
                background:#12b76a;
                box-shadow:0 0 0 3px rgba(18,183,106,0.18);
                animation:qcc-pulse 1.4s cubic-bezier(.4,0,.6,1) infinite;
            }
            @keyframes qcc-pulse{
                0%,100%{opacity:1;transform:scale(1);}
                50%{opacity:.55;transform:scale(1.15);}
            }

            .qcc-list-box{
                background:rgba(15,23,42,0.04);
                border-radius:10px;
                padding:8px 10px;
                margin-bottom:12px;
            }
            .qcc-list-header{
                display:flex;justify-content:space-between;align-items:center;
                font-size:10px;color:#8e8e93;font-weight:600;
                margin-bottom:6px;letter-spacing:.02em;
            }
            .qcc-list-count{
                background:rgba(15,23,42,0.08);
                color:#3a3a3c;
                padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:600;
            }
            .qcc-list{max-height:90px;min-height:32px;overflow-y:auto;font-size:10.5px;color:#3a3a3c;}
            .qcc-list::-webkit-scrollbar{width:4px;}
            .qcc-list::-webkit-scrollbar-thumb{background:rgba(15,23,42,0.12);border-radius:2px;}
            .qcc-list-item{
                display:flex;justify-content:space-between;align-items:center;gap:6px;
                padding:6px 8px;
                background:rgba(255,255,255,0.7);
                border-radius:8px;
                margin-bottom:4px;
                border:0.5px solid rgba(15,23,42,0.06);
                transition:all .15s ease;
            }
            .qcc-list-item:hover{background:rgba(255,255,255,0.95);border-color:rgba(79,110,247,0.2);}
            .qcc-list-item-text{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .qcc-list-item-del{
                border:0;background:transparent;color:#c7c7cc;
                cursor:pointer;font-size:12px;line-height:1;padding:0 2px;flex-shrink:0;
                transition:color .15s;
            }
            .qcc-list-item-del:hover{color:#ff3b30;}

            .qcc-tip{
                font-size:10px;color:#8e8e93;line-height:1.65;
                padding:9px 11px;
                background:rgba(15,23,42,0.035);
                border-radius:9px;
                letter-spacing:-0.005em;
            }
            .qcc-tip b{color:#3a3a3c;font-weight:600;}

            .qcc-pick-selected{
                outline:2px solid #12b76a !important;
                outline-offset:1px !important;
                background:rgba(18,183,106,0.10) !important;
                border-radius:4px;
            }
            .qcc-clicking{
                outline:3px solid #f79009 !important;
                outline-offset:1px !important;
                transition:outline .1s;
            }

            .qcc-field-row{
                display:flex;justify-content:space-between;align-items:center;
                padding:7px 0;
                border-bottom:0.5px solid rgba(15,23,42,0.06);
            }
            .qcc-field-row label{font-size:11px;color:#3a3a3c;font-weight:500;}
            .qcc-switch{position:relative;width:36px;height:20px;flex-shrink:0;display:inline-block;}
            .qcc-switch input{opacity:0;width:0;height:0;}
            .qcc-switch-slider{
                position:absolute;cursor:pointer;inset:0;
                background:rgba(15,23,42,0.12);
                border-radius:10px;transition:.28s cubic-bezier(.4,0,.2,1);
            }
            .qcc-switch-slider:before{
                position:absolute;content:'';height:16px;width:16px;
                left:2px;bottom:2px;background:#fff;border-radius:50%;
                transition:.28s cubic-bezier(.4,0,.2,1);
                box-shadow:0 1px 3px rgba(0,0,0,.18),0 0 0 0.5px rgba(0,0,0,.04);
            }
            .qcc-switch input:checked + .qcc-switch-slider{
                background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);
                box-shadow:0 1px 6px rgba(18,183,106,0.35);
            }
            .qcc-switch input:checked + .qcc-switch-slider:before{transform:translateX(16px);}

            .qcc-speed-btns{display:flex;gap:4px;margin-top:5px;}
            .qcc-speed-btn{
                flex:1;height:24px;border-radius:7px;
                border:0.5px solid rgba(15,23,42,0.10);
                background:rgba(255,255,255,0.6);
                color:#6b7280;font-size:10px;font-weight:600;
                cursor:pointer;
                transition:all .18s cubic-bezier(.4,0,.2,1);
                padding:0;font-family:inherit;
                letter-spacing:-0.01em;
            }
            .qcc-speed-btn:hover{
                background:rgba(255,255,255,0.95);
                border-color:rgba(79,110,247,0.3);
                color:#4f6ef7;
            }
            .qcc-speed-btn.active{
                background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);
                border-color:transparent;color:#fff;
                box-shadow:0 2px 8px rgba(79,110,247,0.35);
            }
            .qcc-speed-value{
                font-size:10px;font-weight:600;
                color:#4f6ef7;background:rgba(79,110,247,0.10);
                padding:3px 8px;border-radius:6px;min-width:36px;text-align:center;
            }
            #qcc-speed-block.qcc-hidden{display:none;}

            .qcc-title-short{display:none;}
            #quick-custom-clicker.qcc-collapsed{width:105px;}
            #quick-custom-clicker.qcc-collapsed .qcc-header{padding:9px 9px 9px 12px;border-bottom:0;}
            #quick-custom-clicker.qcc-collapsed .qcc-logo,
            #quick-custom-clicker.qcc-collapsed .qcc-badge,
            #quick-custom-clicker.qcc-collapsed .qcc-title-full{display:none;}
            #quick-custom-clicker.qcc-collapsed .qcc-title-short{
                display:inline;
                font-size:13px;
                font-weight:600;
                letter-spacing:-0.01em;
                line-height:1;
                color:#ffffff;
            }
            #quick-custom-clicker.qcc-collapsed .qcc-header-left{gap:0;flex:1;justify-content:flex-start;}
            #quick-custom-clicker.qcc-collapsed .qcc-header-right{flex-shrink:0;}
            #quick-custom-clicker.qcc-collapsed .qcc-icon-btn{
                width:26px;height:26px;
                font-size:18px;
                font-weight:400;
                line-height:1;
                display:inline-flex;
                align-items:center;
                justify-content:center;
                background:rgba(255,255,255,0.30);
                transform:translateY(-1px);
            }
            #quick-custom-clicker.qcc-collapsed .qcc-icon-btn:hover{
                background:rgba(255,255,255,0.50);
            }
            #quick-custom-clicker.qcc-collapsed #qcc-close{display:none;}
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);

        statusEl        = document.getElementById('qcc-status');
        statusTextEl    = document.getElementById('qcc-status-text');
        listBox         = document.getElementById('qcc-list');
        listCountEl     = document.getElementById('qcc-list-count');

        const autoVideoCheck = document.getElementById('qcc-auto-video');
        const speedBlock = document.getElementById('qcc-speed-block');
        const speedValueEl = document.getElementById('qcc-speed-value');
        const speedBtns = panel.querySelectorAll('.qcc-speed-btn');

        function syncVideoUI() {
            autoVideoCheck.checked = autoPlayVideo;
            speedBlock.classList.toggle('qcc-hidden', !autoPlayVideo);
            speedValueEl.textContent = videoSpeed + 'x';
            speedBtns.forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.speed, 10) === videoSpeed);
            });
        }

        autoVideoCheck.addEventListener('change', () => {
            autoPlayVideo = autoVideoCheck.checked;
            syncVideoUI();
            setStatus(`自动播放视频: ${autoPlayVideo ? '开启' : '关闭'}`, '');
        });

        speedBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                videoSpeed = parseInt(btn.dataset.speed, 10) || 2;
                syncVideoUI();
                setStatus(`视频倍速已设为 ${videoSpeed}x`, '');
            });
        });

        syncVideoUI();

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

        function toggleCollapse() {
            const body = document.getElementById('qcc-body');
            const collapsed = body.classList.toggle('collapsed');
            panel.classList.toggle('qcc-collapsed', collapsed);
            document.getElementById('qcc-min').textContent = collapsed ? '+' : '−';
        }

        document.getElementById('qcc-min').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCollapse();
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

        /* ============================================================
         * ★ 修复 #1：切回前台时先清 Worker 再补一次点击
         * ============================================================ */
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && isRunning) {
                try { if (bgWorker) bgWorker.postMessage({ cmd: 'stop' }); } catch (e) {}
                if (bgWorker && workerTickHandler) {
                    try { bgWorker.removeEventListener('message', workerTickHandler); } catch (e) {}
                    workerTickHandler = null;
                }
                if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
                setStatus('已回到前台，继续执行…', 'running');
                clickLoop();
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