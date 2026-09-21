// ==UserScript==
// @name         国开无敌自动刷课+次数和时长
// @namespace    https://scriptcat.org/
// @version      3.5.0
// @description 目录展开与选择一栏｜轮流循环点击｜视频开关｜2/4/6/8/10倍速｜自动静音播放完再继续｜苹果风格UI｜ESC停止｜后台也继续运行｜卡密通授权
// @author       You
// @match        *://lms.ouchn.cn/*
// @icon         https://raw.githubusercontent.com/yrtyrtyrtygfr/cjtfky/main/gd1.png
// @grant        GM_xmlhttpRequest
// @connect      keyt.cn
// @connect      www.keyt.cn
// @run-at       document-start
// @license      MPL-2.0
// ==/UserScript==
(function () {
    'use strict';
    if (window.__QCC_INSTALLED__) return;
    window.__QCC_INSTALLED__ = true;

    /* ============================================================
     * ★ 卡密通授权系统
     * ============================================================ */
    const AUTH_STORAGE_KEY = 'qcc_auth_code_v2';
    const AUTH_EXPIRE_KEY  = 'qcc_auth_expire_v2';

    const KEYT_USERNAME = 'cjtfky123';
    const KEYT_APP_NAME = 'b';
    const KEYT_SIGN_KEY = '1cc35a6aa4b3b60f82100301574ca9a9';
    const KEYT_BASE_URL = `https://www.keyt.cn/kami/${KEYT_USERNAME}/check.php`;

    const TS_MAX_DIFF          = 120;
    const HEARTBEAT_MS         = 50000;
    const HEARTBEAT_FAIL_LIMIT = 5;

    let authCode   = '';
    let authorized = false;

    /* ========== MD5（标准版，全部 var 声明） ========== */
    function md5(str) {
        function RotateLeft(lValue, iShiftBits) {
            return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
        }
        function AddUnsigned(lX, lY) {
            var lX4, lY4, lX8, lY8, lResult;
            lX8 = (lX & 0x80000000);
            lY8 = (lY & 0x80000000);
            lX4 = (lX & 0x40000000);
            lY4 = (lY & 0x40000000);
            lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
            if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
            if (lX4 | lY4) {
                if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ lX8 ^ lY8);
            }
        }
        function F(x, y, z) { return (x & y) | ((~x) & z); }
        function G(x, y, z) { return (x & z) | (y & (~z)); }
        function H(x, y, z) { return (x ^ y ^ z); }
        function I(x, y, z) { return (y ^ (x | (~z))); }
        function FF(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function GG(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function HH(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function II(a, b, c, d, x, s, ac) {
            a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
            return AddUnsigned(RotateLeft(a, s), b);
        }
        function ConvertToWordArray(str) {
            var lWordCount;
            var lMessageLength = str.length;
            var lNumberOfWords_temp1 = lMessageLength + 8;
            var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
            var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
            var lWordArray = Array(lNumberOfWords - 1);
            var lBytePosition = 0;
            var lByteCount = 0;
            while (lByteCount < lMessageLength) {
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
                lByteCount++;
            }
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
            lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
            lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
            return lWordArray;
        }
        function WordToHex(lValue) {
            var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
            for (lCount = 0; lCount <= 3; lCount++) {
                lByte = (lValue >>> (lCount * 8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
            }
            return WordToHexValue;
        }
        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            var utftext = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        }
        var x = Array();
        var k, AA, BB, CC, DD, a, b, c, d;
        var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
        var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
        var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
        var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
        str = Utf8Encode(str);
        x = ConvertToWordArray(str);
        a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
        for (k = 0; k < x.length; k += 16) {
            AA = a; BB = b; CC = c; DD = d;
            a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
            d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
            c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
            b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
            a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
            d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
            c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
            b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
            a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
            d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
            c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
            b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
            a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
            d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
            c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
            b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
            a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
            d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
            c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
            b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
            a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
            d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
            c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
            b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
            a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
            d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
            c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
            b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
            a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
            d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
            c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
            b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
            a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
            d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
            c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
            b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
            a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
            d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
            c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
            b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
            a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
            d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
            c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
            b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
            a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
            d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
            c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
            b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
            a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
            d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
            c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
            b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
            a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
            d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
            c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
            b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
            a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
            d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
            c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
            b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
            a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
            d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
            c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
            b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
            a = AddUnsigned(a, AA);
            b = AddUnsigned(b, BB);
            c = AddUnsigned(c, CC);
            d = AddUnsigned(d, DD);
        }
        var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
        return temp.toLowerCase();
    }

    /* ========== 设备号：随机 12 位十六进制 + MAC，永久固定 ========== */
    const KEYT_DEVICE_ID = (() => {
        try {
            let id = localStorage.getItem('qcc_device_id');
            if (id) return id;
            let hex = '';
            for (let i = 0; i < 12; i++) {
                hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
            }
            id = hex + 'MAC';
            localStorage.setItem('qcc_device_id', id);
            return id;
        } catch (e) {
            console.error('[QCC] 设备号生成失败:', e);
            return 'FALLBACK' + Date.now().toString(16).slice(-6).toUpperCase() + 'MAC';
        }
    })();

    let __syncAuthUI = null;
    let heartbeatTimer = null;
    let heartbeatFailCount = 0;

    /* ========== 卡密通 GET 请求 ========== */
    function keytGet(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                timeout: 10000,
                onload: r => resolve(r.responseText || ''),
                onerror: e => reject(e),
                ontimeout: () => reject(new Error('timeout'))
            });
        });
    }

    /* ========== 响应验签（带日志） ========== */
    function verifyResponse(raw) {
        if (!raw) {
            console.warn('[QCC] 响应为空');
            return null;
        }

        const signIndex = raw.indexOf('|sign=');
        if (signIndex === -1) {
            console.warn('[QCC] 响应中未找到 |sign= 标记，原始内容:', raw);
            return null;
        }

        const body = raw.substring(0, signIndex);
        const sign = raw.substring(signIndex + 6).trim();

        const localSign = md5(body + KEYT_SIGN_KEY);
        console.log('[QCC] 验签 body:', body);
        console.log('[QCC] 本地计算 sign:', localSign);
        console.log('[QCC] 服务器返回 sign:', sign);

        if (localSign !== sign) {
            console.warn('[QCC] ❌ 签名不匹配！');
            return null;
        }

        const lastPipe = body.lastIndexOf('|');
        if (lastPipe === -1) {
            console.warn('[QCC] body 中未找到 | 分隔符');
            return null;
        }

        const ts = parseInt(body.substring(lastPipe + 1), 10);
        if (isNaN(ts)) {
            console.warn('[QCC] 时间戳无效:', body.substring(lastPipe + 1));
            return null;
        }

        const nowTs = Math.floor(Date.now() / 1000);
        if (Math.abs(nowTs - ts) > TS_MAX_DIFF) {
            console.warn('[QCC] ❌ 时间戳过期', { 服务器: ts, 本地: nowTs, 差值: Math.abs(nowTs - ts) });
            return null;
        }
        console.log('[QCC] ✅ 签名 + 时间戳校验通过');

        return body.substring(0, lastPipe);
    }

    /* ========== 获取验证开关（仅日志，不做自动放行） ========== */
    async function getCardSwitch() {
        const ts = Math.floor(Date.now() / 1000);
        const url = `${KEYT_BASE_URL}?act=get_switch&app=${encodeURIComponent(KEYT_APP_NAME)}&t=${ts}`;
        try {
            const raw = await keytGet(url);
            console.log('[QCC] 开关响应:', raw);
            const biz = verifyResponse(raw);
            if (biz) {
                if (biz.includes('CARD_ON'))  return 'CARD_ON';
                if (biz.includes('CARD_OFF')) return 'CARD_OFF';
            }
        } catch (e) {
            console.warn('[QCC] 开关请求失败:', e);
        }
        return 'CARD_ON';
    }

    /* ========== 验证卡密（带日志） ========== */
    async function requestVerify(card, mac) {
        const ts = Math.floor(Date.now() / 1000);
        const url = `${KEYT_BASE_URL}?card=${encodeURIComponent(card)}` +
                    `&mac=${encodeURIComponent(mac)}` +
                    `&app=${encodeURIComponent(KEYT_APP_NAME)}` +
                    `&heart=1&t=${ts}`;
        console.log('[QCC] 验证请求 URL:', url);
        const raw = await keytGet(url);
        console.log('[QCC] 验证响应原文:', raw);
        const biz = verifyResponse(raw);
        console.log('[QCC] 验证业务内容:', biz);
        return biz;
    }

    /* ========== 错误码转中文 ========== */
    function transMsg(code) {
        const map = {
            activate: '激活成功',
            valid: '验证通过',
            permanent: '终身有效',
            expired: '卡密已过期',
            banned: '卡密已被禁用',
            device_mismatch: '设备不匹配（请在后台解绑该卡密或改用新卡密）',
            online_limit_reached: '在线设备数已满',
            invalid_card: '卡密无效'
        };
        return map[code] || code;
    }

    /* ========== 解析剩余时间 ========== */
    function parseRemainingTime(biz) {
        const parts = biz.split('|');
        if (parts.length >= 3) {
            const days = parseInt(parts[2], 10);
            const mins = parts.length >= 4 ? parseInt(parts[3], 10) : 0;
            if (!isNaN(days)) return { days, minutes: isNaN(mins) ? 0 : mins };
        }
        return null;
    }

    /* ========== 异步验证入口 ========== */
    async function verifyAuthCode(rawCode) {
        const code = (rawCode || '').trim();
        if (!code) return { ok: false, msg: '请输入卡密' };

        try {
            const biz = await requestVerify(code, KEYT_DEVICE_ID);
            if (!biz) return { ok: false, msg: '❌ 验证失败：签名错误或网络异常' };

            if (biz.startsWith('ok|')) {
                authorized = true;
                authCode = code;
                localStorage.setItem(AUTH_STORAGE_KEY, code);

                const timeInfo = parseRemainingTime(biz);
                if (timeInfo) {
                    const expireTs = Date.now() + timeInfo.days * 86400000 + timeInfo.minutes * 60000;
                    localStorage.setItem(AUTH_EXPIRE_KEY, String(expireTs));
                } else {
                    localStorage.removeItem(AUTH_EXPIRE_KEY);
                }

                startHeartbeat();

                if (typeof __syncAuthUI === 'function') {
                    try { __syncAuthUI(); } catch (e) {}
                }

                const tip = timeInfo
                    ? `✅ 验证通过！剩余 ${timeInfo.days} 天 ${timeInfo.minutes} 分钟`
                    : '✅ 验证通过（终身有效）';
                return { ok: true, msg: tip };
            }

            if (biz.startsWith('error|')) {
                const errCode = biz.split('|')[1];
                return { ok: false, msg: '❌ ' + transMsg(errCode) };
            }

            return { ok: false, msg: '❌ ' + biz };
        } catch (e) {
            console.warn('[QCC] 卡密验证请求失败:', e);
            return { ok: false, msg: '❌ 网络请求失败，请检查网络后重试' };
        }
    }

    /* ========== 心跳保活 ========== */
    function startHeartbeat() {
        stopHeartbeat();
        heartbeatFailCount = 0;

        heartbeatTimer = setInterval(async () => {
            if (!authorized || !authCode) return;
            try {
                const biz = await requestVerify(authCode, KEYT_DEVICE_ID);
                if (biz && biz.startsWith('ok|')) {
                    heartbeatFailCount = 0;
                } else {
                    heartbeatFailCount++;
                    console.warn(`[QCC] 心跳异常 ${heartbeatFailCount}/${HEARTBEAT_FAIL_LIMIT}`);
                    if (heartbeatFailCount >= HEARTBEAT_FAIL_LIMIT) {
                        authorized = false;
                        stopHeartbeat();
                        if (typeof stopClicking === 'function') stopClicking();
                        localStorage.removeItem(AUTH_STORAGE_KEY);
                        localStorage.removeItem(AUTH_EXPIRE_KEY);
                        if (typeof __syncAuthUI === 'function') {
                            try { __syncAuthUI(); } catch (e) {}
                        }
                        if (typeof setStatus === 'function') {
                            setStatus('❌ 卡密心跳失效，请重新验证', '');
                        }
                    }
                }
            } catch (e) {
                heartbeatFailCount++;
            }
        }, HEARTBEAT_MS);
    }

    function stopHeartbeat() {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        heartbeatFailCount = 0;
    }

    /* ========== 本地缓存加载（异步 + 联网复核） ========== */
    async function loadAuthFromStorage() {
        try {
            const saved = (localStorage.getItem(AUTH_STORAGE_KEY) || '').trim();
            if (!saved) return;

            const expire = parseInt(localStorage.getItem(AUTH_EXPIRE_KEY) || '0', 10);
            if (expire && expire < Date.now()) {
                localStorage.removeItem(AUTH_STORAGE_KEY);
                localStorage.removeItem(AUTH_EXPIRE_KEY);
                return;
            }

            authCode = saved;
            authorized = true;

            try {
                const biz = await requestVerify(saved, KEYT_DEVICE_ID);
                if (!biz || !biz.startsWith('ok|')) {
                    authorized = false;
                    authCode = '';
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                    localStorage.removeItem(AUTH_EXPIRE_KEY);
                    if (typeof __syncAuthUI === 'function') {
                        try { __syncAuthUI(); } catch (e) {}
                    }
                    if (typeof setStatus === 'function') {
                        setStatus('⚠️ 本地授权已失效，请重新输入卡密', '');
                    }
                    return;
                }
                startHeartbeat();
            } catch (e) {
                console.warn('[QCC] 复核请求异常，暂保留本地授权:', e);
                startHeartbeat();
            }
        } catch (e) {}
    }

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

    let __rootsCache = null;
    let __rootsObserver = null;
    let __rootsDirty = true;

    function ensureRootsObserver() {
        if (__rootsObserver || !document.documentElement) return;
        try {
            __rootsObserver = new MutationObserver(() => { __rootsDirty = true; });
            __rootsObserver.observe(document.documentElement, { childList: true, subtree: true });
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
     * realClick
     * ============================================================ */
    function realClick(el) {
        if (!el) return false;
        try {
            const r0 = el.getBoundingClientRect();
            if (r0.top < 0 || r0.bottom > window.innerHeight ||
                r0.left < 0 || r0.right > window.innerWidth) {
                try {
                    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
                } catch (e) { el.scrollIntoView(); }
            }
        } catch (e) {}

        let r;
        try { r = el.getBoundingClientRect(); } catch (e) {
            r = { left: 0, top: 0, width: 1, height: 1 };
        }
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const base = {
            bubbles: true, cancelable: true, composed: true, view: window,
            clientX: x, clientY: y, screenX: x, screenY: y, button: 0, detail: 1
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

    const RANDOM_MIN_SEC = 3;
    const RANDOM_MAX_SEC = 18;
    function getRandomDelayMs() {
        const sec = Math.random() * (RANDOM_MAX_SEC - RANDOM_MIN_SEC) + RANDOM_MIN_SEC;
        return Math.round(sec * 1000);
    }

    /* ============================================================
     * 后台计时器 + 静音保活音频
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
     * 手动选择模式
     * ============================================================ */
    let manualPicking = false;
    let manualHoverEl = null;
    let manualOverHandler = null;
    let manualClickHandler = null;

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
        if (authorized) {
            btn.innerHTML = '<span class="qcc-btn-icon">🔍</span> 自动选择';
            btn.title = '自动拾取左侧目录';
        } else if (manualPicking) {
            btn.innerHTML = '<span class="qcc-btn-icon">✋</span> 退出手动';
            btn.title = '再次点击退出手动选择';
        } else {
            btn.innerHTML = '<span class="qcc-btn-icon">👆</span> 手动选择';
            btn.title = '手动点击页面元素添加';
        }
    }

    function enterManualPick() {
        if (manualPicking) return;
        manualPicking = true;

        manualOverHandler = (e) => {
            const el = pickManualTarget(e.target);
            if (!el) return;
            if (manualHoverEl === el) return;
            if (manualHoverEl) {
                try { manualHoverEl.classList.remove('qcc-manual-hover'); } catch (err) {}
            }
            manualHoverEl = el;
            try { el.classList.add('qcc-manual-hover'); } catch (err) {}
        };

        manualClickHandler = (e) => {
            if (panel && panel.contains(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            const el = pickManualTarget(e.target);
            if (!el) return;
            if (selectedEls.includes(el)) {
                setStatus('该元素已在列表中', '');
                return;
            }
            selectedEls.push(el);
            try { el.classList.add('qcc-pick-selected'); } catch (err) {}
            renderList();
            setStatus(`👆 手动选择中… 已添加 ${selectedEls.length} 个元素`, 'running');
        };

        document.addEventListener('mouseover', manualOverHandler, true);
        document.addEventListener('click', manualClickHandler, true);
        try { document.body.style.cursor = 'crosshair'; } catch (e) {}

        updatePickButton();
        setStatus('👆 手动选择模式：点击页面元素添加（再次点击按钮或 ESC 退出）', 'running');
    }

    function exitManualPick() {
        if (!manualPicking) return;
        manualPicking = false;

        if (manualOverHandler) {
            try { document.removeEventListener('mouseover', manualOverHandler, true); } catch (e) {}
            manualOverHandler = null;
        }
        if (manualClickHandler) {
            try { document.removeEventListener('click', manualClickHandler, true); } catch (e) {}
            manualClickHandler = null;
        }
        if (manualHoverEl) {
            try { manualHoverEl.classList.remove('qcc-manual-hover'); } catch (e) {}
            manualHoverEl = null;
        }
        try { document.body.style.cursor = ''; } catch (e) {}

        updatePickButton();
        setStatus(`已退出手动选择，共 ${selectedEls.length} 个元素`, '');
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
            try { if (getComputedStyle(cur).cursor === 'pointer') return cur; } catch (e) {}
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
                setStatus('⚠️ 未找到可点击链接，请确认左侧目录已展开', '');
            } else {
                setStatus(`✅ 已拾取 ${selectedEls.length} 个可点击链接`, '');
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
            const onLoaded = () => { clearTimeout(timer); resolve(true); };
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
                    } else { stuckCount = 0; }
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

    function startClicking() {
        if (isRunning) return;
        if (selectedEls.length === 0) { setStatus('请先选择左侧目录元素', ''); return; }

        if (manualPicking) exitManualPick();

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
                } else { stall = 0; }
                await sleep(ROUND_DELAY);
            }
        } finally {
            expanding = false;
        }
        setStatus(`展开完成，共点击 ${totalClicked} 个节点（${round} 轮）`, '');
    }

    /* ============================================================
     * ❤️ 捐赠 / 授权弹窗
     * ============================================================ */
    function openDonateModal() {
        if (document.getElementById('qcc-donate-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'qcc-donate-modal';
        modal.innerHTML = `
            <div class="qcc-donate-card">
                <div class="qcc-donate-emoji">❤️</div>
                <div class="qcc-donate-title">感谢您的支持</div>
                <div class="qcc-donate-desc">
                    如果这个脚本帮到了您，<br>
                    欢迎随意打赏一杯咖啡～
                </div>

                <div class="qcc-donate-qq">QQ：3365137745</div>
                <div class="qcc-donate-note">授权后可解锁「自动播放视频」与「一键展开」</div>

                <div class="qcc-device-box" id="qcc-device-box">
                    <div class="qcc-device-label">📱 当前设备号（后台绑定用）</div>
                    <div class="qcc-device-value" id="qcc-device-value">—</div>
                    <div class="qcc-device-actions">
                        <button class="qcc-device-btn" id="qcc-device-copy">复制</button>
                        <button class="qcc-device-btn qcc-device-btn-danger" id="qcc-device-reset">重置设备号</button>
                    </div>
                    <div class="qcc-device-tip">设备号需与后台绑定一致，否则会提示「设备不匹配」</div>
                </div>

                <div class="qcc-donate-auth" id="qcc-donate-auth">
                    <div class="qcc-donate-auth-title">🔐 卡密验证</div>
                    <div class="qcc-donate-auth-row">
                        <input type="text" class="qcc-auth-input" id="qcc-donate-auth-input"
                               placeholder="请输入卡密" autocomplete="off" spellcheck="false">
                        <button class="qcc-auth-btn" id="qcc-donate-auth-btn">确认</button>
                    </div>
                    <div class="qcc-auth-msg" id="qcc-donate-auth-msg">
                        输入卡密后点击「确认」解锁功能
                    </div>
                </div>

                <button class="qcc-donate-close" id="qcc-donate-close">关闭</button>
            </div>
        `;
        document.body.appendChild(modal);

        const inputEl  = document.getElementById('qcc-donate-auth-input');
        const btnEl    = document.getElementById('qcc-donate-auth-btn');
        const msgEl    = document.getElementById('qcc-donate-auth-msg');
        const authWrap = document.getElementById('qcc-donate-auth');

        /* ---------- 设备号显示 / 复制 / 重置 ---------- */
        const devVal   = document.getElementById('qcc-device-value');
        const devCopy  = document.getElementById('qcc-device-copy');
        const devReset = document.getElementById('qcc-device-reset');

        if (devVal) devVal.textContent = KEYT_DEVICE_ID;

        if (devCopy) {
            devCopy.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(KEYT_DEVICE_ID);
                    devCopy.textContent = '已复制';
                    setTimeout(() => devCopy.textContent = '复制', 1200);
                } catch (e) {
                    const ta = document.createElement('textarea');
                    ta.value = KEYT_DEVICE_ID;
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); devCopy.textContent = '已复制'; } catch (err) {}
                    document.body.removeChild(ta);
                    setTimeout(() => devCopy.textContent = '复制', 1200);
                }
            });
        }

        if (devReset) {
            devReset.addEventListener('click', () => {
                if (!confirm('确定要重置设备号吗？\n\n重置后需在卡密通后台重新绑定新设备号，否则授权会失效。')) return;
                localStorage.removeItem('qcc_device_id');
                location.reload();
            });
        }

        let escHandler = null;
        function closeModal() {
            try { modal.remove(); } catch (e) {}
            if (escHandler) document.removeEventListener('keydown', escHandler);
        }

        function syncModalAuth() {
            if (authorized) {
                authWrap.classList.add('is-ok');
                inputEl.value = authCode;
                inputEl.disabled = true;
                btnEl.disabled = true;
                btnEl.textContent = '已授权';
                msgEl.textContent = '✅ 功能已解锁，可以使用了';
                msgEl.className = 'qcc-auth-msg ok';
            } else {
                authWrap.classList.remove('is-ok');
                inputEl.disabled = false;
                btnEl.disabled = false;
                btnEl.textContent = '确认';
                msgEl.textContent = '输入卡密后点击「确认」解锁功能';
                msgEl.className = 'qcc-auth-msg';
            }
        }

        async function tryAuth() {
            btnEl.disabled = true;
            btnEl.textContent = '验证中…';
            const res = await verifyAuthCode(inputEl.value);
            btnEl.disabled = false;

            if (res.ok) {
                syncModalAuth();
                setStatus(res.msg, '');
                setTimeout(closeModal, 1200);
            } else {
                msgEl.textContent = res.msg;
                msgEl.className = 'qcc-auth-msg err';
                setStatus(res.msg.replace(/[✅❌⚠️]\s*/g, ''), '');
                authWrap.classList.remove('qcc-shake');
                void authWrap.offsetWidth;
                authWrap.classList.add('qcc-shake');
                try { inputEl.focus(); inputEl.select(); } catch (e) {}
                btnEl.textContent = '确认';
            }
        }

        btnEl.addEventListener('click', tryAuth);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); tryAuth(); }
        });

        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.getElementById('qcc-donate-close').addEventListener('click', closeModal);

        escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', escHandler);

        syncModalAuth();

        if (!authorized) {
            setTimeout(() => { try { inputEl.focus(); } catch (e) {} }, 120);
        }
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
                    <span class="qcc-badge">v3.5.0</span>
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
                        <label>自动播放视频 🔒</label>
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
                            <span class="qcc-btn-icon">📂</span> 一键展开 🔒
                        </button>
                        <button id="qcc-auto-pick" class="qcc-btn qcc-btn-primary">
                            <span class="qcc-btn-icon">👆</span> 手动选择
                        </button>
                    </div>
                    <div class="qcc-btn-group qcc-btn-group-sm">
                        <button id="qcc-clearList" class="qcc-btn qcc-btn-ghost qcc-btn-sm">
                            <span class="qcc-btn-icon">🗑️</span> 清空选择列表
                        </button>
                        <button id="qcc-donate" class="qcc-btn qcc-btn-donate qcc-btn-sm">
                            <span class="qcc-btn-icon">❤️</span> 捐赠 / 授权
                        </button>
                    </div>
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
            .qcc-logo{font-size:14px;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.20));}
            .qcc-title-text{font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#ffffff;}
            .qcc-badge{
                font-size:9px;background:rgba(255,255,255,0.22);color:#ffffff;
                padding:2px 6px;border-radius:6px;font-weight:600;
            }
            .qcc-header-right{display:flex;gap:6px;}
            .qcc-icon-btn{
                width:22px;height:22px;border:0;
                background:rgba(255,255,255,0.22);color:#ffffff;
                border-radius:50%;cursor:pointer;font-size:14px;line-height:1;font-weight:400;
                display:inline-flex;align-items:center;justify-content:center;
                transition:all .18s ease;padding:0;transform:translateY(-0.5px);
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
                font-size:10px;font-weight:600;color:#8e8e93;
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
            }
            .qcc-btn-icon{font-size:12px;line-height:1;}
            .qcc-btn:disabled{opacity:.4;cursor:not-allowed;}
            .qcc-btn:not(:disabled):active{transform:scale(.97);}

            .qcc-btn-primary{
                background:linear-gradient(180deg,#5b78ff 0%,#4f6ef7 100%);
                color:#fff;
                box-shadow:0 4px 14px rgba(79,110,247,0.30),0 1px 0 rgba(255,255,255,0.2) inset;
            }
            .qcc-btn-primary:not(:disabled):hover{
                background:linear-gradient(180deg,#6b85ff 0%,#5b78ff 100%);
                box-shadow:0 6px 20px rgba(79,110,247,0.42);
                transform:translateY(-1px);
            }

            .qcc-btn-success{
                background:linear-gradient(180deg,#34d17a 0%,#12b76a 100%);
                color:#fff;
                box-shadow:0 4px 14px rgba(18,183,106,0.30),0 1px 0 rgba(255,255,255,0.2) inset;
            }
            .qcc-btn-success:not(:disabled):hover{
                background:linear-gradient(180deg,#43dc8a 0%,#22c876 100%);
                box-shadow:0 6px 20px rgba(18,183,106,0.42);
                transform:translateY(-1px);
            }

            .qcc-btn-danger{background:rgba(255,59,48,0.08);color:#ff3b30;}
            .qcc-btn-danger:not(:disabled):hover{background:rgba(255,59,48,0.15);}

            .qcc-btn-ghost{background:rgba(15,23,42,0.05);color:#3a3a3c;}
            .qcc-btn-ghost:not(:disabled):hover{background:rgba(15,23,42,0.09);}

            .qcc-btn-donate{
                background:linear-gradient(180deg,#ff7aa2 0%,#ff4d7d 100%);
                color:#fff;
                box-shadow:0 4px 14px rgba(255,77,125,0.30),0 1px 0 rgba(255,255,255,0.2) inset;
            }
            .qcc-btn-donate:not(:disabled):hover{
                background:linear-gradient(180deg,#ff8aae 0%,#ff5c88 100%);
                box-shadow:0 6px 20px rgba(255,77,125,0.42);
                transform:translateY(-1px);
            }

            .qcc-btn-sm{padding:7px 10px;font-size:10.5px;margin-top:6px;}
            .qcc-btn-group{display:flex;gap:8px;}
            .qcc-btn-group-sm{margin-top:6px;}
            .qcc-btn-group-sm .qcc-btn-sm{margin-top:0;flex:1;}

            .qcc-status{
                display:flex;align-items:center;gap:8px;
                padding:9px 12px;background:rgba(15,23,42,0.04);
                border-radius:10px;font-size:10.5px;color:#3a3a3c;
                margin-bottom:12px;line-height:1.35;
            }
            .qcc-status-dot{
                width:7px;height:7px;border-radius:50%;
                background:#8e8e93;flex-shrink:0;transition:background .2s;
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
                border-radius:10px;padding:8px 10px;margin-bottom:12px;
            }
            .qcc-list-header{
                display:flex;justify-content:space-between;align-items:center;
                font-size:10px;color:#8e8e93;font-weight:600;
                margin-bottom:6px;letter-spacing:.02em;
            }
            .qcc-list-count{
                background:rgba(15,23,42,0.08);color:#3a3a3c;
                padding:2px 7px;border-radius:6px;font-size:9.5px;font-weight:600;
            }
            .qcc-list{max-height:90px;min-height:32px;overflow-y:auto;font-size:10.5px;color:#3a3a3c;}
            .qcc-list::-webkit-scrollbar{width:4px;}
            .qcc-list::-webkit-scrollbar-thumb{background:rgba(15,23,42,0.12);border-radius:2px;}
            .qcc-list-item{
                display:flex;justify-content:space-between;align-items:center;gap:6px;
                padding:6px 8px;background:rgba(255,255,255,0.7);
                border-radius:8px;margin-bottom:4px;
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
            .qcc-manual-hover{
                outline:2px dashed #4f6ef7 !important;
                outline-offset:2px !important;
                background:rgba(79,110,247,0.08) !important;
                cursor:crosshair !important;
            }

            .qcc-field-row{
                display:flex;justify-content:space-between;align-items:center;
                padding:7px 0;border-bottom:0.5px solid rgba(15,23,42,0.06);
            }
            .qcc-field-row label{font-size:11px;color:#3a3a3c;font-weight:500;}
            .qcc-switch{position:relative;width:36px;height:20px;flex-shrink:0;display:inline-block;}
            .qcc-switch input{opacity:0;width:0;height:0;}
            .qcc-switch-slider{
                position:absolute;cursor:pointer;inset:0;
                background:rgba(15,23,42,0.12);border-radius:10px;
                transition:.28s cubic-bezier(.4,0,.2,1);
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
                cursor:pointer;transition:all .18s;padding:0;font-family:inherit;
            }
            .qcc-speed-btn:hover{
                background:rgba(255,255,255,0.95);
                border-color:rgba(79,110,247,0.3);color:#4f6ef7;
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
                display:inline;font-size:13px;font-weight:600;
                letter-spacing:-0.01em;line-height:1;color:#ffffff;
            }
            #quick-custom-clicker.qcc-collapsed .qcc-header-left{gap:0;flex:1;justify-content:flex-start;}
            #quick-custom-clicker.qcc-collapsed .qcc-header-right{flex-shrink:0;}
            #quick-custom-clicker.qcc-collapsed .qcc-icon-btn{
                width:26px;height:26px;font-size:18px;
                background:rgba(255,255,255,0.30);transform:translateY(-1px);
            }
            #quick-custom-clicker.qcc-collapsed .qcc-icon-btn:hover{
                background:rgba(255,255,255,0.50);
            }
            #quick-custom-clicker.qcc-collapsed #qcc-close{display:none;}

            #qcc-donate-modal{
                position:fixed;inset:0;z-index:2147483647;
                background:rgba(15,23,42,0.38);
                backdrop-filter:blur(6px);
                -webkit-backdrop-filter:blur(6px);
                display:flex;align-items:center;justify-content:center;
                font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
                animation:qcc-fade-in .2s ease;
            }
            @keyframes qcc-fade-in{from{opacity:0}to{opacity:1}}
            .qcc-donate-card{
                width:290px;
                background:rgba(255,255,255,0.94);
                backdrop-filter:saturate(180%) blur(24px);
                -webkit-backdrop-filter:saturate(180%) blur(24px);
                border-radius:18px;
                padding:20px 18px 16px;
                text-align:center;
                box-shadow:0 24px 70px rgba(15,23,42,0.28),0 0 0 0.5px rgba(15,23,42,0.08);
                animation:qcc-pop-in .26s cubic-bezier(.2,1.2,.4,1);
            }
            @keyframes qcc-pop-in{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
            .qcc-donate-emoji{font-size:34px;line-height:1;margin-bottom:8px;}
            .qcc-donate-title{font-size:15px;font-weight:600;color:#1d1d1f;margin-bottom:6px;letter-spacing:-0.01em;}
            .qcc-donate-desc{font-size:11px;color:#6b7280;line-height:1.6;margin-bottom:12px;}
            .qcc-donate-qq{
                display:inline-block;font-size:12px;font-weight:600;color:#4f6ef7;
                background:rgba(79,110,247,0.10);padding:6px 12px;border-radius:8px;
                margin-bottom:6px;user-select:text;letter-spacing:.02em;
            }
            .qcc-donate-note{font-size:10px;color:#a1a1a6;margin-bottom:12px;line-height:1.4;}

            /* ===== 设备号展示 ===== */
            .qcc-device-box{
                text-align:left;
                background:rgba(79,110,247,0.06);
                border:0.5px solid rgba(79,110,247,0.18);
                border-radius:10px;
                padding:9px 10px;
                margin-bottom:12px;
            }
            .qcc-device-label{
                font-size:10px;font-weight:600;color:#3a5bd9;
                margin-bottom:4px;letter-spacing:.02em;
            }
            .qcc-device-value{
                font-size:11px;font-weight:600;color:#1d1d1f;
                font-family:ui-monospace,Menlo,Consolas,monospace;
                letter-spacing:.06em;word-break:break-all;
                margin-bottom:6px;
                background:rgba(255,255,255,0.7);
                padding:5px 8px;border-radius:6px;
                user-select:text;
            }
            .qcc-device-actions{display:flex;gap:6px;margin-bottom:5px;}
            .qcc-device-btn{
                flex:1;height:24px;border:0;border-radius:7px;
                background:rgba(79,110,247,0.12);color:#4f6ef7;
                font-size:10px;font-weight:600;cursor:pointer;font-family:inherit;
                transition:all .18s;
            }
            .qcc-device-btn:hover{background:rgba(79,110,247,0.20);}
            .qcc-device-btn-danger{background:rgba(255,59,48,0.10);color:#ff3b30;}
            .qcc-device-btn-danger:hover{background:rgba(255,59,48,0.18);}
            .qcc-device-tip{font-size:9.5px;color:#8e8e93;line-height:1.4;}

            /* ===== 卡密输入 ===== */
            .qcc-donate-auth{
                text-align:left;
                background:rgba(255,149,0,0.08);
                border:0.5px solid rgba(255,149,0,0.22);
                border-radius:10px;
                padding:10px;margin-bottom:12px;
                transition:background .2s,border-color .2s;
            }
            .qcc-donate-auth.is-ok{
                background:rgba(18,183,106,0.08);
                border-color:rgba(18,183,106,0.25);
            }
            .qcc-donate-auth.qcc-shake{animation:qcc-shake .36s cubic-bezier(.36,.07,.19,.97);}
            @keyframes qcc-shake{
                10%,90%{transform:translateX(-1.5px);}
                20%,80%{transform:translateX(3px);}
                30%,50%,70%{transform:translateX(-5px);}
                40%,60%{transform:translateX(5px);}
            }
            .qcc-donate-auth-title{
                font-size:10px;font-weight:600;color:#b25e00;
                margin-bottom:7px;letter-spacing:.02em;
            }
            .qcc-donate-auth.is-ok .qcc-donate-auth-title{color:#0e8f52;}
            .qcc-donate-auth-row{display:flex;gap:6px;}

            .qcc-auth-input{
                flex:1;min-width:0;height:26px;
                border:0.5px solid rgba(15,23,42,0.12);
                background:rgba(255,255,255,0.85);
                border-radius:7px;padding:0 8px;
                font-size:10.5px;color:#1d1d1f;
                font-family:inherit;outline:none;
                transition:border-color .18s,box-shadow .18s;
                letter-spacing:.02em;
            }
            .qcc-auth-input::placeholder{color:#b0b0b6;}
            .qcc-auth-input:focus{border-color:rgba(79,110,247,0.5);box-shadow:0 0 0 3px rgba(79,110,247,0.12);}
            .qcc-auth-input:disabled{background:rgba(15,23,42,0.04);color:#6b7280;}
            .qcc-auth-btn{
                height:26px;padding:0 12px;flex-shrink:0;
                border:0;border-radius:7px;
                background:linear-gradient(180deg,#ffb340 0%,#f79009 100%);
                color:#fff;font-size:10.5px;font-weight:600;cursor:pointer;
                font-family:inherit;letter-spacing:-0.01em;
                box-shadow:0 2px 8px rgba(247,144,9,0.3);
                transition:all .18s;
            }
            .qcc-auth-btn:hover:not(:disabled){filter:brightness(1.06);transform:translateY(-1px);}
            .qcc-auth-btn:disabled{opacity:.6;cursor:default;box-shadow:none;background:rgba(18,183,106,0.75);}
            .qcc-auth-msg{font-size:9.5px;color:#8e8e93;margin-top:5px;line-height:1.45;}
            .qcc-auth-msg.err{color:#ff3b30;}
            .qcc-auth-msg.ok{color:#12b76a;}

            .qcc-donate-close{
                width:100%;border:0;border-radius:10px;padding:9px 12px;
                background:rgba(15,23,42,0.06);color:#3a3a3c;
                font-size:11.5px;font-weight:500;cursor:pointer;font-family:inherit;
                transition:background .18s;
            }
            .qcc-donate-close:hover{background:rgba(15,23,42,0.11);}
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

        __syncAuthUI = function () {
            updatePickButton();
            if (authorized) {
                if (manualPicking) exitManualPick();
                setStatus('✅ 授权成功，功能已解锁', '');
            }
        };

        function syncVideoUI() {
            autoVideoCheck.checked = autoPlayVideo;
            speedBlock.classList.toggle('qcc-hidden', !autoPlayVideo);
            speedValueEl.textContent = videoSpeed + 'x';
            speedBtns.forEach(b => {
                b.classList.toggle('active', parseInt(b.dataset.speed, 10) === videoSpeed);
            });
        }

        function flashDonateBtn() {
            const btn = document.getElementById('qcc-donate');
            if (!btn) return;
            btn.style.transition = 'all .2s ease';
            btn.style.transform = 'scale(1.08)';
            btn.style.boxShadow = '0 0 0 4px rgba(255,77,125,0.3)';
            setTimeout(() => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = '0 4px 14px rgba(255,77,125,0.30), 0 1px 0 rgba(255,255,255,0.2) inset';
            }, 400);
        }

        autoVideoCheck.addEventListener('click', (e) => {
            if (!authorized) {
                e.preventDefault();
                autoVideoCheck.checked = false;
                autoPlayVideo = false;
                syncVideoUI();
                setStatus('🔒 请点击下方【❤️ 捐赠 / 授权】按钮，输入卡密解锁「自动播放视频」', '');
                flashDonateBtn();
                return;
            }
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

        document.getElementById('qcc-auto-pick').addEventListener('click', () => {
            if (authorized) {
                if (manualPicking) exitManualPick();
                autoPickLeftNav();
            } else {
                if (manualPicking) exitManualPick();
                else enterManualPick();
            }
        });

        document.getElementById('qcc-clearList').addEventListener('click', () => {
            clearSelected();
            setStatus('元素列表已清空', '');
        });

        document.getElementById('qcc-donate').addEventListener('click', openDonateModal);

        document.getElementById('qcc-start').addEventListener('click', startClicking);
        document.getElementById('qcc-stop').addEventListener('click', stopClicking);

        document.getElementById('qcc-expandRight').addEventListener('click', () => {
            if (!authorized) {
                setStatus('🔒 请点击下方【❤️ 捐赠 / 授权】按钮，输入卡密解锁「一键展开」', '');
                flashDonateBtn();
                return;
            }
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
            stopHeartbeat();
            if (manualPicking) exitManualPick();
            stopClicking();
            const dm = document.getElementById('qcc-donate-modal');
            if (dm) dm.remove();
            panel.remove();
            __syncAuthUI = null;
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
                if (manualPicking) { exitManualPick(); return; }
                if (isRunning) {
                    stopClicking();
                    setStatus('ESC 已停止点击', '');
                }
            }
        });

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

        updatePickButton();
        renderList();
        setStatus('等待操作', '');

        (async () => {
            await loadAuthFromStorage();
            updatePickButton();
            if (typeof __syncAuthUI === 'function') {
                try { __syncAuthUI(); } catch (e) {}
            }
            setStatus(authorized ? '已授权，可以开始使用' : '等待操作', '');
        })();

        getCardSwitch().catch(() => {});
    }

    /* ============================================================
     * 启动（带容错）
     * ============================================================ */
    function safeBuildPanel() {
        try {
            if (!document.body) {
                setTimeout(safeBuildPanel, 50);
                return;
            }
            buildPanel();
        } catch (e) {
            console.error('[QCC] 面板构建失败:', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeBuildPanel, { once: true });
    } else {
        safeBuildPanel();
    }
})();
