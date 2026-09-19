// ==UserScript==
// @name             全新国开免费自动刷课
// @namespace        小石头
// @description      支持自动访问线上链接、查看资料附件、观看视频、自动查看页面、自动参与发帖回帖。
// @version          2.7.2
// @author           小石头
// @icon         data:image/png;base64,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 @grant            GM_xmlhttpRequest
// @grant            GM_getValue
// @grant            GM_setValue
// @connect          keyt.cn
// @license          MIT
// @original-author  小石头
// @original-script  http://one.ouchn.cn/
// @source           http://one.ouchn.cn/
// @note             2.7.2：修复刷新后授权码不自动恢复的问题
// ==/UserScript==

(() => {
  "use strict";

  // ============================================================
  // 配置区
  // ============================================================
  const CONFIG = {
    videoSpeed: 2,
    randomDelayMin: 5000,
    randomDelayMax: 8000,
    autoPlayVideo: true,
    muteVideo: true,
    autoNext: false,
    nextDelay: 3000,
    enablePanel: true,
    repeatLearned: false,
    activityInterval: 0,
    unlocked: false
  };

  const ACTIVITY_INTERVAL_STEPS = [
    { label: '0秒',   sec: 0 },
    { label: '3秒',   sec: 3 },
    { label: '5秒',   sec: 5 },
    { label: '10秒',  sec: 10 },
    { label: '30秒',  sec: 30 },
    { label: '1分钟', sec: 60 },
    { label: '2分钟', sec: 120 }
  ];

  const REPEAT_SKIP_TYPES = ['forum'];

  // ============================================================
  // 卡密通网络验证配置
  // ============================================================
  const KEYT_USER   = 'cjtfky123';
  const KEYT_APP    = 'a';
  const KEYT_SECRET = '1cc35a6aa4b3b60f82100301574ca9a9';
  const KEYT_BASE   = `https://www.keyt.cn/kami/${KEYT_USER}/check.php`;

  const AUTH_CACHE_KEY     = 'ouchn_auth_cache';
  const MACHINE_ID_KEY     = 'ouchn_machine_id';
  const HEARTBEAT_MS       = 50000;
  const HEARTBEAT_MAX_FAIL = 5;
  const TIME_TOLERANCE     = 120;

  // ============================================================
  // MD5 纯 JS 实现
  // ============================================================
  const MD5 = (function () {
    function safeAdd(x, y) { const lsw = (x & 0xFFFF) + (y & 0xFFFF); const msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xFFFF); }
    function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)); }
    function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
    function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
    function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
    function binlMD5(x, len) {
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;
      let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
      for (let i = 0; i < x.length; i += 16) {
        const olda = a, oldb = b, oldc = c, oldd = d;
        a = md5ff(a, b, c, d, x[i], 7, -680876936); d = md5ff(d, a, b, c, x[i + 1], 12, -389564586); c = md5ff(c, d, a, b, x[i + 2], 17, 606105819); b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897); d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426); c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417); c = md5ff(c, d, a, b, x[i + 10], 17, -42063); b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, x[i + 13], 12, -40341101); c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510); d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632); c = md5gg(c, d, a, b, x[i + 11], 14, 643717713); b = md5gg(b, c, d, a, x[i], 20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691); d = md5gg(d, a, b, c, x[i + 10], 9, 38016083); c = md5gg(c, d, a, b, x[i + 15], 14, -660478335); b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438); d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690); c = md5gg(c, d, a, b, x[i + 3], 14, -187363961); b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, x[i + 2], 9, -51403784); c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473); b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558); d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463); c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353); c = md5hh(c, d, a, b, x[i + 7], 16, -155497632); b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174); d = md5hh(d, a, b, c, x[i], 11, -358537222); c = md5hh(c, d, a, b, x[i + 3], 16, -722521979); b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487); d = md5hh(d, a, b, c, x[i + 12], 11, -421815835); c = md5hh(c, d, a, b, x[i + 15], 16, 530742520); b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = md5ii(a, b, c, d, x[i], 6, -198630844); d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415); c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606); c = md5ii(c, d, a, b, x[i + 10], 15, -1051523); b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, x[i + 15], 10, -30611744); c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070); d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379); c = md5ii(c, d, a, b, x[i + 2], 15, 718787259); b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd);
      }
      return [a, b, c, d];
    }
    function binl2rstr(input) {
      let output = '';
      for (let i = 0; i < input.length * 32; i += 8) {
        output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
      }
      return output;
    }
    function rstr2binl(input) {
      const output = [];
      output[(input.length >> 2) - 1] = undefined;
      for (let i = 0; i < output.length; i++) output[i] = 0;
      for (let i = 0; i < input.length * 8; i += 8) {
        output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
      }
      return output;
    }
    function rstrMD5(s) { return binl2rstr(binlMD5(rstr2binl(s), s.length * 8)); }
    function rstr2hex(input) {
      const hexTab = '0123456789abcdef';
      let output = '';
      for (let i = 0; i < input.length; i++) {
        const x = input.charCodeAt(i);
        output += hexTab.charAt((x >>> 4) & 0x0F) + hexTab.charAt(x & 0x0F);
      }
      return output;
    }
    function str2rstrUTF8(input) { return unescape(encodeURIComponent(input)); }
    return function (s) { return rstr2hex(rstrMD5(str2rstrUTF8(s))); };
  })();

  // ============================================================
  // 卡密通验证：工具函数
  // ============================================================
  const nowTs = () => Math.floor(Date.now() / 1000);

  function getMachineId() {
    let id = GM_getValue(MACHINE_ID_KEY, '');
    if (!id) {
      id = 'OUCHN-' + Date.now().toString(36).toUpperCase() + '-' +
           Math.random().toString(36).slice(2, 10).toUpperCase();
      GM_setValue(MACHINE_ID_KEY, id);
    }
    return id + 'MAC';
  }

  function verifyResponse(raw) {
    if (!raw) return null;
    const signIndex = raw.indexOf('|sign=');
    if (signIndex === -1) return null;

    const body = raw.substring(0, signIndex);
    const sign = raw.substring(signIndex + 6);

    if (MD5(body + KEYT_SECRET) !== sign) return null;

    const lastPipe = body.lastIndexOf('|');
    if (lastPipe === -1) return null;

    const serverTs = parseInt(body.substring(lastPipe + 1), 10);
    if (Math.abs(nowTs() - serverTs) > TIME_TOLERANCE) return null;

    return body.substring(0, lastPipe);
  }

  function gmGet(url) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        headers: { 'Cache-Control': 'no-cache' },
        timeout: 12000,
        onload: (res) => resolve(res.status === 200 ? res.responseText : null),
        onerror: () => resolve(null),
        ontimeout: () => resolve(null)
      });
    });
  }

  async function fetchCardSwitch() {
    for (let i = 0; i < 3; i++) {
      const url = `${KEYT_BASE}?act=get_switch&app=${KEYT_APP}&t=${nowTs()}`;
      const raw = await gmGet(url);
      if (raw) {
        const biz = verifyResponse(raw);
        if (biz && biz.indexOf('CARD_ON') !== -1) return 'CARD_ON';
        if (biz && biz.indexOf('CARD_OFF') !== -1) return 'CARD_OFF';
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return 'CARD_ON';
  }

  async function verifyCard(card, mac) {
    const url = `${KEYT_BASE}?card=${encodeURIComponent(card)}&mac=${encodeURIComponent(mac)}&app=${KEYT_APP}&heart=1&t=${nowTs()}`;
    const raw = await gmGet(url);
    return verifyResponse(raw);
  }

  function parseRemain(biz) {
    if (!biz) return null;
    const parts = biz.split('|');
    if (parts.length >= 3) {
      return {
        days: parseInt(parts[2], 10) || 0,
        minutes: parts.length >= 4 ? (parseInt(parts[3], 10) || 0) : 0
      };
    }
    if (parts.length === 2 && parts[1] === 'permanent') {
      return { days: 99999, minutes: 0 };
    }
    return null;
  }

  let heartbeatTimer = null;
  let heartbeatFail = 0;
  let currentCard = '';
  let currentMac = '';

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startHeartbeat(panel) {
    stopHeartbeat();
    heartbeatFail = 0;
    heartbeatTimer = setInterval(async () => {
      if (!currentCard || !currentMac) return;

      const biz = await verifyCard(currentCard, currentMac);
      if (biz && biz.startsWith('ok|')) {
        heartbeatFail = 0;
        const info = parseRemain(biz);
        if (info && panel) {
          panel.log(`💓 心跳正常 · 剩余 ${info.days}天 ${info.minutes}分钟`, 'info');
        }
      } else {
        heartbeatFail++;
        if (panel) panel.log(`⚠️ 心跳异常 ${heartbeatFail}/${HEARTBEAT_MAX_FAIL}`, 'warning');
        if (heartbeatFail >= HEARTBEAT_MAX_FAIL) {
          stopHeartbeat();
          if (panel) panel.log('❌ 心跳连续失败，已锁定功能', 'error');
          CONFIG.unlocked = false;
        }
      }
    }, HEARTBEAT_MS);
  }

  // ============================================================
  // 从缓存自动解锁（多时机重试）
  // ============================================================
  function tryUnlockFromCache(reason = '') {
    try {
      const cached = GM_getValue(AUTH_CACHE_KEY, null);
      console.log(`[刷课] tryUnlockFromCache(${reason}) cached =`, cached);

      if (!cached || !cached.card || !cached.mac) {
        console.log('[刷课] 无缓存，跳过自动解锁');
        return false;
      }

      currentCard = cached.card;
      currentMac = cached.mac;
      CONFIG.unlocked = true;

      // 直接操作当前 DOM（防止实例引用失效）
      const btn = document.getElementById('donateBtn');
      if (btn) {
        btn.innerHTML = '<span>✅</span><span>已解锁</span>';
        console.log('[刷课] 按钮已改为已解锁');
      }

      const range = document.getElementById('activityIntervalRange');
      if (range) range.disabled = false;

      const labels = document.querySelectorAll('#intervalLabels span');
      labels.forEach(s => s.classList.remove('disabled'));

      const repeat = document.getElementById('repeatLearnedCheck');
      if (repeat) repeat.disabled = false;

      // 如果当前实例的 panel 可用，也打个日志
      if (currentAutoLearn && currentAutoLearn.panel && typeof currentAutoLearn.panel.log === 'function') {
        currentAutoLearn.panel.log('✅ 已用缓存卡密自动解锁，正在恢复心跳…', 'success');
      }

      // 启动心跳（如果尚未启动）
      if (typeof startHeartbeat === 'function' && currentAutoLearn && currentAutoLearn.panel) {
        startHeartbeat(currentAutoLearn.panel);
      }

      console.log('[刷课] 自动解锁完成');
      return true;
    } catch (e) {
      console.error('[刷课] tryUnlockFromCache 报错:', e);
      return false;
    }
  }

  // ============================================================
  // LMS API
  // ============================================================
  const API = {
    getGlobalData() {
      return {
        course: window.globalData?.course || {},
        user: window.globalData?.user || {},
        dept: window.globalData?.dept || {},
        isOpenUniversity: window.globalData?.isOpenUniversity || true,
        courseRoles: window.globalData?.courseRoles || ["student"],
        deliveryOrg: window.globalData?.deliveryOrg || "ouchn",
        useSinglePage: window.globalData?.useSinglePage ?? true,
        expandActivityInfo: window.globalData?.expandActivityInfo ?? false
      };
    },

    addVideoLearningRecords({ start_at, end_at, syllabus_id, activity_id, upload_id }) {
      const data = this.getGlobalData();
      const duration = Math.ceil(300 * Math.random() + 40);
      const payload = JSON.stringify({
        syllabus_id, activity_id, upload_id, start_at, end_at, duration,
        user_id: data.user.id,
        org_id: data.user.orgId,
        course_id: data.course.id,
        is_teacher: false,
        is_student: true,
        ts: Date.now(),
        user_agent: navigator.userAgent,
        meeting_type: "online_video",
        org_name: data.user.orgName,
        org_code: data.user.orgCode,
        user_no: data.user.userNo,
        user_name: data.user.name,
        course_code: data.course.courseCode,
        course_name: data.course.name
      });

      return new Promise((resolve, reject) => {
        $.ajax({
          url: `https://lms.ouchn.cn/statistics/api/online-videos`,
          data: payload, type: "POST", cache: false,
          contentType: "text/plain;charset=UTF-8",
          complete: resolve, error: reject
        });
      });
    },

    postLearningActiVities(activityId, activityType, isOpen, activityName = null) {
      const data = this.getGlobalData();
      const payload = JSON.stringify({
        org_id: data.user.orgId,
        user_id: data.user.id,
        course_id: data.course.id,
        enrollment_role: data.courseRoles[0],
        is_teacher: false,
        activity_id: activityId,
        activity_type: activityType,
        activity_name: activityName,
        module: null,
        action: isOpen ? "open" : "close",
        ts: new Date().getTime(),
        user_agent: navigator.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        mode: "normal", channel: "web", target_info: {},
        master_course_id: data.course.id,
        org_name: data.user.orgName,
        org_code: data.user.orgCode,
        user_no: data.user.userNo,
        user_name: data.user.name,
        course_code: data.course.courseCode,
        course_name: data.course.name,
        dep_id: data.dept.id,
        dep_name: data.dept.name,
        dep_code: data.dept.code
      });

      return new Promise((resolve, reject) => {
        $.ajax({
          url: `https://lms.ouchn.cn/statistics/api/learning-activity`,
          data: payload, type: "POST",
          contentType: "application/json", dataType: "JSON",
          success: resolve, error: reject
        });
      });
    },

    postActivitiesRead(activityId, extraData = {}) {
      return new Promise((resolve, reject) => {
        $.ajax({
          type: "POST",
          url: `https://lms.ouchn.cn/api/course/activities-read/${activityId}`,
          contentType: "application/json", dataType: "JSON",
          data: JSON.stringify(extraData),
          success: resolve, error: reject
        });
      });
    },

    getCategoryId(activityId) {
      return new Promise((resolve) => {
        $.get(`https://lms.ouchn.cn/api/forum/${activityId}/category?fields=id`, {})
          .done((data) => resolve(data))
          .fail(() => resolve(null));
      });
    },

    postForum(categoryId, { title, content } = {}) {
      const defaultTitle = `好好学习${Date.now()}`;
      const defaultContent = `<p>好好学习，天天向上。${Date.now()}</p>`;
      return new Promise((resolve, reject) => {
        $.ajax({
          type: "POST",
          url: `https://lms.ouchn.cn/api/topics`,
          contentType: "application/json", dataType: "JSON",
          data: JSON.stringify({
            title: title || defaultTitle,
            content: content || defaultContent,
            category_id: categoryId,
            uploads: []
          }),
          success: resolve, error: reject
        });
      });
    }
  };

  const notificationTypes = {
    material: "参考资料",
    web_link: "线上链接",
    online_video: "音视频教材",
    slide: "微课",
    lesson: "录播教材",
    homework: "作业",
    forum: "讨论区",
    chatroom: "iSlide 直播",
    questionnaire: "调查问卷",
    page: "页面",
    course_invite: "課程邀請",
    scorm: "SCORM"
  };

  const VideoPlayer = {
    findVideoElement() {
      const selectors = ['video', '.video-player video', '.play-video video', 'video_html5', 'object video', 'iframe video'];
      for (const selector of selectors) {
        const video = document.querySelector(selector);
        if (video && video.tagName === 'VIDEO') return video;
      }
      const embeds = document.querySelectorAll('embed, object');
      for (const embed of embeds) {
        const video = embed.contentDocument?.querySelector('video');
        if (video) return video;
      }
      return null;
    },
    async waitForVideo(maxWaitTime = 15000) {
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitTime) {
        const video = this.findVideoElement();
        if (video) return video;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return null;
    }
  };

  // ============================================================
  // 面板
  // ============================================================
  class LogPanel {
    constructor() {
      this.panelHtml = `
        <div id="autoLearnPanel" class="auto-learn-panel">
          <style>
            .auto-learn-panel {
              position: fixed; top: 20px; right: 20px; z-index: 9999999999;
              width: 360px; background: #ffffff; border-radius: 16px;
              box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18), 0 4px 14px rgba(0, 0, 0, 0.08);
              overflow: hidden; transition: all 0.3s ease;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
              color: #1f2329;
            }
            .auto-learn-panel * { box-sizing: border-box; }
            .panel-header {
              display: flex; align-items: center; justify-content: space-between;
              padding: 12px 14px;
              background: linear-gradient(135deg, #4f6ef7 0%, #7b5cf5 100%);
              color: #fff; cursor: move; user-select: none;
            }
            .panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; }
            .panel-title .icon { font-size: 16px; }
            .panel-controls { display: flex; gap: 4px; }
            .ctrl-btn {
              width: 22px; height: 22px; border-radius: 6px;
              background: rgba(255,255,255,0.15); border: none; color: #fff;
              cursor: pointer; display: flex; align-items: center; justify-content: center;
              font-size: 14px; line-height: 1; padding: 0; transition: background 0.15s;
            }
            .ctrl-btn:hover { background: rgba(255,255,255,0.3); }
            .ctrl-btn.close:hover { background: rgba(239, 68, 68, 0.85); }
            .panel-body {
              padding: 12px 14px 14px; max-height: 520px;
              overflow: hidden; display: flex; flex-direction: column;
            }
            .config-section { background: #f5f7fa; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px; }
            .config-title {
              font-size: 11.5px; font-weight: 600; color: #8a94a6;
              text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
              display: flex; align-items: center; gap: 6px;
            }
            .config-row {
              display: flex; align-items: center; justify-content: space-between;
              padding: 6px 0; border-bottom: 1px solid #eaecf0;
            }
            .config-row:last-child { border-bottom: none; }
            .config-row-block { flex-direction: column; align-items: stretch; gap: 6px; }
            .config-row-head { display: flex; align-items: center; justify-content: space-between; }
            .config-label { color: #4a5263; font-size: 13px; font-weight: 500; }
            .speed-selector { display: flex; gap: 4px; }
            .speed-btn {
              min-width: 38px; height: 26px; border-radius: 8px;
              border: 1px solid #e2e5ea; background: #fff; color: #8a94a6;
              font-size: 12px; font-weight: 600; cursor: pointer;
              transition: all 0.18s ease; padding: 0 6px;
            }
            .speed-btn:hover { border-color: #4f6ef7; color: #4f6ef7; }
            .speed-btn.active {
              background: linear-gradient(135deg, #4f6ef7 0%, #6b5cf5 100%);
              border-color: transparent; color: #fff;
              box-shadow: 0 2px 6px rgba(79, 110, 247, 0.35);
            }
            .interval-value {
              font-size: 12px; font-weight: 600; color: #4f6ef7;
              background: #eef3ff; padding: 2px 10px; border-radius: 8px;
              min-width: 48px; text-align: center;
            }
            input[type="range"].interval-range {
              -webkit-appearance: none; appearance: none;
              width: 100%; height: 6px; border-radius: 3px;
              background: #e2e5ea; outline: none; cursor: pointer; margin: 2px 0 0;
            }
            input[type="range"].interval-range::-webkit-slider-thumb {
              -webkit-appearance: none; appearance: none;
              width: 18px; height: 18px; border-radius: 50%;
              background: linear-gradient(135deg, #4f6ef7 0%, #6b5cf5 100%);
              box-shadow: 0 2px 6px rgba(79, 110, 247, 0.45);
              cursor: pointer; transition: transform 0.15s;
            }
            input[type="range"].interval-range::-moz-range-thumb {
              width: 18px; height: 18px; border: 0; border-radius: 50%;
              background: linear-gradient(135deg, #4f6ef7 0%, #6b5cf5 100%);
              box-shadow: 0 2px 6px rgba(79, 110, 247, 0.45); cursor: pointer;
            }
            input[type="range"].interval-range:disabled { cursor: not-allowed; opacity: 0.55; }
            .range-labels {
              display: flex; justify-content: space-between;
              font-size: 10px; color: #8a94a6; user-select: none; margin-top: 2px;
            }
            .range-labels span { cursor: pointer; transition: color 0.15s; }
            .range-labels span:hover { color: #4f6ef7; }
            .range-labels span.active { color: #4f6ef7; font-weight: 600; }
            .range-labels.disabled span { cursor: not-allowed; }
            .range-labels.disabled span:hover { color: #8a94a6; }
            .toggle-switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
            .toggle-switch input { opacity: 0; width: 0; height: 0; }
            .toggle-slider {
              position: absolute; cursor: pointer; inset: 0;
              background: #e2e5ea; border-radius: 12px; transition: 0.3s;
            }
            .toggle-slider:before {
              position: absolute; content: ''; height: 18px; width: 18px;
              left: 3px; bottom: 3px; background: #fff; border-radius: 50%;
              transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            }
            input:checked + .toggle-slider { background: linear-gradient(135deg, #4f6ef7 0%, #6b5cf5 100%); }
            input:checked + .toggle-slider:before { transform: translateX(20px); }
            .toggle-switch input:disabled + .toggle-slider { opacity: 0.45; cursor: not-allowed; }
            .log-section {
              flex: 1; background: #f5f7fa; border-radius: 10px;
              padding: 8px 10px; overflow: hidden;
              display: flex; flex-direction: column; min-height: 0;
            }
            .log-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
            .log-title {
              font-size: 11.5px; color: #8a94a6; font-weight: 600;
              text-transform: uppercase; letter-spacing: 0.5px;
              display: flex; align-items: center; gap: 6px;
            }
            .log-clear {
              font-size: 10.5px; color: #8a94a6; cursor: pointer;
              padding: 2px 7px; border-radius: 6px; transition: all 0.2s ease;
            }
            .log-clear:hover { color: #d92d20; background: #fff1f0; }
            .log-option-row {
              display: flex; align-items: center; justify-content: space-between;
              padding: 6px 8px; margin-bottom: 6px;
              background: #fff; border-radius: 8px; border: 1px solid #eaecf0;
            }
            .log-option-label { font-size: 12px; color: #4a5263; font-weight: 500; }
            .log-container {
              flex: 1; overflow-y: auto; padding-right: 4px; min-height: 0;
            }
            .log-container::-webkit-scrollbar { width: 5px; }
            .log-container::-webkit-scrollbar-thumb { background: #d0d5dd; border-radius: 3px; }
            .log-item {
              padding: 5px 8px; border-radius: 7px; margin-bottom: 4px;
              font-size: 11.5px; line-height: 1.45; animation: slideIn 0.3s ease;
            }
            @keyframes slideIn {
              from { opacity: 0; transform: translateX(-10px); }
              to { opacity: 1; transform: translateX(0); }
            }
            .log-item.info { background: #eef3ff; border-left: 3px solid #4f6ef7; color: #3457d5; }
            .log-item.success { background: #e7f8f0; border-left: 3px solid #12b76a; color: #0e9f5c; }
            .log-item.warning { background: #fff7e6; border-left: 3px solid #f79009; color: #b54708; }
            .log-item.error { background: #fff1f0; border-left: 3px solid #d92d20; color: #b42318; }
            .log-item .timestamp { font-size: 9.5px; opacity: 0.6; margin-right: 5px; }
            .log-item .status-icon { margin-right: 4px; font-size: 10px; }
            .panel-footer { padding: 10px 14px 14px; background: #ffffff; }
            .btn-group { display: flex; gap: 8px; }
            .start-btn, .pause-btn, .restart-btn {
              flex: 1; height: 38px; border-radius: 10px; border: none;
              font-size: 12.5px; font-weight: 600; cursor: pointer;
              transition: all 0.18s ease; display: flex;
              align-items: center; justify-content: center; gap: 4px;
              white-space: nowrap; font-family: inherit;
            }
            .start-btn { background: linear-gradient(135deg, #12b76a 0%, #0e9f5c 100%); color: #fff; box-shadow: 0 2px 8px rgba(18, 183, 106, 0.28); }
            .start-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(18, 183, 106, 0.4); }
            .pause-btn { background: #fff7e6; color: #b54708; }
            .pause-btn:hover:not(:disabled) { background: #ffefcc; }
            .restart-btn { background: #eef3ff; color: #3457d5; }
            .restart-btn:hover:not(:disabled) { background: #e0e9ff; }
            .start-btn:disabled, .pause-btn:disabled, .restart-btn:disabled {
              background: #e2e5ea; color: #8a94a6; cursor: not-allowed; box-shadow: none;
            }
            .donate-btn {
              width: 100%; height: 34px; margin-top: 8px; border-radius: 10px; border: none;
              background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
              color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer;
              display: flex; align-items: center; justify-content: center; gap: 6px;
              transition: all 0.18s ease;
              box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3); font-family: inherit;
            }
            .donate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(245, 87, 108, 0.45); }
            .progress-bar { height: 3px; background: #e2e5ea; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
            .progress-fill {
              height: 100%; width: 0%;
              background: linear-gradient(90deg, #4f6ef7, #12b76a);
              border-radius: 2px; transition: width 0.3s ease;
            }
            .qcc-modal-mask {
              position: absolute; inset: 0; background: rgba(15, 23, 42, 0.35);
              display: none; align-items: center; justify-content: center;
              z-index: 10; border-radius: 16px; animation: qccFadeIn 0.15s ease;
            }
            .qcc-modal-mask.show { display: flex; }
            @keyframes qccFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .qcc-modal {
              width: 260px; background: #fff; border-radius: 12px;
              box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
              overflow: hidden; animation: qccPopIn 0.18s ease;
            }
            @keyframes qccPopIn {
              from { transform: scale(0.92); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .qcc-modal-header {
              display: flex; align-items: center; gap: 8px;
              padding: 12px 14px 8px;
              font-size: 14px; font-weight: 600; color: #1f2329;
            }
            .qcc-modal-icon { font-size: 16px; }
            .qcc-modal-title { flex: 1; }
            .qcc-modal-body {
              padding: 0 14px 10px; font-size: 12.5px;
              color: #4a5263; line-height: 1.6;
            }
            .qcc-modal-body p { margin: 0 0 6px; }
            .qcc-modal-body ul { margin: 0 0 8px; padding-left: 18px; color: #8a94a6; }
            .qcc-modal-body li { margin-bottom: 2px; }
            .qcc-modal-tip { color: #d92d20; font-weight: 500; }
            .qcc-modal-qq {
              margin: 0 0 8px; padding-left: 4px; color: #4a5263;
              font-weight: 600; font-size: 12.5px;
            }
            .qcc-modal-contact {
              display: flex; align-items: center; gap: 4px;
              margin-bottom: 8px; padding-left: 4px;
            }
            .qcc-modal-contact .qcc-modal-tip,
            .qcc-modal-contact .qcc-modal-qq { margin: 0; padding-left: 0; }
            .qcc-modal-input-wrap { margin-top: 4px; padding-left: 4px; }
            .qcc-modal-input {
              width: 100%; height: 34px; padding: 0 10px;
              border-radius: 8px; border: 1px solid #e2e5ea;
              background: #fafbfc; font-size: 13px; color: #1f2329;
              outline: none; transition: all 0.18s ease;
              font-family: inherit; letter-spacing: 0.5px;
            }
            .qcc-modal-input::placeholder { color: #b0b6bf; }
            .qcc-modal-input:focus {
              border-color: #4f6ef7; background: #fff;
              box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.12);
            }
            .qcc-modal-input.is-error {
              border-color: #d92d20; background: #fff5f5;
              box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.12);
            }
            .qcc-modal-input-tip {
              margin-top: 4px; font-size: 11px; line-height: 1.4;
              color: #d92d20; min-height: 14px; opacity: 0; transition: opacity 0.15s;
            }
            .qcc-modal-input-tip.show { opacity: 1; }
            .qcc-modal-footer { display: flex; gap: 8px; padding: 10px 14px 14px; }
            .qcc-modal-btn {
              flex: 1; height: 32px; border-radius: 8px; border: none;
              font-size: 13px; font-weight: 600; cursor: pointer;
              transition: all 0.18s ease;
            }
            .qcc-modal-btn:disabled { opacity: 0.6; cursor: not-allowed; }
            .qcc-modal-cancel { background: #f5f7fa; color: #4a5263; }
            .qcc-modal-cancel:hover { background: #eceff4; }
            .qcc-modal-ok {
              background: linear-gradient(135deg, #12b76a 0%, #0e9f5c 100%);
              color: #fff; box-shadow: 0 2px 8px rgba(18, 183, 106, 0.28);
            }
            .qcc-modal-ok:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 4px 14px rgba(18, 183, 106, 0.4);
            }
          </style>

          <div class="panel-header" id="panelHeader">
            <div class="panel-title">
              <span class="icon">🎬</span>
              <span>国开学习</span>
              <span style="font-size:10px;opacity:0.75;font-weight:400;margin-left:2px;">v2.0 正式版</span>
            </div>
            <div class="panel-controls">
              <button class="ctrl-btn minimize" id="btnMinimize" title="最小化"><span>—</span></button>
              <button class="ctrl-btn close" id="btnClose" title="关闭"><span>×</span></button>
            </div>
          </div>

          <div class="panel-body" id="panelBody">
            <div class="config-section">
              <div class="config-title"><span>⚙️</span><span>参数设置</span></div>
              <div class="config-row">
                <span class="config-label">视频倍速</span>
                <div class="speed-selector" id="speedSelector">
                  <button class="speed-btn" data-speed="1">1x</button>
                  <button class="speed-btn" data-speed="1.5">1.5x</button>
                  <button class="speed-btn active" data-speed="2">2x</button>
                  <button class="speed-btn" data-speed="3">3x</button>
                  <button class="speed-btn" data-speed="4">4x</button>
                </div>
              </div>
              <div class="config-row">
                <span class="config-label">自动播放</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="autoPlayCheck" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="config-row">
                <span class="config-label">静音播放</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="muteVideoCheck" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="config-row config-row-block">
                <div class="config-row-head">
                  <span class="config-label">学习间隔</span>
                  <span class="interval-value" id="intervalValue">0秒</span>
                </div>
                <input id="activityIntervalRange" type="range" min="0" max="6" step="1" value="0" class="interval-range" disabled>
                <div class="range-labels disabled" id="intervalLabels">
                  <span data-idx="0">0s</span><span data-idx="1">3s</span><span data-idx="2">5s</span>
                  <span data-idx="3">10s</span><span data-idx="4">30s</span><span data-idx="5">1m</span>
                  <span data-idx="6">2m</span>
                </div>
              </div>
            </div>

            <div class="log-section">
              <div class="log-header">
                <div class="log-title"><span>📋</span><span>运行日志</span></div>
                <span class="log-clear" id="btnClearLog">清空</span>
              </div>
              <div class="log-option-row">
                <span class="log-option-label">重复刷课</span>
                <label class="toggle-switch">
                  <input type="checkbox" id="repeatLearnedCheck" disabled>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="progress-bar" id="progressBar"><div class="progress-fill" id="progressFill"></div></div>
              <div class="log-container" id="logContainer"></div>
            </div>
          </div>

          <div class="panel-footer">
            <div class="btn-group">
              <button class="start-btn" id="startBtn"><span>🚀</span><span>开始</span></button>
              <button class="pause-btn" id="pauseBtn" disabled><span>⏸</span><span>暂停</span></button>
              <button class="restart-btn" id="restartBtn" disabled><span>🔄</span><span>重新开始</span></button>
            </div>
            <button class="donate-btn" id="donateBtn"><span>❤️</span><span>捐赠</span></button>
          </div>

          <div class="qcc-modal-mask" id="donateModalMask">
            <div class="qcc-modal">
              <div class="qcc-modal-header">
                <span class="qcc-modal-icon">❤️</span>
                <span class="qcc-modal-title">感谢支持</span>
              </div>
              <div class="qcc-modal-body">
                <p>如果这个脚本帮到了你，欢迎捐赠支持作者～</p>
                <div class="qcc-modal-contact">
                  <span class="qcc-modal-tip">联系方式：</span>
                  <span class="qcc-modal-qq">QQ：3365137745</span>
                </div>
                <div class="qcc-modal-input-wrap">
                  <input type="text" id="authCodeInput" class="qcc-modal-input"
                         placeholder="请输入授权码" autocomplete="off" spellcheck="false">
                  <div class="qcc-modal-input-tip" id="authCodeTip"></div>
                </div>
              </div>
              <div class="qcc-modal-footer">
                <button class="qcc-modal-btn qcc-modal-cancel" id="donateModalCancel">取消</button>
                <button class="qcc-modal-btn qcc-modal-ok" id="donateModalOk">确认</button>
              </div>
            </div>
          </div>

          <div class="qcc-modal-mask" id="repeatModalMask">
            <div class="qcc-modal">
              <div class="qcc-modal-header">
                <span class="qcc-modal-icon">⚠️</span>
                <span class="qcc-modal-title">开启重复刷课？</span>
              </div>
              <div class="qcc-modal-body">
                <p>重复刷课会将【已学过的活动】全部重新执行一遍：</p>
                <ul>
                  <li>视频会重新播放</li>
                  <li>学习记录会重复上报</li>
                </ul>
                <p class="qcc-modal-tip">确定要开启吗？</p>
              </div>
              <div class="qcc-modal-footer">
                <button class="qcc-modal-btn qcc-modal-cancel" id="repeatModalCancel">取消</button>
                <button class="qcc-modal-btn qcc-modal-ok" id="repeatModalOk">确定</button>
              </div>
            </div>
          </div>
        </div>
      `;
      this.init();
    }

    init() {
      const wrapper = document.querySelector(".wrapper") || document.body;
      wrapper.insertAdjacentHTML('beforeend', this.panelHtml);

      this.panel = document.getElementById("autoLearnPanel");
      this.panelHeader = document.getElementById("panelHeader");
      this.panelBody = document.getElementById("panelBody");
      this.logContainer = document.getElementById("logContainer");
      this.startBtn = document.getElementById("startBtn");
      this.pauseBtn = document.getElementById("pauseBtn");
      this.restartBtn = document.getElementById("restartBtn");
      this.speedSelector = document.getElementById("speedSelector");
      this.autoPlayCheck = document.getElementById("autoPlayCheck");
      this.muteVideoCheck = document.getElementById("muteVideoCheck");
      this.btnClose = document.getElementById("btnClose");
      this.btnMinimize = document.getElementById("btnMinimize");
      this.btnClearLog = document.getElementById("btnClearLog");
      this.progressFill = document.getElementById("progressFill");
      this.activityIntervalRange = document.getElementById("activityIntervalRange");
      this.intervalValue = document.getElementById("intervalValue");
      this.intervalLabels = document.querySelectorAll("#intervalLabels span");
      this.repeatLearnedCheck = document.getElementById("repeatLearnedCheck");
      this.donateBtn = document.getElementById("donateBtn");
      this.donateModalMask = document.getElementById("donateModalMask");
      this.donateModalOk = document.getElementById("donateModalOk");
      this.donateModalCancel = document.getElementById("donateModalCancel");
      this.repeatModalMask = document.getElementById("repeatModalMask");
      this.repeatModalOk = document.getElementById("repeatModalOk");
      this.repeatModalCancel = document.getElementById("repeatModalCancel");
      this.authCodeInput = document.getElementById("authCodeInput");
      this.authCodeTip = document.getElementById("authCodeTip");

      this.bindEvents();
    }

    setRunningState(running, paused = false) {
      if (running) {
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.restartBtn.disabled = false;
        this.pauseBtn.innerHTML = paused ? '<span>▶</span><span>继续</span>' : '<span>⏸</span><span>暂停</span>';
      } else {
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.restartBtn.disabled = true;
        this.pauseBtn.innerHTML = '<span>⏸</span><span>暂停</span>';
      }
    }

    showRepeatModal() { this.repeatModalMask.classList.add('show'); }
    hideRepeatModal() { this.repeatModalMask.classList.remove('show'); }

    unlockAll() {
      CONFIG.unlocked = true;
      this.activityIntervalRange.disabled = false;
      this.intervalLabels.forEach(s => s.classList.remove('disabled'));
      this.repeatLearnedCheck.disabled = false;
      this.donateBtn.innerHTML = '<span>✅</span><span>已解锁</span>';
      this.log('🔓 已解锁：学习间隔 / 重复刷课', 'success');
    }

    bindEvents() {
      this.btnClose.addEventListener('click', () => {
        this.panel.style.transform = 'translateX(120%)';
        setTimeout(() => { this.panel.style.display = 'none'; }, 300);
      });

      this.btnMinimize.addEventListener('click', () => {
        this.panelBody.style.display = this.panelBody.style.display === 'none' ? 'flex' : 'none';
        this.panel.style.height = this.panelBody.style.display === 'none' ? '56px' : 'auto';
      });

      this.btnClearLog.addEventListener('click', () => { this.logContainer.innerHTML = ''; });

      let isDragging = false, offsetX, offsetY;
      this.panelHeader.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('ctrl-btn')) return;
        isDragging = true;
        offsetX = e.clientX - this.panel.offsetLeft;
        offsetY = e.clientY - this.panel.offsetTop;
        this.panel.style.zIndex = '9999999999';
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = e.clientX - offsetX, y = e.clientY - offsetY;
        this.panel.style.left = Math.max(0, Math.min(window.innerWidth - this.panel.offsetWidth, x)) + 'px';
        this.panel.style.top = Math.max(0, Math.min(window.innerHeight - this.panel.offsetHeight, y)) + 'px';
        this.panel.style.right = 'auto';
      });
      document.addEventListener('mouseup', () => { isDragging = false; });

      this.speedSelector.addEventListener('click', (e) => {
        const target = e.target.closest('.speed-btn');
        if (!target) return;
        const speed = parseFloat(target.dataset.speed);
        CONFIG.videoSpeed = speed;
        this.speedSelector.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');
        this.log(`倍速已设置为 ${speed}x`, 'info');
      });

      this.autoPlayCheck.addEventListener('change', (e) => {
        CONFIG.autoPlayVideo = e.target.checked;
        this.log(`自动播放: ${CONFIG.autoPlayVideo ? '开启' : '关闭'}`, 'info');
      });

      this.muteVideoCheck.addEventListener('change', (e) => {
        CONFIG.muteVideo = e.target.checked;
        this.log(`静音播放: ${CONFIG.muteVideo ? '开启' : '关闭'}`, 'info');
      });

      // ============== 卡密通验证 ==============
      const resetDonateModal = () => {
        if (this.authCodeInput) this.authCodeInput.value = '';
        if (this.authCodeTip) {
          this.authCodeTip.textContent = '';
          this.authCodeTip.classList.remove('show');
        }
        if (this.authCodeInput) this.authCodeInput.classList.remove('is-error');
      };

      const showAuthError = (msg) => {
        if (!this.authCodeInput || !this.authCodeTip) return;
        this.authCodeInput.classList.add('is-error');
        this.authCodeTip.textContent = msg;
        this.authCodeTip.classList.add('show');
      };

      const tryUnlock = async () => {
        if (!this.authCodeInput) return;
        const code = (this.authCodeInput.value || '').trim();
        if (!code) { showAuthError('请输入授权码'); return; }

        this.donateModalOk.disabled = true;
        this.donateModalOk.textContent = '验证中...';

        const sw = await fetchCardSwitch();
        if (sw === 'CARD_OFF') {
          this.donateModalOk.disabled = false;
          this.donateModalOk.textContent = '确认';
          this.donateModalMask.classList.remove('show');
          resetDonateModal();
          this.unlockAll();
          this.log('🔓 卡密验证已关闭，直接放行', 'success');
          return;
        }

        const mac = getMachineId();
        const biz = await verifyCard(code, mac);

        this.donateModalOk.disabled = false;
        this.donateModalOk.textContent = '确认';

        if (!biz) {
          showAuthError('验证失败：签名错误或网络异常');
          return;
        }

        if (biz.startsWith('ok|')) {
          const info = parseRemain(biz);
          currentCard = code;
          currentMac = mac;
          GM_setValue(AUTH_CACHE_KEY, { card: code, mac, ts: Date.now() });

          this.donateModalMask.classList.remove('show');
          resetDonateModal();
          this.unlockAll();

          if (info) {
            this.log(`✅ 验证成功 · 剩余 ${info.days}天 ${info.minutes}分钟`, 'success');
          } else {
            this.log('✅ 验证成功（终身有效）', 'success');
          }

          startHeartbeat(this);
        } else if (biz.startsWith('error|')) {
          showAuthError(`验证失败：${biz.split('|')[1]}`);
        } else {
          showAuthError(`验证失败：${biz}`);
        }
      };

      this.donateBtn.addEventListener('click', () => {
        if (CONFIG.unlocked) {
          this.log('已解锁，无需重复捐赠 ❤️', 'info');
          return;
        }
        resetDonateModal();
        this.donateModalMask.classList.add('show');
        setTimeout(() => this.authCodeInput?.focus(), 100);
      });

      this.donateModalCancel.addEventListener('click', () => {
        this.donateModalMask.classList.remove('show');
        resetDonateModal();
      });

      this.donateModalOk.addEventListener('click', () => { tryUnlock(); });

      this.authCodeInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); tryUnlock(); }
      });

      this.authCodeInput?.addEventListener('input', () => {
        this.authCodeInput.classList.remove('is-error');
        this.authCodeTip?.classList.remove('show');
      });

      this.donateModalMask.addEventListener('click', (e) => {
        if (e.target === this.donateModalMask) {
          this.donateModalMask.classList.remove('show');
          resetDonateModal();
        }
      });

      // ============== 重复刷课开关 ==============
      this.repeatLearnedCheck.checked = CONFIG.repeatLearned;
      this.repeatLearnedCheck.disabled = true;
      CONFIG.repeatLearned = false;

      this.repeatLearnedCheck.addEventListener('change', (e) => {
        if (!CONFIG.unlocked) return;
        if (e.target.checked) {
          e.target.checked = false;
          this.showRepeatModal();
        } else {
          CONFIG.repeatLearned = false;
          this.log('重复刷课: 关闭', 'info');
        }
      });

      this.repeatModalCancel.addEventListener('click', () => {
        this.hideRepeatModal();
        this.log('重复刷课: 已取消开启', 'warning');
      });

      this.repeatModalOk.addEventListener('click', () => {
        this.hideRepeatModal();
        this.repeatLearnedCheck.checked = true;
        CONFIG.repeatLearned = true;
        this.log('重复刷课: 开启', 'info');
      });

      this.repeatModalMask.addEventListener('click', (e) => {
        if (e.target === this.repeatModalMask) {
          this.hideRepeatModal();
          this.log('重复刷课: 已取消开启', 'warning');
        }
      });

      // ============== 学习间隔 ==============
      const updateIntervalUI = () => {
        const idx = parseInt(this.activityIntervalRange.value, 10) || 0;
        const step = ACTIVITY_INTERVAL_STEPS[idx];
        CONFIG.activityInterval = step.sec;
        this.intervalValue.textContent = step.label;
        this.intervalLabels.forEach(s => {
          s.classList.toggle('active', parseInt(s.dataset.idx, 10) === idx);
        });
      };

      this.activityIntervalRange.value = 0;
      this.activityIntervalRange.disabled = true;
      this.intervalLabels.forEach(s => s.classList.add('disabled'));

      this.activityIntervalRange.addEventListener('input', () => {
        if (!CONFIG.unlocked) return;
        updateIntervalUI();
      });

      this.intervalLabels.forEach(span => {
        span.addEventListener('click', () => {
          if (!CONFIG.unlocked) return;
          this.activityIntervalRange.value = span.dataset.idx;
          updateIntervalUI();
        });
      });

      updateIntervalUI();
    }

    log(message, type = 'info') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const icons = { info: 'ℹ️', success: '✓', warning: '⚠️', error: '✗' };
      const item = document.createElement('div');
      item.className = `log-item ${type}`;
      item.innerHTML = `<span class="timestamp">${timeStr}</span><span class="status-icon">${icons[type] || '📝'}</span>${message}`;
      this.logContainer.appendChild(item);
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    setProgress(percent) {
      this.progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }

    onStart(callback) {
      this.startBtn.addEventListener('click', () => {
        callback();
        this.startBtn.innerHTML = '<span>⏳</span><span>刷课中</span>';
        this.setRunningState(true, false);
      });
    }

    onPause(callback) { this.pauseBtn.addEventListener('click', () => callback()); }
    onRestart(callback) { this.restartBtn.addEventListener('click', () => callback()); }
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const randomDelay = () => {
    const ms = Math.floor(Math.random() * (CONFIG.randomDelayMax - CONFIG.randomDelayMin)) + CONFIG.randomDelayMin;
    return delay(ms);
  };

  function findNextButton() {
    try {
      const $btn = $('button, a').filter((i, el) => {
        const text = $(el).text().trim().replace(/\s+/g, '');
        return text === '下一个' || text === '下一个>';
      });
      if ($btn.length > 0) return $btn[0];
    } catch (e) {}
    const allButtons = document.querySelectorAll('button, a, [role="button"], [class*="next"]');
    for (const btn of allButtons) {
      const text = (btn.textContent || '').trim().replace(/\s+/g, '');
      if (text === '下一个' || text === '下一个>' || /下一个/.test(text)) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return btn;
      }
    }
    try {
      const xpath = '//*[contains(text(), "下一个") and (self::button or self::a or self::div or self::span)]';
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) {
        const node = result.singleNodeValue;
        const rect = node.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return node;
      }
    } catch (e) {}
    return null;
  }

  function goNext(panel) {
    const btn = findNextButton();
    if (!btn) {
      if (panel) panel.log('⚠️ 未找到"下一个"按钮', 'warning');
      return false;
    }
    if (panel) panel.log(`➡️ 点击下一个...`, 'info');
    try { btn.click(); } catch (e) {
      const event = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
      btn.dispatchEvent(event);
    }
    return true;
  }

  class CourseAutoLearn {
    constructor(courseId) {
      this.courseId = courseId;
      this.panel = new LogPanel();
      this.isRunning = false;
      this.isPaused = false;
      this.totalActivities = 0;
      this.completedActivities = 0;
    }

    async waitIfPaused() {
      while (this.isPaused && this.isRunning) await delay(300);
    }

    pause() {
      if (!this.isRunning || this.isPaused) return;
      this.isPaused = true;
      this.panel.setRunningState(true, true);
      this.panel.log('⏸ 已暂停，点击"继续"恢复', 'warning');
    }

    resume() {
      if (!this.isRunning || !this.isPaused) return;
      this.isPaused = false;
      this.panel.setRunningState(true, false);
      this.panel.log('▶ 已恢复运行', 'info');
    }

    restart() {
      this.panel.log('🔄 正在重新开始…', 'warning');
      this.isRunning = false;
      this.isPaused = false;
      setTimeout(() => {
        this.completedActivities = 0;
        this.totalActivities = 0;
        this.panel.setProgress(0);
        this.panel.startBtn.innerHTML = '<span>⏳</span><span>刷课中</span>';
        this.panel.setRunningState(true, false);
        this.start();
      }, 400);
    }

    async start() {
      this.isRunning = true;
      this.isPaused = false;
      this.completedActivities = 0;
      this.totalActivities = 0;

      this.panel.log('===== 智能刷课开始 =====', 'info');
      this.panel.log(`当前配置: 倍速=${CONFIG.videoSpeed}x, 自动播放=${CONFIG.autoPlayVideo ? '开启' : '关闭'}, 自动下一个=${CONFIG.autoNext ? '开启' : '关闭'}, 重复学习=${CONFIG.repeatLearned ? '开启' : '关闭'}, 学习间隔=${CONFIG.activityInterval}秒(视频除外)`, 'info');
      this.panel.setProgress(0);

      try {
        await this.processCourse();
      } catch (err) {
        this.panel.log(`执行出错: ${err.message}`, 'error');
        console.error(err);
      }

      this.panel.log('===== 刷课完成 =====', 'success');
      this.panel.setProgress(100);
      this.isRunning = false;
      this.isPaused = false;
      this.panel.setRunningState(false);
      this.panel.startBtn.innerHTML = '<span>🚀</span><span>开始</span>';

      if (CONFIG.autoNext) {
        this.panel.log(`⏳ ${CONFIG.nextDelay / 1000}秒后切换到下一个任务...`, 'info');
        setTimeout(() => {
          const success = goNext(this.panel);
          if (success) this.panel.log('✅ 已切换到下一个任务，请等待页面加载...', 'success');
          else this.panel.log('⚠️ 无法自动切换，请手动点击"下一个"', 'warning');
        }, CONFIG.nextDelay);
      }
    }

    async processCourse() {
      const courseId = this.courseId;
      const completenessData = await this.getCompleteness(courseId);
      const startProgress = completenessData?.study_completeness || 0;
      this.panel.log(`当前课程进度: ${startProgress}%`, 'info');

      const modulesData = await this.getModules(courseId);
      const modules = modulesData?.modules || [];
      this.panel.log(`课程共 ${modules.length} 个模块`, 'info');

      const completedActivities = completenessData?.completed_result?.completed?.learning_activity || [];
      this.totalActivities = modules.reduce((sum, m) => sum + (m.activities_count || 0), 0) || modules.length * 3;

      for (const module of modules) {
        if (!this.isRunning) break;
        await this.waitIfPaused();
        await randomDelay();
        this.panel.log(`━━━━ ${module.name} ━━━━`, 'info');

        const activitiesData = await this.getModuleActivities(courseId, module.id);
        const activities = activitiesData?.learning_activities || [];

        for (const activity of activities) {
          if (!this.isRunning) break;
          await this.waitIfPaused();

          const { title, id, type } = activity;
          const isCompleted = completedActivities.includes(parseInt(id));

          if (isCompleted && !CONFIG.repeatLearned) {
            this.panel.log(`[跳过] ${title} (${notificationTypes[type] || type})`, 'warning');
            this.completedActivities++;
            this.updateProgress();
            continue;
          }

          this.panel.log(
            isCompleted
              ? `[已学过·重刷] ${title} (${notificationTypes[type] || type})`
              : `开始处理: ${title}`,
            'info'
          );

          try {
            await this.handleActivity(activity, isCompleted && CONFIG.repeatLearned);
            this.panel.log(`✅ 完成: ${title}`, 'success');
          } catch (err) {
            this.panel.log(`❌ 失败: ${title} - ${err.message}`, 'error');
          }

          this.completedActivities++;
          this.updateProgress();

          if (type !== 'online_video' && CONFIG.activityInterval > 0) {
            this.panel.log(`⏱️ 学习间隔等待 ${CONFIG.activityInterval} 秒...`, 'info');
            await delay(CONFIG.activityInterval * 1000);
          }
          await randomDelay();
        }
      }

      const endProgress = (await this.getCompleteness(courseId))?.study_completeness || 0;
      this.panel.log(`🎉 刷课完成! 进度: ${startProgress}% → ${endProgress}%`, 'success');
    }

    updateProgress() {
      if (this.totalActivities > 0) {
        const percent = (this.completedActivities / this.totalActivities) * 100;
        this.panel.setProgress(percent);
      }
    }

    async handleActivity(activity, isRepeat = false) {
      const { id, title, type, is_open, uploads, syllabus_id } = activity;

      if (isRepeat && REPEAT_SKIP_TYPES.includes(type)) {
        this.panel.log(`ℹ️ 重刷模式：跳过${notificationTypes[type] || type} (${title})`, 'info');
        return;
      }

      await API.postLearningActiVities(id, type, is_open, title);
      await delay(500);

      switch (type) {
        case 'page': await API.postActivitiesRead(id); break;
        case 'online_video': await this.handleVideoActivity(id, title, uploads, syllabus_id); break;
        case 'material':
          for (const upload of (uploads || [])) {
            await API.postActivitiesRead(id, { upload_id: upload.id });
          }
          break;
        case 'forum': {
          const categoryData = await API.getCategoryId(id);
          const categoryId = categoryData?.topic_category?.id;
          if (categoryId) await API.postForum(categoryId);
          else this.panel.log(`⚠️ 讨论区未获取到 category_id: ${title}`, 'warning');
          break;
        }
        case 'web_link': await API.postActivitiesRead(id); break;
        default: this.panel.log(`⚠️ 不支持的活动类型: ${type}`, 'warning');
      }
    }

    async handleVideoActivity(activityId, title, uploads, syllabusId) {
      const panel = this.panel;
      const videoUploads = Array.isArray(uploads) ? uploads : [];
      let actualDuration = 300;

      panel.log(`📋 开始处理视频: ${title}`, 'info');
      await API.postLearningActiVities(activityId, 'online_video', true, title);
      await API.postActivitiesRead(activityId);

      if (CONFIG.autoPlayVideo) {
        const video = await VideoPlayer.waitForVideo();

        // 修法 2：识别"已播完的旧视频"，视为未找到
        const isStaleVideo = video && video.duration > 0
          && video.currentTime >= video.duration * 0.98;
        const usableVideo = (video && !isStaleVideo) ? video : null;

        if (usableVideo) {
          usableVideo.playbackRate = CONFIG.videoSpeed;
          usableVideo.muted = CONFIG.muteVideo;
          try {
            await usableVideo.play();
            actualDuration = usableVideo.duration || 300;
            panel.log(`🎬 视频播放中, 时长: ${Math.round(actualDuration)}秒, 倍速: ${CONFIG.videoSpeed}x, ${CONFIG.muteVideo ? '已静音' : '有声'}`, 'info');

            const maxWaitMs = Math.min(120000, Math.max(actualDuration * 1000 / CONFIG.videoSpeed, 15000));
            const startTime = Date.now();
            let lastProgressReport = 0;
            let playedSuccessfully = false;

            while (Date.now() - startTime < maxWaitMs) {
              if (!this.isRunning) {
                try { usableVideo.pause(); } catch (e) {}
                return;
              }
              await this.waitIfPaused();

              if (usableVideo.ended || usableVideo.currentTime >= (usableVideo.duration || actualDuration) * 0.95) {
                playedSuccessfully = true;
                break;
              }

              const current = usableVideo.currentTime || 0;
              const total = usableVideo.duration || actualDuration;
              const progress = total > 0 ? Math.round((current / total) * 100) : 0;

              if (progress >= lastProgressReport + 20) {
                panel.log(`   播放进度: ${progress}% (${Math.round(current)}/${Math.round(total)}秒)`, 'info');
                lastProgressReport = progress;
              }

              await new Promise(resolve => setTimeout(resolve, 3000 / CONFIG.videoSpeed));

              if (usableVideo.paused && !usableVideo.ended && usableVideo.currentTime < (usableVideo.duration || actualDuration) * 0.95) {
                try { await usableVideo.play(); } catch (e) {}
              }
            }

            if (playedSuccessfully) {
              panel.log(`✅ 视频播放完成`, 'success');
              actualDuration = Math.max(usableVideo.duration || actualDuration, usableVideo.currentTime || actualDuration);
            } else {
              panel.log(`⏱️ 播放超时，强制结束 (已播放 ${Math.round(usableVideo.currentTime || 0)}秒)`, 'warning');
              actualDuration = Math.max(usableVideo.currentTime || actualDuration, actualDuration * 0.95);
            }
          } catch (err) {
            panel.log(`📺 视频播放失败: ${err.message}`, 'error');
            try { actualDuration = usableVideo.duration || 300; } catch (e) { actualDuration = 300; }
          }
        } else {
          if (isStaleVideo) {
            panel.log(`📺 检测到的是已播完的旧视频，使用元数据时长`, 'warning');
          } else {
            panel.log('📺 未找到视频元素，使用元数据时长', 'warning');
          }
          if (videoUploads[0]?.videos?.[0]?.duration) actualDuration = videoUploads[0].videos[0].duration;
        }
      } else {
        if (videoUploads[0]?.videos?.[0]?.duration) actualDuration = videoUploads[0].videos[0].duration;
        panel.log(`📺 跳过自动播放，使用时长: ${actualDuration}秒`, 'info');
      }

      if (!this.isRunning) return;

      for (const upload of videoUploads) {
        for (const videoInfo of upload.videos || []) {
          const duration = videoInfo.duration || actualDuration;
          await API.addVideoLearningRecords({
            syllabus_id: syllabusId,
            activity_id: activityId,
            upload_id: upload.id,
            start_at: 0,
            end_at: Math.round(duration)
          });
          await API.postActivitiesRead(activityId, { start: 0, end: Math.round(duration) });
        }
      }

      panel.log(`📊 已报告观看进度: 0 - ${Math.round(actualDuration)}秒`, 'success');
    }

    getCompleteness(courseId) {
      return new Promise((resolve, reject) => {
        $.get(`https://lms.ouchn.cn/api/course/${courseId}/my-completeness`)
          .done((data) => resolve(data))
          .fail((xhr, status, err) => reject(new Error(`my-completeness 请求失败: ${status || err}`)));
      });
    }

    getModules(courseId) {
      return new Promise((resolve, reject) => {
        $.get(`https://lms.ouchn.cn/api/courses/${courseId}/modules`)
          .done((data) => resolve(data))
          .fail((xhr, status, err) => reject(new Error(`modules 请求失败: ${status || err}`)));
      });
    }

    getModuleActivities(courseId, moduleId) {
      return new Promise((resolve, reject) => {
        $.get(`https://lms.ouchn.cn/api/course/${courseId}/all-activities?module_ids=[${moduleId}]&activity_types=learning_activities,exams,classrooms`)
          .done((data) => resolve(data))
          .fail((xhr, status, err) => reject(new Error(`all-activities 请求失败: ${status || err}`)));
      });
    }
  }

  let currentCourseId = null;
  let currentAutoLearn = null;

  function cleanupOldPanel() {
    const oldPanel = document.getElementById('autoLearnPanel');
    if (oldPanel) oldPanel.remove();
  }

  function init() {
    cleanupOldPanel();

    const courseIdInput = document.querySelector("#courseId");
    if (!courseIdInput) { setTimeout(init, 2000); return; }
    const courseId = courseIdInput.value;
    if (!courseId) { setTimeout(init, 2000); return; }

    if (currentCourseId === courseId && currentAutoLearn && document.getElementById('autoLearnPanel')) {
      return;
    }

    currentCourseId = courseId;
    currentAutoLearn = new CourseAutoLearn(courseId);

    currentAutoLearn.panel.log(`🎓 课程ID: ${courseId}`, 'info');
    currentAutoLearn.panel.log(`💡 点击"开始"按钮开始自动学习；首次使用请点"捐赠"`, 'info');

    currentAutoLearn.panel.onStart(() => { currentAutoLearn.start(); });
    currentAutoLearn.panel.onPause(() => {
      if (currentAutoLearn.isPaused) currentAutoLearn.resume();
      else currentAutoLearn.pause();
    });
    currentAutoLearn.panel.onRestart(() => { currentAutoLearn.restart(); });

    // ============ 立即 + 多次延迟尝试解锁 ============
    tryUnlockFromCache('immediate');
    setTimeout(() => tryUnlockFromCache('delay-500ms'), 500);
    setTimeout(() => tryUnlockFromCache('delay-3s'), 3000);

    // ============ init 后检测补解锁（防止面板重建） ============
    setTimeout(() => {
      try {
        const cached = GM_getValue(AUTH_CACHE_KEY, null);
        if (cached && cached.card && cached.mac) {
          const btn = document.getElementById('donateBtn');
          if (btn && !btn.innerHTML.includes('已解锁')) {
            console.log('[刷课] init 后检测到未解锁，重新解锁');
            currentCard = cached.card;
            currentMac = cached.mac;
            CONFIG.unlocked = true;
            btn.innerHTML = '<span>✅</span><span>已解锁</span>';
            const range = document.getElementById('activityIntervalRange');
            if (range) range.disabled = false;
            const labels = document.querySelectorAll('#intervalLabels span');
            labels.forEach(s => s.classList.remove('disabled'));
            const repeat = document.getElementById('repeatLearnedCheck');
            if (repeat) repeat.disabled = false;
            if (currentAutoLearn?.panel?.log) {
              currentAutoLearn.panel.log('✅ 已用缓存卡密自动解锁（面板重建后恢复）', 'success');
            }
            if (typeof startHeartbeat === 'function' && currentAutoLearn?.panel) {
              startHeartbeat(currentAutoLearn.panel);
            }
          }
        }
      } catch (e) {
        console.error('[刷课] init 后自动解锁失败:', e);
      }
    }, 300);
  }

  // ============================================================
  // 全局守护：每 1.5 秒检查面板是否被重建后忘记解锁
  // ============================================================
  setInterval(() => {
    try {
      const btn = document.getElementById('donateBtn');
      if (!btn) return;
      if (btn.innerHTML.includes('已解锁')) return;

      const cached = GM_getValue(AUTH_CACHE_KEY, null);
      if (!cached || !cached.card || !cached.mac) return;

      console.log('[刷课-守护] 检测到未解锁面板，自动解锁');
      currentCard = cached.card;
      currentMac = cached.mac;
      CONFIG.unlocked = true;
      btn.innerHTML = '<span>✅</span><span>已解锁</span>';

      const range = document.getElementById('activityIntervalRange');
      if (range) range.disabled = false;
      const labels = document.querySelectorAll('#intervalLabels span');
      labels.forEach(s => s.classList.remove('disabled'));
      const repeat = document.getElementById('repeatLearnedCheck');
      if (repeat) repeat.disabled = false;

      if (currentAutoLearn?.panel?.log) {
        currentAutoLearn.panel.log('✅ 已用缓存卡密自动解锁（守护进程）', 'success');
      }
      if (typeof startHeartbeat === 'function' && currentAutoLearn?.panel) {
        startHeartbeat(currentAutoLearn.panel);
      }
    } catch (e) {
      console.error('[刷课-守护] 报错:', e);
    }
  }, 1500);

  let lastUrl = location.href;

  function handleUrlChange(newUrl) {
    console.log(`[刷课脚本] 页面变化: ${lastUrl} -> ${newUrl}`);
    lastUrl = newUrl;
    setTimeout(init, 1500);
  }

  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    if (location.href !== lastUrl) handleUrlChange(location.href);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    if (location.href !== lastUrl) handleUrlChange(location.href);
  };

  window.addEventListener('popstate', () => {
    if (location.href !== lastUrl) handleUrlChange(location.href);
  });

  setInterval(() => {
    if (location.href !== lastUrl) { handleUrlChange(location.href); return; }

    const courseIdInput = document.querySelector("#courseId");
    const liveCourseId = courseIdInput?.value;
    if (liveCourseId && currentCourseId && liveCourseId !== currentCourseId) {
      setTimeout(init, 1500);
      return;
    }
    if (!document.getElementById('autoLearnPanel') && liveCourseId) {
      init();
    }
  }, 2000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();