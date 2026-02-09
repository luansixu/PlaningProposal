// js/ui.js：DOM UI 与弹窗（必须全部在 #game-container 内）

const UI = (function () {
  const self = {};

  const _els = {};
  let _modal = null;

  function $(id) {
    return document.getElementById(id);
  }

  function _wireBasic() {
    _els.statGold = $('stat-gold');
    _els.statHappiness = $('stat-happiness');
    _els.statSoul = $('stat-soul');
    _els.statRound = $('stat-round');
    _els.hudRenderMode = $('hud-render-mode');
    _els.hudThreeRev = $('hud-three-rev');

    _els.viewMenu = $('view-menu');
    _els.viewGame = $('view-game');
    _els.viewResult = $('view-result');

    _els.btnStart = $('btn-start');
    _els.btnAchievements = $('btn-achievements');
    _els.btnUpgrade = $('btn-upgrade');

    _els.btnBackMenu = $('btn-back-menu');

    _els.contractSummary = $('contract-summary');
    _els.contractWarning = $('contract-warning');

    _els.btnGenOffer = $('btn-generate-offer');
    _els.btnFull = $('btn-fulltext');
    _els.btnNegotiate = $('btn-negotiate');
    _els.btnRelic = $('btn-relic');
    _els.btnAccept = $('btn-accept');
    _els.btnReject = $('btn-reject');

    _els.negLeft = $('neg-left');
    _els.systemLog = $('system-log');
    _els.history = $('history');
    _els.btnWorkbench = $('btn-llm-workbench');

    _els.resultTitle = $('result-title');
    _els.resultDesc = $('result-desc');
  }

  function _setEnabled(el, enabled) {
    if (!el) return;
    el.disabled = !enabled;
    el.classList.toggle('disabled', !enabled);
  }

  function _closeModal() {
    const root = $('modal-root');
    if (!root) return;
    root.innerHTML = '';
    _modal = null;
  }

  function _openModal(title, bodyEl, actions) {
    const root = $('modal-root');
    if (!root) return;
    root.innerHTML = '';

    const mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.addEventListener('click', function (e) {
      if (e.target === mask) _closeModal();
    });

    const modal = document.createElement('div');
    modal.className = 'modal';

    const head = document.createElement('div');
    head.className = 'modal-head';
    const t = document.createElement('div');
    t.className = 'modal-title';
    t.textContent = title;
    const sp = document.createElement('div');
    sp.className = 'spacer';
    const x = document.createElement('button');
    x.className = 'btn';
    x.textContent = '关闭';
    x.addEventListener('click', _closeModal);
    head.appendChild(t);
    head.appendChild(sp);
    head.appendChild(x);

    const body = document.createElement('div');
    body.className = 'modal-body';
    body.appendChild(bodyEl);

    const foot = document.createElement('div');
    foot.className = 'modal-foot';
    (actions || []).forEach((a) => foot.appendChild(a));

    modal.appendChild(head);
    modal.appendChild(body);
    modal.appendChild(foot);
    mask.appendChild(modal);
    root.appendChild(mask);
    _modal = mask;
  }

  function _mkBtn(text, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (cls ? ' ' + cls : '');
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  self.init = function () {
    _wireBasic();
  };

  self.bindMenu = function (handlers) {
    _els.btnStart.addEventListener('click', handlers.onStart);
    _els.btnAchievements.addEventListener('click', handlers.onAchievements);
    _els.btnBackMenu.addEventListener('click', handlers.onBackMenu);
    _els.btnWorkbench.addEventListener('click', handlers.onOpenWorkbench);
  };

  self.bindGameButtons = function (handlers) {
    _els.btnGenOffer.addEventListener('click', handlers.onGenerateOffer);
    _els.btnFull.addEventListener('click', handlers.onOpenFullText);
    _els.btnNegotiate.addEventListener('click', handlers.onOpenNegotiate);
    _els.btnRelic.addEventListener('click', handlers.onRelic);
    _els.btnAccept.addEventListener('click', handlers.onAccept);
    _els.btnReject.addEventListener('click', handlers.onReject);
  };

  self.setTopStats = function (st) {
    _els.statGold.textContent = String(st.gold);
    _els.statHappiness.textContent = String(st.happiness);
    _els.statSoul.textContent = String(st.soul);
    _els.statRound.textContent = String(st.round);
  };

  self.setRenderHud = function (mode, threeRev) {
    _els.hudRenderMode.textContent = mode || '-';
    _els.hudThreeRev.textContent = threeRev || '-';
  };

  self.showView = function (name) {
    _els.viewMenu.classList.toggle('hidden', name !== 'menu');
    _els.viewGame.classList.toggle('hidden', name !== 'game');
    _els.viewResult.classList.toggle('hidden', name !== 'result');
  };

  self.setSystemLog = function (text) {
    _els.systemLog.textContent = text || '';
  };

  self.setOfferSummary = function (summary, warningText) {
    _els.contractSummary.textContent = summary || '';
    const showWarn = !!warningText;
    _els.contractWarning.classList.toggle('hidden', !showWarn);
    if (showWarn) _els.contractWarning.textContent = warningText;
  };

  self.setButtonsState = function (s) {
    _setEnabled(_els.btnFull, !!s.canOpenFull);
    _setEnabled(_els.btnNegotiate, !!s.canNegotiate);
    _setEnabled(_els.btnRelic, !!s.canRelic);
    _setEnabled(_els.btnAccept, !!s.canAccept);
    _setEnabled(_els.btnReject, !!s.canReject);
    _setEnabled(_els.btnGenOffer, !!s.canGenerateOffer);
    _els.negLeft.textContent = String(s.negotiateLeft != null ? s.negotiateLeft : 0);
  };

  self.setHistory = function (items) {
    if (!items || items.length === 0) {
      _els.history.textContent = '（原型：最多 1 条）';
      _els.history.classList.add('placeholder');
      return;
    }
    _els.history.classList.remove('placeholder');
    _els.history.innerHTML = '';
    items.forEach((it, idx) => {
      const box = document.createElement('div');
      box.style.padding = '8px';
      box.style.borderRadius = '12px';
      box.style.border = '1px solid rgba(148, 163, 184, 0.16)';
      box.style.background = 'rgba(2, 6, 23, 0.35)';
      box.style.marginBottom = '8px';
      box.innerHTML = `<div style="font-weight:900;margin-bottom:4px;">第 ${idx + 1} 份契约</div><div style="color:rgba(226,232,240,0.86);line-height:1.45;white-space:pre-wrap;">${Utils.escapeHtml(
        it.summary || ''
      )}</div>`;
      _els.history.appendChild(box);
    });
  };

  self.showResult = function (title, desc) {
    _els.resultTitle.textContent = title;
    _els.resultDesc.textContent = desc;
  };

  // ===== 弹窗：全文 =====
  self.openFullTextModal = function (bundle, onQuotePick) {
    const body = document.createElement('div');
    const paragraphs = (bundle && bundle.text_index && bundle.text_index.paragraphs) || [];
    if (paragraphs.length === 0) {
      body.textContent = '（无全文索引）';
    } else {
      paragraphs.forEach((p) => {
        const pTitle = document.createElement('div');
        pTitle.style.margin = '10px 0 6px 0';
        pTitle.style.fontWeight = '900';
        pTitle.style.opacity = '0.9';
        pTitle.textContent = `段落 P${p.p}`;
        body.appendChild(pTitle);

        (p.sentences || []).forEach((s) => {
          const row = document.createElement('div');
          row.className = 'sentence';

          const ref = document.createElement('div');
          ref.className = 'ref';
          ref.textContent = `P${p.p}-S${s.s}`;

          const text = document.createElement('div');
          text.className = 'text';
          text.textContent = s.text;

          const pick = document.createElement('div');
          pick.className = 'pick';
          const btn = _mkBtn('引用', 'primary', function () {
            onQuotePick && onQuotePick({ p: p.p, s: s.s, text: s.text });
            _closeModal();
          });
          pick.appendChild(btn);

          row.appendChild(ref);
          row.appendChild(text);
          row.appendChild(pick);
          body.appendChild(row);
        });
      });
    }

    _openModal('契约全文（分段分句，可引用）', body, []);
  };

  // ===== 弹窗：法宝 =====
  self.openRelicModal = function (loopholeCount) {
    const body = document.createElement('div');
    body.style.lineHeight = '1.6';
    body.innerHTML = `<div style="font-weight:900;margin-bottom:6px;">法宝提醒</div>
<div>本契约存在 <span style="color:rgba(251,191,36,0.95);font-weight:900;">${loopholeCount}</span> 处漏洞/错误。</div>
<div style="color:rgba(226,232,240,0.72);font-size:12px;margin-top:8px;">（原型规则：法宝不会指出具体位置，请阅读全文并引用句子谈判）</div>`;
    _openModal('法宝', body, []);
  };

  // ===== 弹窗：谈判 =====
  self.openNegotiateModal = function (quote, conversationLog, onSend) {
    const body = document.createElement('div');
    body.className = 'grid-2';

    const left = document.createElement('div');
    const right = document.createElement('div');

    const fQuote = document.createElement('div');
    fQuote.className = 'field';
    const qLabel = document.createElement('label');
    qLabel.textContent = '引用片段（只读，可为空）';
    const qText = document.createElement('textarea');
    qText.readOnly = true;
    qText.value = quote ? `P${quote.p}-S${quote.s}\\n${quote.text}` : '';
    qText.style.minHeight = '120px';
    fQuote.appendChild(qLabel);
    fQuote.appendChild(qText);

    const fExplain = document.createElement('div');
    fExplain.className = 'field';
    const eLabel = document.createElement('label');
    eLabel.textContent = '我的解释（指出问题点；layer2 关键）';
    const eText = document.createElement('textarea');
    eText.maxLength = CONFIG.UI.maxTextAreaChars;
    eText.placeholder = '例：这里把“需要时”的范围无限扩大，触发条件不清晰，属于定义模糊……';
    fExplain.appendChild(eLabel);
    fExplain.appendChild(eText);

    const fCounter = document.createElement('div');
    fCounter.className = 'field';
    const cLabel = document.createElement('label');
    cLabel.textContent = '我的反提案（让魔鬼改写条款）';
    const cText = document.createElement('textarea');
    cText.maxLength = CONFIG.UI.maxTextAreaChars;
    cText.placeholder = '例：把触发条件限定为“每回合结束一次”，并把上限封顶……';
    fCounter.appendChild(cLabel);
    fCounter.appendChild(cText);

    left.appendChild(fQuote);
    left.appendChild(fExplain);
    right.appendChild(fCounter);

    // 对话记录（只读）：满足策划案“谈判弹窗显示对话记录”
    const fLog = document.createElement('div');
    fLog.className = 'field';
    const lLabel = document.createElement('label');
    lLabel.textContent = '对话记录（只读）';
    const lText = document.createElement('textarea');
    lText.readOnly = true;
    lText.className = 'mono';
    const logs = Array.isArray(conversationLog) ? conversationLog : [];
    lText.value =
      logs.length === 0
        ? '（暂无对话记录）'
        : logs
            .map((x) => {
              const role = x.role || 'unknown';
              const c = x.content || '';
              return `[${role}] ${c}`;
            })
            .join('\n\n');
    lText.style.minHeight = '200px';
    fLog.appendChild(lLabel);
    fLog.appendChild(lText);
    right.appendChild(fLog);

    body.appendChild(left);
    body.appendChild(right);

    const btnSend = _mkBtn('发送谈判（生成提示词）', 'primary', function () {
      onSend &&
        onSend({
          quote: quote,
          explain: eText.value || '',
          counter: cText.value || ''
        });
      _closeModal();
    });

    _openModal('谈判', body, [btnSend]);
  };

  // ===== 弹窗：LLM 工作台（复制提示词 / 粘贴 JSON） =====
  self.openWorkbenchModal = function (data, handlers) {
    const body = document.createElement('div');

    const fPrompt = document.createElement('div');
    fPrompt.className = 'field';
    const pLabel = document.createElement('label');
    pLabel.textContent = '提示词（复制到任意大模型；要求只输出 1 个 JSON）';
    const pText = document.createElement('textarea');
    pText.className = 'mono';
    pText.readOnly = true;
    pText.value = data.prompt || '';
    pText.style.minHeight = '220px';
    fPrompt.appendChild(pLabel);
    fPrompt.appendChild(pText);

    const fPaste = document.createElement('div');
    fPaste.className = 'field';
    const oLabel = document.createElement('label');
    oLabel.textContent = '粘贴模型输出 JSON（禁止 Markdown / 解释 / 前后缀）';
    const oText = document.createElement('textarea');
    oText.className = 'mono';
    oText.placeholder = '{ ... }';
    oText.maxLength = CONFIG.UI.maxJsonPasteChars;
    oText.style.minHeight = '220px';
    fPaste.appendChild(oLabel);
    fPaste.appendChild(oText);

    const fErr = document.createElement('div');
    fErr.style.marginTop = '10px';
    fErr.style.color = 'rgba(253, 230, 138, 0.95)';
    fErr.style.whiteSpace = 'pre-wrap';
    fErr.style.display = data.errorText ? 'block' : 'none';
    fErr.textContent = data.errorText || '';

    body.appendChild(fPrompt);
    body.appendChild(fPaste);
    body.appendChild(fErr);

    const btnCopy = _mkBtn('复制提示词', '', async function () {
      try {
        await navigator.clipboard.writeText(pText.value);
        Logger && Logger.info && Logger.info('已复制提示词。');
      } catch (e) {
        Logger && Logger.warn && Logger.warn('复制失败，请手动复制。', e);
        pText.focus();
        pText.select();
      }
    });

    const btnSubmit = _mkBtn('提交 JSON', 'primary', function () {
      handlers && handlers.onSubmit && handlers.onSubmit(oText.value || '');
    });

    const btnRepair = _mkBtn('生成修复提示词', '', function () {
      handlers && handlers.onNeedRepair && handlers.onNeedRepair(oText.value || '');
    });

    const btnFallback = _mkBtn('使用降级模板', '', function () {
      handlers && handlers.onUseFallback && handlers.onUseFallback();
    });
    if (!handlers || !handlers.onUseFallback) btnFallback.disabled = true;

    _openModal(data.title || 'LLM 工作台', body, [btnCopy, btnRepair, btnFallback, btnSubmit]);
  };

  // ===== 弹窗：模型设置（简化版：用户只需填 API Key） =====
  self.openModelSettingsModal = function (current, onSave, onTest) {
    var body = document.createElement('div');
    body.style.maxWidth = '520px';

    // ---- 输入样式辅助 ----
    function _inputStyle(el) {
      el.style.borderRadius = '12px';
      el.style.border = '1px solid rgba(148, 163, 184, 0.22)';
      el.style.background = 'rgba(2, 6, 23, 0.55)';
      el.style.color = 'rgba(226, 232, 240, 0.95)';
      el.style.padding = '12px';
      el.style.boxSizing = 'border-box';
      el.style.width = '100%';
      el.style.fontSize = '14px';
    }

    // ======== 主区域：API Key ========
    var fKey = document.createElement('div');
    fKey.className = 'field';
    var kLabel = document.createElement('label');
    kLabel.textContent = 'API Key（仅存本机浏览器，不上传/不提交仓库）';
    kLabel.style.fontWeight = '900';
    kLabel.style.fontSize = '14px';
    var kInput = document.createElement('input');
    kInput.type = 'password';
    kInput.value = current.apiKey || '';
    kInput.placeholder = 'Gemini Key 以 AIza 开头（从 aistudio.google.com/apikey 获取）';
    _inputStyle(kInput);
    kInput.style.fontSize = '16px';
    kInput.style.padding = '14px';
    fKey.appendChild(kLabel);
    fKey.appendChild(kInput);
    body.appendChild(fKey);

    // ======== 一键测试按钮 + 结果区 ========
    var testRow = document.createElement('div');
    testRow.style.display = 'flex';
    testRow.style.gap = '10px';
    testRow.style.marginTop = '12px';
    testRow.style.alignItems = 'center';

    var btnTest = document.createElement('button');
    btnTest.type = 'button';
    btnTest.className = 'btn primary';
    btnTest.textContent = '一键测试';
    btnTest.style.minWidth = '120px';
    btnTest.style.fontWeight = '900';

    var testStatus = document.createElement('span');
    testStatus.style.fontSize = '13px';
    testStatus.style.opacity = '0.85';
    testStatus.textContent = '';
    testRow.appendChild(btnTest);
    testRow.appendChild(testStatus);
    body.appendChild(testRow);

    // 测试结果详情区
    var resultBox = document.createElement('div');
    resultBox.style.marginTop = '12px';
    resultBox.style.padding = '12px';
    resultBox.style.borderRadius = '12px';
    resultBox.style.border = '1px solid rgba(148, 163, 184, 0.16)';
    resultBox.style.background = 'rgba(2, 6, 23, 0.55)';
    resultBox.style.display = 'none';
    resultBox.style.maxHeight = '300px';
    resultBox.style.overflowY = 'auto';
    resultBox.style.fontSize = '13px';
    resultBox.style.lineHeight = '1.65';
    body.appendChild(resultBox);

    function _renderResults(diagResult) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = '';
      var steps = diagResult.steps || [];
      for (var i = 0; i < steps.length; i++) {
        var st = steps[i];
        var icon = st.ok === true ? '✓' : st.ok === false ? '✗' : '—';
        var color = st.ok === true ? 'rgba(74,222,128,0.95)' : st.ok === false ? 'rgba(248,113,113,0.95)' : 'rgba(148,163,184,0.7)';
        var row = document.createElement('div');
        row.style.marginBottom = '10px';

        var head = document.createElement('div');
        head.style.fontWeight = '900';
        head.style.color = color;
        head.innerHTML = '<span style="margin-right:6px;">[' + (i + 1) + '/' + steps.length + ']</span>' +
          icon + ' ' + Utils.escapeHtml(st.name);
        row.appendChild(head);

        if (st.detail) {
          var det = document.createElement('div');
          det.style.whiteSpace = 'pre-wrap';
          det.style.wordBreak = 'break-word';
          det.style.opacity = '0.88';
          det.style.marginLeft = '20px';
          det.textContent = st.detail;
          row.appendChild(det);
        }
        if (st.hint) {
          var hint = document.createElement('div');
          hint.style.whiteSpace = 'pre-wrap';
          hint.style.wordBreak = 'break-word';
          hint.style.marginLeft = '20px';
          hint.style.marginTop = '4px';
          hint.style.color = 'rgba(253,230,138,0.92)';
          hint.textContent = st.hint;
          row.appendChild(hint);
        }
        resultBox.appendChild(row);
      }
      // 总结
      var sumRow = document.createElement('div');
      sumRow.style.fontWeight = '900';
      sumRow.style.marginTop = '8px';
      sumRow.style.borderTop = '1px solid rgba(148,163,184,0.16)';
      sumRow.style.paddingTop = '8px';
      var allOk = steps.every(function (x) { return x.ok === true; });
      sumRow.style.color = allOk ? 'rgba(74,222,128,0.95)' : 'rgba(248,113,113,0.95)';
      sumRow.textContent = diagResult.summary || '';
      resultBox.appendChild(sumRow);
    }

    function _getSettings() {
      return {
        provider: psSelect.value,
        baseUrl: baseInput.value.trim() || 'https://generativelanguage.googleapis.com/v1beta',
        model: modelInput.value.trim() || 'gemini-2.0-flash',
        apiKey: kInput.value.trim()
      };
    }

    btnTest.addEventListener('click', async function () {
      btnTest.disabled = true;
      testStatus.textContent = '正在测试（请稍候）...';
      resultBox.style.display = 'none';
      try {
        var s = _getSettings();
        // 保存一次，确保 callStage 也用这套设置
        onSave && onSave(s);
        var diag = await onTest(s);
        _renderResults(diag);
        var allOk = (diag.steps || []).every(function (x) { return x.ok === true; });
        testStatus.textContent = allOk ? '✓ 全部通过' : '✗ 部分失败（见下方详情）';
        testStatus.style.color = allOk ? 'rgba(74,222,128,0.95)' : 'rgba(248,113,113,0.95)';
      } catch (e) {
        testStatus.textContent = '测试异常: ' + (e.message || e);
        testStatus.style.color = 'rgba(248,113,113,0.95)';
      }
      btnTest.disabled = false;
    });

    // ======== 高级设置（折叠） ========
    var advToggle = document.createElement('div');
    advToggle.style.marginTop = '16px';
    advToggle.style.cursor = 'pointer';
    advToggle.style.userSelect = 'none';
    advToggle.style.fontSize = '13px';
    advToggle.style.opacity = '0.72';
    advToggle.textContent = '▶ 高级设置（Provider / API Base / Model）';

    var advPanel = document.createElement('div');
    advPanel.style.display = 'none';
    advPanel.style.marginTop = '10px';
    advPanel.style.padding = '12px';
    advPanel.style.borderRadius = '12px';
    advPanel.style.border = '1px solid rgba(148, 163, 184, 0.14)';
    advPanel.style.background = 'rgba(2, 6, 23, 0.35)';

    advToggle.addEventListener('click', function () {
      var open = advPanel.style.display !== 'none';
      advPanel.style.display = open ? 'none' : 'block';
      advToggle.textContent = (open ? '▶' : '▼') + ' 高级设置（Provider / API Base / Model）';
    });

    // Provider select
    var fProv = document.createElement('div');
    fProv.className = 'field';
    var pLbl = document.createElement('label');
    pLbl.textContent = 'Provider';
    var psSelect = document.createElement('select');
    _inputStyle(psSelect);
    var opts = [
      { v: 'gemini', t: 'Google Gemini（直连，推荐 Clash 用户）' },
      { v: 'local_proxy', t: '本地代理（proxy.py，Key 不进前端）' },
      { v: 'openai_compatible', t: 'OpenAI Compatible' }
    ];
    for (var oi = 0; oi < opts.length; oi++) {
      var o = document.createElement('option');
      o.value = opts[oi].v;
      o.textContent = opts[oi].t;
      psSelect.appendChild(o);
    }
    psSelect.value = current.provider || 'gemini';
    fProv.appendChild(pLbl);
    fProv.appendChild(psSelect);
    advPanel.appendChild(fProv);

    // Base
    var fBase = document.createElement('div');
    fBase.className = 'field';
    var bLbl = document.createElement('label');
    bLbl.textContent = 'API Base';
    var baseInput = document.createElement('input');
    baseInput.type = 'text';
    baseInput.value = current.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    _inputStyle(baseInput);
    fBase.appendChild(bLbl);
    fBase.appendChild(baseInput);
    advPanel.appendChild(fBase);

    // Model
    var fModel = document.createElement('div');
    fModel.className = 'field';
    var mLbl = document.createElement('label');
    mLbl.textContent = 'Model';
    var modelInput = document.createElement('input');
    modelInput.type = 'text';
    modelInput.value = current.model || 'gemini-2.0-flash';
    _inputStyle(modelInput);
    fModel.appendChild(mLbl);
    fModel.appendChild(modelInput);
    advPanel.appendChild(fModel);

    // Provider 切换自动填充
    var _providerDefaults = {
      gemini: { base: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash' },
      local_proxy: { base: 'http://127.0.0.1:8787', model: 'gemini-2.0-flash' },
      openai_compatible: { base: 'https://api.openai.com/v1', model: 'gpt-4.1-mini' }
    };
    psSelect.addEventListener('change', function () {
      var d = _providerDefaults[psSelect.value] || _providerDefaults.gemini;
      var curBase = baseInput.value.trim();
      var isOtherDefault = false;
      for (var pk in _providerDefaults) {
        if (pk !== psSelect.value && _providerDefaults[pk].base === curBase) isOtherDefault = true;
      }
      if (!curBase || isOtherDefault) baseInput.value = d.base;
    });

    // 提示
    var advNote = document.createElement('div');
    advNote.style.marginTop = '8px';
    advNote.style.fontSize = '12px';
    advNote.style.opacity = '0.65';
    advNote.style.lineHeight = '1.5';
    advNote.textContent = '通常不需要修改高级设置。Gemini 直连适合使用 Clash/V2Ray 等系统代理的用户。本地代理适合不想让 Key 进入前端的场景。';
    advPanel.appendChild(advNote);

    body.appendChild(advToggle);
    body.appendChild(advPanel);

    // ======== 底部操作 ========
    var btnSave = _mkBtn('保存并关闭', 'primary', function () {
      var s = _getSettings();
      onSave && onSave(s);
      _closeModal();
    });

    _openModal('模型设置', body, [btnSave]);
  };

  // ===== 弹窗：事件 =====
  self.openEventModal = function (eventObj, onPick) {
    const body = document.createElement('div');
    body.style.lineHeight = '1.6';
    body.innerHTML = `<div style="white-space:pre-wrap;">${Utils.escapeHtml(eventObj.event.event_text)}</div>`;

    const actions = [];
    (eventObj.event.choices || []).forEach((c) => {
      actions.push(
        _mkBtn(c.id + '：' + c.choice_text, c.id === 'A' ? 'primary' : '', function () {
          onPick && onPick(c);
          _closeModal();
        })
      );
    });

    _openModal('事件（between_rounds）', body, actions);
  };

  // ===== 弹窗：结算明细 =====
  self.openSettlementModal = function (htmlText, onContinue) {
    const body = document.createElement('div');
    body.style.lineHeight = '1.6';
    body.innerHTML = htmlText;
    const btn = _mkBtn('继续', 'primary', function () {
      onContinue && onContinue();
      _closeModal();
    });
    _openModal('结算', body, [btn]);
  };

  self.closeModal = _closeModal;

  return self;
})();

