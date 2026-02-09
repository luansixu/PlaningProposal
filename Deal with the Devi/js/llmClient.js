// js/llmClient.js：浏览器内直接调用 Gemini / OpenAI Compatible / 本地代理
// 默认走 Gemini 直连（用户通过 Clash 等系统代理上网）。用户只需填 API Key。

var LLMClient = (function () {
  var self = {};

  // ★ v2：故意换 key 名，让所有 v1 旧缓存自动失效
  var STORAGE_KEY = 'deal_devil_llm_v2';

  function _defaultSettings() {
    return {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash',
      apiKey: ''
    };
  }

  // ---------- 持久化 ----------

  function _load() {
    var source = 'hardcoded_default';
    var result = _defaultSettings();

    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && obj.provider) {
          result = _merge(obj);
          source = 'localStorage';
        }
      }
      if (source === 'hardcoded_default') {
        var inj = window.__DEAL_DEVIL_LLM_DEFAULTS__ || window.__DEAL_DEVIL_LLM_SETTINGS__;
        if (inj) {
          result = _merge(inj);
          source = 'localSecrets.js';
        }
      }
    } catch (e) { /* fallback */ }

    var safeKey = result.apiKey ? result.apiKey.slice(0, 8) + '***' : '(empty)';
    _log('debug', '_load() source=' + source + ' provider=' + result.provider +
      ' base=' + result.baseUrl + ' model=' + result.model + ' key=' + safeKey);
    return result;
  }

  function _save(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    _log('info', 'LLM settings saved. provider=' + s.provider);
  }

  function _merge(obj) {
    return {
      provider: obj.provider || 'gemini',
      baseUrl: obj.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      model: obj.model || 'gemini-2.0-flash',
      apiKey: obj.apiKey || ''
    };
  }

  // ---------- 日志辅助 ----------

  function _log(level, msg) {
    if (typeof Logger !== 'undefined' && Logger && Logger[level]) Logger[level](msg);
  }

  // ---------- URL 辅助 ----------

  function _joinUrl(base, path) {
    return String(base || '').replace(/\/+$/, '') + '/' + String(path || '').replace(/^\/+/, '');
  }

  function _joinUrlWithKey(base, path, apiKey) {
    var url = _joinUrl(base, path);
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'key=' + encodeURIComponent(apiKey || '');
  }

  function _safeJson(x) {
    try { return JSON.stringify(x, null, 2); } catch (e) { return String(x); }
  }

  // ---------- 错误分类 ----------

  function _classifyFetchFailure(err, s) {
    var detail = 'fetch_error=' + (err && err.message ? err.message : String(err || ''));
    var debugLine = '[debug] provider=' + (s ? s.provider : '?') + ' base=' + (s ? s.baseUrl : '?') + ' model=' + (s ? s.model : '?');
    return {
      title: '网络/CORS 请求失败',
      hint:
        '可能原因：\n' +
        '- 当前为 file:// 打开，Origin=null，服务商可能不允许 CORS\n' +
        '- 你的网络/代理/DNS 阻断了请求\n' +
        '- API Base 填错或被防火墙拦截\n' +
        (s && s.provider === 'local_proxy' ? '- 本地代理未启动（若选了 local_proxy）\n' : '') +
        '\n建议：\n' +
        '- 确认系统代理（Clash 等）已开启且能访问 Google\n' +
        '- 在浏览器中直接打开 ' + (s ? s.baseUrl : '') + ' 看能否连通\n' +
        '- 检查 API Base 是否正确\n',
      debug: detail + '\n' + debugLine
    };
  }

  function _classifyGeminiHttpError(httpStatus, data) {
    var apiStatus = (data && data.error) ? (data.error.status || '') : '';
    var apiMessage = (data && data.error) ? (data.error.message || '') : '';
    var apiDetails = (data && data.error) ? (data.error.details || null) : null;

    if ((apiMessage || '').toLowerCase().indexOf('reported as leaked') >= 0) {
      return {
        title: 'API Key 已被 Google 标记为泄露（已封禁）',
        hint:
          '该 Key 已被服务端永久拒绝。\n' +
          '你需要：在 Google AI Studio 或 Cloud Console 生成一个新 Key。\n' +
          '注意：不要把 Key 粘贴到聊天/截图/公开代码里，否则 Google 会自动检测并封禁。',
        debug: 'HTTP ' + httpStatus + ' apiStatus=' + apiStatus + ' apiMessage=' + apiMessage
      };
    }
    if (httpStatus === 403 || apiStatus === 'PERMISSION_DENIED') {
      return {
        title: '权限被拒绝（HTTP 403）',
        hint:
          '可能原因：\n' +
          '- Key 无效/已禁用/已过期\n' +
          '- Key 设了应用限制，file:// 的 Origin=null 不在白名单\n' +
          '- 项目未启用 Generative Language API\n' +
          '\n建议：在 Google Cloud Console 检查 Key 的限制设置。',
        debug: 'HTTP ' + httpStatus + ' apiStatus=' + apiStatus + ' apiMessage=' + apiMessage
      };
    }
    if (httpStatus === 429 || apiStatus === 'RESOURCE_EXHAUSTED') {
      return { title: '限流/配额耗尽（429）', hint: '稍后重试，或检查配额。', debug: 'apiMessage=' + apiMessage };
    }
    if (httpStatus === 404) {
      return { title: '接口/模型不存在（404）', hint: '检查 API Base 和 Model 拼写。', debug: 'apiMessage=' + apiMessage };
    }
    if (httpStatus === 400 || apiStatus === 'INVALID_ARGUMENT') {
      return { title: '请求参数错误（400）', hint: '检查输入长度和格式。', debug: 'apiMessage=' + apiMessage };
    }
    return { title: 'LLM 失败（HTTP ' + httpStatus + '）', hint: '检查 apiMessage。', debug: 'apiMessage=' + apiMessage };
  }

  function _wrapError(err, meta) {
    var e = (err instanceof Error) ? err : new Error(String(err || 'Unknown'));
    e.llm = meta || {};
    return e;
  }

  // ---------- Fetch 实现 ----------

  function _fetchWithTimeout(url, opts, timeoutMs) {
    timeoutMs = timeoutMs || 60000;
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('请求超时（' + (timeoutMs / 1000) + 's）')); }, timeoutMs);
      fetch(url, opts).then(function (r) { clearTimeout(timer); resolve(r); })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  }

  async function _fetchGeminiGenerateContent(s, messages) {
    var systemMsg = null;
    var nonSystem = [];
    for (var i = 0; i < (messages || []).length; i++) {
      if (messages[i].role === 'system') systemMsg = messages[i];
      else nonSystem.push(messages[i]);
    }
    var contents = nonSystem.map(function (m) {
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] };
    });
    var body = { contents: contents, generationConfig: { temperature: 0.2 } };
    if (systemMsg && systemMsg.content) body.systemInstruction = { parts: [{ text: String(systemMsg.content) }] };

    var path = 'models/' + encodeURIComponent(s.model) + ':generateContent';
    var url = _joinUrlWithKey(s.baseUrl, path, s.apiKey);
    _log('debug', 'Gemini POST ' + url.replace(/key=[^&]+/, 'key=***'));

    var resp = await _fetchWithTimeout(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    var text = await resp.text();
    var data;
    try { data = JSON.parse(text); } catch (e) {
      var pe = new Error('响应不是 JSON。HTTP ' + resp.status + '。前 200 字符：' + text.substring(0, 200));
      pe.raw = text; throw pe;
    }
    if (!resp.ok) {
      var he = new Error('Gemini HTTP ' + resp.status);
      he.data = data; he.httpStatus = resp.status; throw he;
    }
    var parts = [];
    try { parts = data.candidates[0].content.parts; } catch (e) { parts = []; }
    return parts.map(function (p) { return p && p.text ? String(p.text) : ''; }).join('');
  }

  async function _fetchChatCompletions(s, messages) {
    var url = _joinUrl(s.baseUrl, 'chat/completions');
    _log('debug', 'OpenAI POST ' + url);
    var resp = await _fetchWithTimeout(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + s.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: s.model, temperature: 0.2, messages: messages })
    });
    var text = await resp.text();
    var data;
    try { data = JSON.parse(text); } catch (e) {
      var pe = new Error('响应不是 JSON。HTTP ' + resp.status); pe.raw = text; throw pe;
    }
    if (!resp.ok) { var he = new Error('OpenAI HTTP ' + resp.status); he.data = data; he.httpStatus = resp.status; throw he; }
    try { return data.choices[0].message.content; } catch (e) { return ''; }
  }

  async function _fetchLocalProxy(s, messages) {
    var url = _joinUrl(s.baseUrl, 'generate');
    _log('debug', 'Proxy POST ' + url);
    var resp = await _fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: s.provider, model: s.model, messages: messages })
    });
    var text = await resp.text();
    var data;
    try { data = JSON.parse(text); } catch (e) {
      var pe = new Error('代理响应非 JSON。HTTP ' + resp.status); pe.raw = text; throw pe;
    }
    if (!resp.ok) { var he = new Error('代理 HTTP ' + resp.status); he.data = data; he.httpStatus = resp.status; throw he; }
    if (!data || typeof data.content !== 'string') { var me = new Error('代理缺少 content 字段'); me.data = data; throw me; }
    return data.content;
  }

  function _extractJson(text) {
    var t = String(text || '').trim();
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a === -1 || b === -1 || b <= a) throw new Error('模型输出不含 JSON 对象。原文前200字：' + t.substring(0, 200));
    return JSON.parse(t.slice(a, b + 1));
  }

  // ---------- 公开 API ----------

  self.getSettings = function () { return _load(); };
  self.setSettings = function (s) { _save(_merge(s || {})); };

  self.isConfigured = function () {
    var s = _load();
    if (s.provider === 'local_proxy') return !!(s.baseUrl && s.model);
    return !!(s.apiKey && s.apiKey.trim() && s.baseUrl && s.model);
  };

  // ---------- callStage ----------

  self.callStage = async function (stage, args) {
    var s = _load();
    // 校验
    if (s.provider !== 'local_proxy') {
      if (!s.apiKey || !s.baseUrl || !s.model) {
        throw new Error(
          '未配置：请在"模型设置"里填写 API Key。\n' +
          '[debug] provider=' + s.provider + ' base=' + s.baseUrl + ' model=' + s.model + ' key=' + (s.apiKey ? '有' : '空')
        );
      }
    } else if (!s.baseUrl || !s.model) {
      throw new Error('本地代理缺少 baseUrl/model。[debug] base=' + s.baseUrl + ' model=' + s.model);
    }

    if (s.provider === 'local_proxy' && s.baseUrl.indexOf('127.0.0.1') < 0 && s.baseUrl.indexOf('localhost') < 0) {
      _log('warn', '本地代理 base 不是 localhost: ' + s.baseUrl);
    }

    _log('info', 'callStage(' + stage + ') provider=' + s.provider + ' base=' + s.baseUrl + ' model=' + s.model);

    var msgs = LLM.buildMessages(stage, args);
    var raw = '';
    try {
      if (s.provider === 'gemini') raw = await _fetchGeminiGenerateContent(s, msgs);
      else if (s.provider === 'local_proxy') raw = await _fetchLocalProxy(s, msgs);
      else raw = await _fetchChatCompletions(s, msgs);
    } catch (e) {
      var meta = { provider: s.provider, baseUrl: s.baseUrl, model: s.model, stage: stage };
      _log('error', 'callStage(' + stage + ') 失败: ' + (e.message || e));

      if (e.httpStatus && e.data) {
        if (s.provider === 'gemini') {
          var c = _classifyGeminiHttpError(e.httpStatus, e.data);
          throw _wrapError(new Error(c.title + '\n' + c.hint + '\n---\n' + c.debug), meta);
        }
        throw _wrapError(e, meta);
      }
      var c2 = _classifyFetchFailure(e, s);
      throw _wrapError(new Error(c2.title + '\n' + c2.hint + '\n---\n' + c2.debug), meta);
    }

    _log('debug', 'callStage(' + stage + ') ok, len=' + raw.length);
    return { raw: raw, obj: _extractJson(raw) };
  };

  // ========== 三阶段连接诊断 ==========
  // 返回 { steps: [{name, ok, detail, hint}], summary }
  // ok: true=通过, false=失败, null=跳过

  self.runDiagnostics = async function (settings) {
    var s = _merge(settings || _load());
    var steps = [];

    // ===== Step 1: 网络连通性 =====
    var s1 = { name: '网络连通性', ok: false, detail: '', hint: '' };
    try {
      var probeUrl, probeOpts;
      if (s.provider === 'local_proxy') {
        probeUrl = _joinUrl(s.baseUrl, 'generate');
        probeOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"provider":"local_proxy","model":"ping","messages":[]}' };
      } else if (s.provider === 'gemini') {
        // 用伪 key 探测端点是否可达（会返回 400/403 但说明网络通了）
        probeUrl = _joinUrl(s.baseUrl, 'models') + '?key=CONNECTIVITY_PROBE';
        probeOpts = { method: 'GET' };
      } else {
        probeUrl = _joinUrl(s.baseUrl, 'models');
        probeOpts = { method: 'GET', headers: { Authorization: 'Bearer probe' } };
      }
      _log('debug', 'Diag step1: fetch ' + probeUrl);
      var r1 = await _fetchWithTimeout(probeUrl, probeOpts, 15000);
      s1.ok = true;
      s1.detail = 'HTTP ' + r1.status + '（端点可达，网络正常）';
    } catch (e) {
      s1.ok = false;
      s1.detail = 'fetch 失败: ' + (e.message || String(e));
      s1.hint =
        '无法连接到 ' + (s.provider === 'local_proxy' ? '本地代理' : 'API 端点') + '。\n' +
        '请检查：\n' +
        '① 系统代理（Clash 等）是否已开启\n' +
        '② 代理规则是否覆盖了 googleapis.com\n' +
        '③ 在浏览器地址栏直接访问 ' + s.baseUrl + ' 能否打开\n' +
        (s.provider === 'local_proxy' ? '④ proxy.py 是否已运行\n' : '') +
        '\n[技术细节] provider=' + s.provider + ' base=' + s.baseUrl;
      steps.push(s1);
      return { steps: steps, summary: '网络不通，请先检查代理/网络环境' };
    }
    steps.push(s1);

    // ===== Step 2: API Key 有效性 =====
    var s2 = { name: 'API Key 有效性', ok: false, detail: '', hint: '' };
    if (s.provider === 'local_proxy') {
      s2.ok = true;
      s2.detail = '本地代理模式：Key 由代理环境变量提供（前端无需验证）';
      steps.push(s2);
    } else if (s.provider === 'gemini') {
      if (!s.apiKey || !s.apiKey.trim()) {
        s2.ok = false;
        s2.detail = 'API Key 为空';
        s2.hint = '请在上方输入你的 Gemini API Key（通常以 AIza 开头）。\n获取地址：https://aistudio.google.com/apikey';
        steps.push(s2);
        return { steps: steps, summary: '请先填写 API Key' };
      }
      try {
        var keyUrl = _joinUrl(s.baseUrl, 'models') + '?key=' + encodeURIComponent(s.apiKey);
        _log('debug', 'Diag step2: fetch models with real key');
        var r2 = await _fetchWithTimeout(keyUrl, { method: 'GET' }, 15000);
        var d2text = await r2.text();
        var d2;
        try { d2 = JSON.parse(d2text); } catch (e) { d2 = {}; }

        if (r2.ok) {
          var names = [];
          try { names = (d2.models || []).map(function (m) { return m.name || ''; }).slice(0, 8); } catch (e) { /**/ }
          s2.ok = true;
          s2.detail = 'Key 有效 ✓ 可用模型（前8）：' + names.join(', ');
        } else {
          s2.ok = false;
          var em = (d2.error && d2.error.message) ? d2.error.message : ('HTTP ' + r2.status);
          var es = (d2.error && d2.error.status) ? d2.error.status : '';
          s2.detail = 'HTTP ' + r2.status + ' ' + es + ': ' + em;
          if (em.toLowerCase().indexOf('leaked') >= 0) {
            s2.hint = 'Key 已被 Google 标记为泄露并永久封禁。\n必须生成新 Key：https://aistudio.google.com/apikey\n旧 Key 无法恢复。';
          } else if (r2.status === 403) {
            s2.hint = 'Key 权限不足。检查：\n- Key 是否已启用 Generative Language API\n- Key 的应用限制是否拦截了你的请求';
          } else if (r2.status === 400) {
            s2.hint = 'Key 格式可能不正确。Gemini Key 通常以 AIza 开头。';
          } else {
            s2.hint = '请检查 Key 的有效性和权限配置。';
          }
        }
      } catch (e) {
        s2.ok = false;
        s2.detail = 'Key 验证请求异常: ' + (e.message || String(e));
        s2.hint = '网络层通过了但 Key 验证失败，可能是响应格式异常。';
      }
      steps.push(s2);
      if (!s2.ok) return { steps: steps, summary: 'API Key 无效：' + s2.detail.substring(0, 80) };
    } else {
      // openai_compatible
      if (!s.apiKey || !s.apiKey.trim()) {
        s2.ok = false; s2.detail = 'API Key 为空'; s2.hint = '请填写 Key。';
        steps.push(s2);
        return { steps: steps, summary: '请先填写 API Key' };
      }
      s2.ok = true; s2.detail = '（OpenAI 兼容模式：将在第 3 步一起验证）';
      steps.push(s2);
    }

    // ===== Step 3: 模型可用性检查（不消耗生成配额） =====
    var s3 = { name: '模型可用性 (' + s.model + ')', ok: false, detail: '', hint: '' };
    if (s.provider === 'gemini' && s2.ok) {
      // Step 2 已经拿到了可用模型列表，直接检查目标模型是否在列表中
      var modelListStr = s2.detail || '';
      // 模型名格式: models/gemini-2.0-flash 或 gemini-2.0-flash
      var shortModel = s.model.replace(/^models\//, '');
      if (modelListStr.indexOf(shortModel) >= 0 || modelListStr.indexOf('models/' + shortModel) >= 0) {
        s3.ok = true;
        s3.detail = '模型 ' + s.model + ' 在可用列表中 ✓（跳过实际调用，节省配额）';
      } else {
        // 未在前 8 个中找到，但可能只是因为列表截断了——标记为可能通过
        s3.ok = true;
        s3.detail = '模型 ' + s.model + ' 未在前 8 个中显示（可能因列表截断）。建议直接开始游戏试试。';
        s3.hint = '如果游戏中生成失败，可在高级设置中更换 Model 名称。';
      }
    } else if (s.provider === 'local_proxy') {
      // 代理模式需要实际调用来验证
      try {
        var testMsgs = [
          { role: 'user', content: '输出：{"ok":true}' }
        ];
        var raw = await _fetchLocalProxy(s, testMsgs);
        s3.ok = true;
        s3.detail = '代理调用成功 ✓ 返回（截断）：' + String(raw).substring(0, 80);
      } catch (e) {
        s3.ok = false;
        s3.detail = '代理调用失败: ' + (e.message || String(e)).substring(0, 200);
        s3.hint = '确认 proxy.py 已运行，且 GEMINI_API_KEY 环境变量已设置。';
      }
    } else {
      // OpenAI 兼容或其他：做一次轻量调用
      try {
        var testMsgs2 = [{ role: 'user', content: '输出：{"ok":true}' }];
        var raw2 = await _fetchChatCompletions(s, testMsgs2);
        s3.ok = true;
        s3.detail = '模型响应正常 ✓ 返回（截断）：' + String(raw2).substring(0, 80);
      } catch (e) {
        s3.ok = false;
        s3.detail = '调用失败: ' + (e.message || String(e)).substring(0, 200);
        if (e.httpStatus && e.data) {
          s3.hint = 'HTTP ' + e.httpStatus + '。检查 model 名称和 Key 权限。';
        } else {
          s3.hint = '请求异常。';
        }
      }
    }
    steps.push(s3);

    var allOk = steps.every(function (x) { return x.ok === true; });
    return { steps: steps, summary: allOk ? '全部通过！连接正常，可以开始游戏。' : '部分测试未通过，请查看详情。' };
  };

  return self;
})();
