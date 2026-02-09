// js/main.js：魔鬼契约（原型 v0.1）主循环与状态机
// 约束：file:// 可运行、无模块、Three.js 受控例外、错误可见可复制、LLM 为核心闭环（自动调用 + 校验/修复/降级）

const Game = (function () {
  const self = {};

  const DESIGN_W = CONFIG.Screen.width;
  const DESIGN_H = CONFIG.Screen.height;

  const _dom = {
    container: null,
    canvas: null
  };

  const _state = {
    renderMode: 'canvas2d',
    threeRevision: '-',
    running: false,
    lastTs: 0,
    degradeReason: '',
    // game
    player: {
      gold: 0,
      happiness: 0,
      soul: 0
    },
    round: 1,
    devil: { tier: CONFIG.Game.devil.tier, name: CONFIG.Game.devil.name },
    negotiateLeft: CONFIG.Game.negotiateMaxTimes,
    // offer bundle
    offerBundle: null,
    defused: Object.create(null),
    history: [],
    // conversation
    conversationLog: [],
    // UI
    selectedQuote: null
  };

  const _r = {
    renderer: null,
    scene: null,
    camera: null,
    cube: null,
    ctx2d: null
  };

  function _supportsWebGL() {
    const testCanvas = document.createElement('canvas');
    const gl2 = testCanvas.getContext('webgl2');
    const gl1 = gl2 || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    return !!gl1;
  }

  function _pickRenderMode() {
    const wantsThree = CONFIG.Render.mode === 'three';
    const hasThree = typeof window.THREE !== 'undefined';
    const hasWebGL = _supportsWebGL();

    if (!wantsThree) {
      _state.degradeReason = 'CONFIG.Render.mode != three';
      return 'canvas2d';
    }
    if (!hasThree) {
      _state.degradeReason = 'window.THREE 缺失（three.min.js 未加载或加载失败）';
      return 'canvas2d';
    }
    if (!hasWebGL) {
      _state.degradeReason = 'WebGL 不可用（context 创建失败）';
      return 'canvas2d';
    }
    _state.degradeReason = '';
    return 'three';
  }

  function _applyCanvasDpiSize() {
    const rect = _dom.canvas.getBoundingClientRect();
    const dpr = Utils.clamp(window.devicePixelRatio || 1, 1, CONFIG.Render.maxPixelRatio);
    const pxW = Math.max(1, Math.floor(rect.width * dpr));
    const pxH = Math.max(1, Math.floor(rect.height * dpr));
    if (_dom.canvas.width !== pxW) _dom.canvas.width = pxW;
    if (_dom.canvas.height !== pxH) _dom.canvas.height = pxH;
  }

  function _threeInit() {
    _state.threeRevision = String(window.THREE && window.THREE.REVISION ? window.THREE.REVISION : '-');

    _r.renderer = new THREE.WebGLRenderer({ canvas: _dom.canvas, antialias: true, alpha: true });
    const dpr = Utils.clamp(window.devicePixelRatio || 1, 1, CONFIG.Render.maxPixelRatio);
    _r.renderer.setPixelRatio(dpr);

    _r.scene = new THREE.Scene();
    _r.camera = new THREE.PerspectiveCamera(60, DESIGN_W / DESIGN_H, 0.1, 100);
    _r.camera.position.z = 3;

    const light = new THREE.DirectionalLight(0xffffff, 0.9);
    light.position.set(1, 1, 1);
    _r.scene.add(light);
    _r.scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4f46e5 });
    _r.cube = new THREE.Mesh(geo, mat);
    _r.scene.add(_r.cube);

    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55 }));
    _r.cube.add(wire);

    _dom.canvas.addEventListener(
      'webglcontextlost',
      function (e) {
        e.preventDefault();
        Logger && Logger.error && Logger.error('webglcontextlost：渲染已暂停。');
        DebugOverlay && DebugOverlay.showError && DebugOverlay.showError('WebGL Context Lost', new Error('WebGL context lost'));
        _state.running = false;
      },
      false
    );
    _dom.canvas.addEventListener(
      'webglcontextrestored',
      function () {
        Logger && Logger.warn && Logger.warn('webglcontextrestored：建议刷新页面以完全恢复。');
        DebugOverlay && DebugOverlay.showError && DebugOverlay.showError('WebGL Context Restored', new Error('WebGL context restored (建议刷新以恢复)'));
      },
      false
    );
  }

  function _threeResize() {
    const rect = _dom.canvas.getBoundingClientRect();
    _r.renderer.setSize(rect.width, rect.height, false);
    _r.camera.aspect = rect.width / rect.height;
    _r.camera.updateProjectionMatrix();
  }

  function _canvas2dInit() {
    _state.threeRevision = typeof window.THREE !== 'undefined' ? String(window.THREE.REVISION || '-') : '-';
    _r.ctx2d = _dom.canvas.getContext('2d');
  }

  function _canvas2dResize() {
    _applyCanvasDpiSize();
  }

  function _threeRender(dt) {
    if (_r.cube) {
      _r.cube.rotation.x += dt * 0.7;
      _r.cube.rotation.y += dt * 0.9;
    }
    _r.renderer.render(_r.scene, _r.camera);
  }

  function _canvas2dRender(ts, dt) {
    const ctx = _r.ctx2d;
    if (!ctx) return;
    const w = _dom.canvas.width;
    const h = _dom.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, w, h);
    const t = (ts / 1000) * 0.9;
    const size = Math.floor(Math.min(w, h) * 0.18);
    const cx = Math.floor(w * 0.5);
    const cy = Math.floor(h * 0.5);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t);
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.lineWidth = Math.max(1, Math.floor(size * 0.06));
    ctx.strokeStyle = '#93C5FD';
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function _resize() {
    if (_state.renderMode === 'three') _threeResize();
    else _canvas2dResize();
  }

  function _loop(ts) {
    if (!_state.running) return;

    Input.beginFrame();

    const last = _state.lastTs || ts;
    let dt = Math.max(0, (ts - last) / 1000);
    dt = Math.min(dt, CONFIG.Debug.maxDt);
    _state.lastTs = ts;

    // 故障注入：用于验收 overlay（默认关闭）
    if (CONFIG.Debug.chaosMode) {
      const p = CONFIG.Debug.chaosChancePerSecond * dt;
      if (Utils.rand() < p) throw new Error('ChaosMode 注入错误：用于验收 DebugOverlay');
    }

    try {
      if (_state.renderMode === 'three') _threeRender(dt);
      else _canvas2dRender(ts, dt);
    } catch (err) {
      _state.running = false;
      Logger && Logger.error && Logger.error('渲染异常，已暂停：', err && err.message ? err.message : String(err));
      DebugOverlay && DebugOverlay.showError && DebugOverlay.showError('Render Crash', err);
      return;
    }

    requestAnimationFrame(_loop);
  }

  function _resetRun() {
    _state.player.gold = CONFIG.Game.initial.gold;
    _state.player.happiness = CONFIG.Game.initial.happiness;
    _state.player.soul = CONFIG.Game.initial.soul;
    _state.round = CONFIG.Game.initial.round;
    _state.negotiateLeft = CONFIG.Game.negotiateMaxTimes;
    _state.offerBundle = null;
    _state.defused = Object.create(null);
    _state.history = [];
    _state.conversationLog = [];
    _state.selectedQuote = null;
  }

  function _applyDeltas(d) {
    _state.player.gold = Math.max(0, Math.trunc(_state.player.gold + d.gold));
    _state.player.happiness = Utils.clamp(Math.trunc(_state.player.happiness + d.happiness), 0, 100);
    _state.player.soul = Utils.clamp(Math.trunc(_state.player.soul + d.soul), 0, 100);
    UI.setTopStats({ gold: _state.player.gold, happiness: _state.player.happiness, soul: _state.player.soul, round: _state.round });
  }

  function _getContextJson(stage) {
    const base = {
      game: { round: _state.round },
      player: { gold: _state.player.gold, happiness: _state.player.happiness, soul: _state.player.soul },
      devil: { tier: _state.devil.tier, name: _state.devil.name },
      rules: {
        min_accept_soul_cost: CONFIG.Game.minAcceptSoulCost,
        loophole_first_offer_count_range: CONFIG.Game.loopholeCountRange,
        deadly_probe_spawn_chance: CONFIG.Game.deadlyProbeSpawnChance
      }
    };

    if (stage === 'negotiate') {
      base.current_offer_bundle = _state.offerBundle
        ? {
            offer: _state.offerBundle.offer,
            text_index: _state.offerBundle.text_index,
            loopholes: _state.offerBundle.loopholes,
            deadly_probe: _state.offerBundle.deadly_probe
          }
        : null;
      base.conversation_log = _state.conversationLog;
    }

    if (stage === 'event_generate') base.event = { node: 'between_rounds' };

    return JSON.stringify(base, null, 2);
  }

  function _sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function _is429(e) {
    // 检测 429 限流错误（包含在 error message 或 llm meta 里）
    var msg = (e && e.message) ? e.message : '';
    return msg.indexOf('429') >= 0 || msg.indexOf('限流') >= 0 || msg.indexOf('配额') >= 0 ||
      msg.indexOf('RESOURCE_EXHAUSTED') >= 0 || msg.indexOf('Resource exhausted') >= 0;
  }

  async function _callStageWithRepair(stage, args) {
    // 自动调用 + 自动修复 JSON（最多 3 次）
    // 429 限流时自动等待指数退避（3s → 6s → 12s）再重试
    var lastRaw = '';
    var lastErrs = [];
    var MAX_ATTEMPTS = 3;
    var BACKOFF_BASE_MS = 3000; // 429 基础等待 3 秒

    for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        // 非首次尝试时短暂等待（避免连续请求触发限流）
        if (attempt > 0) {
          UI.setSystemLog('重试中（第 ' + (attempt + 1) + '/' + MAX_ATTEMPTS + ' 次）…');
          await _sleep(1000);
        }

        var r = await LLMClient.callStage(stage, args);
        lastRaw = r.raw;
        var errs = Validate.validateByStage(stage, r.obj);
        if (errs.length === 0) return r.obj;
        lastErrs = errs;
        Logger && Logger.warn && Logger.warn('validate 失败 attempt=' + attempt, errs.join('; '));

        // 走 repair_json（不改剧情，只修结构）
        await _sleep(500); // repair 前短暂等待
        var repaired = await LLMClient.callStage('repair_json', {
          badJson: lastRaw,
          validationErrors: errs.join('\n')
        });
        lastRaw = repaired.raw;
        var errs2 = Validate.validateByStage(stage, repaired.obj);
        if (errs2.length === 0) return repaired.obj;
        lastErrs = errs2;
      } catch (e) {
        var errMsg = (e && e.message) ? e.message : String(e);
        lastErrs = ['LLM 调用异常：' + errMsg];
        Logger && Logger.error && Logger.error('callStage(' + stage + ') attempt=' + attempt + ' error:', errMsg);

        // 429 限流：指数退避重试
        if (_is429(e) && attempt < MAX_ATTEMPTS - 1) {
          var waitMs = BACKOFF_BASE_MS * Math.pow(2, attempt); // 3s, 6s, 12s
          var waitSec = Math.round(waitMs / 1000);
          Logger && Logger.info && Logger.info('429 限流，等待 ' + waitSec + 's 后重试…');
          UI.setSystemLog('API 限流中，自动等待 ' + waitSec + ' 秒后重试（' + (attempt + 1) + '/' + MAX_ATTEMPTS + '）…');
          await _sleep(waitMs);
          continue; // 回到 for 循环顶部重试
        }

        // 非 429 或已用完重试次数：直接退出
        break;
      }
    }

    var err = new Error('stage 失败：' + stage + '\n' + lastErrs.join('\n'));
    err.validationErrors = lastErrs;
    err.raw = lastRaw;
    throw err;
  }

  function _onOfferGenerated(bundle) {
    _state.offerBundle = bundle;
    _state.history = [{ summary: bundle.offer.summary }];
    // (workbench 已移除，无需设置 retriesLeft)

    const warning = bundle.deadly_probe && bundle.deadly_probe.present ? bundle.deadly_probe.warning_text : '';
    UI.setOfferSummary(bundle.offer.summary, warning);
    UI.setHistory(_state.history);
    UI.setSystemLog(bundle.display_text || '契约已生成。');

    UI.setButtonsState({
      canGenerateOffer: false,
      canOpenFull: true,
      canNegotiate: _state.negotiateLeft > 0,
      canRelic: true,
      canAccept: true,
      canReject: true,
      negotiateLeft: _state.negotiateLeft
    });
  }

  function _computeKeywordScoreAndHits(text, detectKeywords, issueKeywords) {
    const t = String(text || '').toLowerCase();
    const hitDetect = (detectKeywords || []).filter((k) => k && t.indexOf(String(k).toLowerCase()) !== -1);
    const hitIssue = (issueKeywords || []).filter((k) => k && t.indexOf(String(k).toLowerCase()) !== -1);

    const detectHit = hitDetect.length;
    const issueHit = hitIssue.length;
    const keywordScore = Utils.clamp((detectHit > 0 ? 0.5 : 0) + (issueHit > 0 ? 0.5 : 0), 0, 1);
    return { detectHit, issueHit, keywordScore };
  }

  function _findLoopholeById(id) {
    const arr = (_state.offerBundle && _state.offerBundle.loopholes) || [];
    return arr.find((x) => x.id === id) || null;
  }

  function _onNegotiateResult(res) {
    const matchedId = res.loophole_check && res.loophole_check.matched_loophole_id ? res.loophole_check.matched_loophole_id : null;
    const semantic = res.loophole_check && res.loophole_check.confidence ? res.loophole_check.confidence.semantic_score : 0;
    let keywordScore = 0;
    let detectHit = 0;
    let issueHit = 0;

    // 开发端判定（按策划案 5.2）
    if (matchedId) {
      const lp = _findLoopholeById(matchedId);
      if (lp) {
        const playerText = (UI && UI._lastNegText) || ''; // 兜底：我们在调用前会保存
        const hits = _computeKeywordScoreAndHits(playerText, lp.player_detect_keywords, lp.player_issue_keywords);
        keywordScore = hits.keywordScore;
        detectHit = hits.detectHit;
        issueHit = hits.issueHit;
      }
    }

    const finalScore = Utils.clamp(0.4 * keywordScore + 0.6 * semantic, 0, 1);
    const layer1 = detectHit >= 1 || semantic >= 0.7;
    const layer2 = issueHit >= 1 && semantic >= 0.75;

    // 记录对话
    (_state.conversationLog = _state.conversationLog || []).push(
      ...(res.conversation_log_append || []).map((x) => ({
        role: x.role,
        content: x.content
      }))
    );

    // 更新摘要/全文/accept deltas（以 LLM updated_offer 为准）
    if (_state.offerBundle) {
      _state.offerBundle.offer.summary = res.updated_offer.summary;
      _state.offerBundle.offer.full_text = res.updated_offer.full_text;
      _state.offerBundle.offer.deltas_on_accept = res.updated_offer.deltas_on_accept;
    }

    // 若 layer2 成功，标记该漏洞已“化解”（用于结算时跳过）
    if (matchedId && layer2) _state.defused[matchedId] = true;

    const html =
      `<div style="font-weight:900;margin-bottom:8px;">谈判结果</div>` +
      `<div style="white-space:pre-wrap;margin-bottom:10px;">${Utils.escapeHtml(res.display_text || '')}</div>` +
      `<div class="small">开发端判定：keyword=${keywordScore.toFixed(2)} semantic=${semantic.toFixed(2)} final=${finalScore.toFixed(2)}</div>` +
      `<div class="small">layer1=${layer1 ? '✅' : '❌'} layer2=${layer2 ? '✅（魔鬼必须让步）' : '❌'}</div>` +
      (matchedId ? `<div class="small">matched_loophole_id=${Utils.escapeHtml(matchedId)}</div>` : `<div class="small">matched_loophole_id=null</div>`);

    UI.openSettlementModal(html, function () {
      UI.setOfferSummary(_state.offerBundle.offer.summary, _state.offerBundle.deadly_probe.present ? _state.offerBundle.deadly_probe.warning_text : '');
      UI.setHistory([{ summary: _state.offerBundle.offer.summary }]);
      UI.setButtonsState({
        canGenerateOffer: false,
        canOpenFull: true,
        canNegotiate: _state.negotiateLeft > 0,
        canRelic: true,
        canAccept: true,
        canReject: true,
        negotiateLeft: _state.negotiateLeft
      });
    });
  }

  function _onEventGenerated(ev) {
    UI.setSystemLog(ev.display_text || '事件已生成。');
    UI.openEventModal(ev, function (choice) {
      Logger && Logger.info && Logger.info('event choice:', choice.id);
      _applyDeltas(choice.deltas);
      _finishRun();
    });
  }

  function _finishRun() {
    const fail = _state.player.soul <= 0;
    if (fail) {
      UI.showResult('失败', '你的灵魂已被恶魔收走。\n\n最终资源：金币 ' + _state.player.gold + '，幸福 ' + _state.player.happiness + '，灵魂 ' + _state.player.soul);
    } else {
      UI.showResult(
        '胜利（原型版）',
        '你撑过了 1 回合。\n\n最终资源：金币 ' + _state.player.gold + '，幸福 ' + _state.player.happiness + '，灵魂 ' + _state.player.soul
      );
    }
    UI.showView('result');
  }

  function _settleContractAndProceed(accepted) {
    const b = _state.offerBundle;
    if (!b) return;

    const applied = [];
    if (accepted) {
      // 基础结算：至少 -minAcceptSoulCost 灵魂
      const minCost = Math.trunc(b.offer.min_accept_soul_cost || CONFIG.Game.minAcceptSoulCost);
      let baseSoul = Math.trunc((b.offer.deltas_on_accept && b.offer.deltas_on_accept.soul) || 0) - minCost;
      if (baseSoul > -minCost) baseSoul = -minCost;
      const base = {
        gold: Math.trunc((b.offer.deltas_on_accept && b.offer.deltas_on_accept.gold) || 0),
        happiness: Math.trunc((b.offer.deltas_on_accept && b.offer.deltas_on_accept.happiness) || 0),
        soul: baseSoul
      };
      _applyDeltas(base);
      applied.push('基础条款：应用 deltas_on_accept，并扣除最低灵魂成本 -' + minCost);

      // 漏洞触发（未化解）
      (b.loopholes || []).forEach((lp) => {
        if (_state.defused[lp.id]) return;
        const thenObj = lp.trigger_condition && lp.trigger_condition.then ? lp.trigger_condition.then : null;
        const apply = thenObj ? thenObj.apply : 'penalty';
        if (apply === 'set_soul_zero') {
          _state.player.soul = 0;
          UI.setTopStats({ gold: _state.player.gold, happiness: _state.player.happiness, soul: _state.player.soul, round: _state.round });
          applied.push(`致命条款触发（${lp.id}）：灵魂归零。`);
        } else {
          _applyDeltas(lp.penalty_on_accept || { gold: 0, happiness: 0, soul: 0 });
          applied.push(`漏洞触发（${lp.id}）：应用 penalty_on_accept。`);
        }
      });
    } else {
      applied.push('你拒绝了契约：本回合不执行契约条款。');
    }

    // 结算展示
    const html =
      `<div style="font-weight:900;margin-bottom:8px;">契约结算</div>` +
      `<div style="white-space:pre-wrap;margin-bottom:10px;">${Utils.escapeHtml(b.offer.summary)}</div>` +
      `<div class="small">执行记录：</div>` +
      `<div class="small" style="white-space:pre-wrap;">- ${Utils.escapeHtml(applied.join('\n- '))}</div>`;

    UI.openSettlementModal(html, function () {
      // 契约结算后立即判负（策划案：任意结算后 soul<=0 → 失败）
      if (_state.player.soul <= 0) {
        _finishRun();
        return;
      }

      // 生成事件（between_rounds）
      (async function () {
        UI.setSystemLog('正在生成事件…');
        try {
          const ctx = _getContextJson('event_generate');
          const ev = await _callStageWithRepair('event_generate', { contextJson: ctx });
          _onEventGenerated(ev);
        } catch (e) {
          Logger && Logger.warn && Logger.warn('event_generate 失败，启用降级模板。', e);
          if (_is429(e)) {
            UI.setSystemLog('API 限流（429），事件已使用本地模板。');
          } else {
            var evMsg = (e && e.message ? e.message : 'LLM error') + '\n' + (e && e.validationErrors ? e.validationErrors.join('\n') : '');
            DebugOverlay && DebugOverlay.showError && DebugOverlay.showError('LLM Error（已降级为模板）', new Error(evMsg));
          }
          _onEventGenerated(Templates.fallbackEvent());
        }
      })();
    });
  }

  function _bindUi() {
    UI.bindMenu({
      onStart: function () {
        _resetRun();
        UI.setTopStats({ gold: _state.player.gold, happiness: _state.player.happiness, soul: _state.player.soul, round: _state.round });
        UI.setOfferSummary('（尚未生成契约）', '');
        UI.setHistory([]);
        UI.setSystemLog('点击“生成契约”开始。');
        UI.setButtonsState({
          canGenerateOffer: true,
          canOpenFull: false,
          canNegotiate: false,
          canRelic: false,
          canAccept: false,
          canReject: false,
          negotiateLeft: _state.negotiateLeft
        });
        UI.showView('game');
      },
      onAchievements: function () {
        UI.openSettlementModal('<div>（占位）成就系统开发中。</div>', function () {});
      },
      onBackMenu: function () {
        UI.closeModal();
        UI.showView('menu');
      },
      onOpenWorkbench: function () {
        var cur = LLMClient.getSettings();
        UI.openModelSettingsModal(
          cur,
          // onSave：保存设置
          function (s) {
            LLMClient.setSettings(s);
            Logger && Logger.info && Logger.info('模型设置已保存。provider=' + s.provider);
          },
          // onTest：三阶段诊断（返回 diagResult 给 UI 渲染）
          async function (s) {
            LLMClient.setSettings(s);
            return await LLMClient.runDiagnostics(s);
          }
        );
      }
    });

    UI.bindGameButtons({
      onGenerateOffer: function () {
        (async function () {
          if (!LLMClient.isConfigured()) {
            UI.openSettlementModal('<div>请先在右侧“模型设置”里填写 API Base / Model / API Key。</div>', function () {});
            return;
          }
          UI.setSystemLog('正在生成契约…');
          UI.setButtonsState({
            canGenerateOffer: false,
            canOpenFull: false,
            canNegotiate: false,
            canRelic: false,
            canAccept: false,
            canReject: false,
            negotiateLeft: _state.negotiateLeft
          });

          try {
            const ctx = _getContextJson('offer_generate');
            const bundle = await _callStageWithRepair('offer_generate', { contextJson: ctx });
            _onOfferGenerated(bundle);
          } catch (e) {
            Logger && Logger.warn && Logger.warn('offer_generate 失败，启用降级模板。', e);
            var errMsg = (e && e.message ? e.message : 'LLM error');
            var valErrs = (e && e.validationErrors) ? e.validationErrors.join('\n') : '';
            // 429 限流特殊提示
            if (_is429(e)) {
              UI.setSystemLog('API 限流（429），已使用本地模板。稍后再试可恢复在线生成。');
              Logger && Logger.info && Logger.info('429 限流，使用降级模板继续游戏。');
            } else {
              DebugOverlay && DebugOverlay.showError && DebugOverlay.showError(
                'LLM Error（已降级为模板）',
                new Error(errMsg + '\n' + valErrs)
              );
            }
            _onOfferGenerated(Templates.fallbackOfferBundle(Utils.rand() < CONFIG.Game.deadlyProbeSpawnChance));
          }
        })();
      },
      onOpenFullText: function () {
        if (!_state.offerBundle) return;
        UI.openFullTextModal(_state.offerBundle, function (quote) {
          _state.selectedQuote = quote;
          Logger && Logger.info && Logger.info('picked quote', 'P' + quote.p + '-S' + quote.s);
          UI.openSettlementModal('<div>已引用：P' + quote.p + '-S' + quote.s + '</div>', function () {});
        });
      },
      onOpenNegotiate: function () {
        if (!_state.offerBundle) return;
        UI.openNegotiateModal(_state.selectedQuote, _state.conversationLog, function (data) {
          if (_state.negotiateLeft <= 0) return;
          _state.negotiateLeft -= 1;
          UI.setButtonsState({
            canGenerateOffer: false,
            canOpenFull: true,
            canNegotiate: _state.negotiateLeft > 0,
            canRelic: true,
            canAccept: true,
            canReject: true,
            negotiateLeft: _state.negotiateLeft
          });

          const ctx = _getContextJson('negotiate');
          const quoteRef = data.quote ? `{"p":${data.quote.p},"s":${data.quote.s}}` : '';
          // 保存用于关键词命中（开发端判定）
          UI._lastNegText = (data.explain || '') + '\n' + (data.counter || '');

          (async function () {
            if (!LLMClient.isConfigured()) {
              UI.openSettlementModal('<div>请先在右侧“模型设置”里填写 API Base / Model / API Key。</div>', function () {});
              return;
            }
            UI.setSystemLog('正在谈判…（本回合剩余谈判 ' + _state.negotiateLeft + ' 次）');
            try {
              const res = await _callStageWithRepair('negotiate', {
                contextJson: ctx,
                quoteRef: quoteRef,
                playerExplain: data.explain,
                playerCounter: data.counter
              });
              _onNegotiateResult(res);
            } catch (e) {
              Logger && Logger.warn && Logger.warn('negotiate 失败（不修改契约）。', e);
              if (_is429(e)) {
                UI.setSystemLog('API 限流（429），谈判失败，稍后重试。');
                UI.openSettlementModal('<div>魔鬼忙碌中（API 限流），请稍等几秒再试。</div>', function () {});
              } else {
                var negMsg = (e && e.message ? e.message : 'LLM error') + '\n' + (e && e.validationErrors ? e.validationErrors.join('\n') : '');
                DebugOverlay && DebugOverlay.showError && DebugOverlay.showError('LLM Error（谈判失败）', new Error(negMsg));
                UI.openSettlementModal('<div>谈判失败：魔鬼拒绝理解你的措辞（本次不改写条款）。</div>', function () {});
              }
            }
          })();
        });
      },
      onRelic: function () {
        if (!_state.offerBundle) return;
        UI.openRelicModal((_state.offerBundle.loopholes || []).length);
      },
      onAccept: function () {
        _settleContractAndProceed(true);
      },
      onReject: function () {
        _settleContractAndProceed(false);
      }
    });
  }

  self.setPointerFromEvent = function (e) {
    if (!_dom.canvas) return;
    const rect = _dom.canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width);
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height);
    Input.pointer.x = nx * DESIGN_W;
    Input.pointer.y = ny * DESIGN_H;
  };

  self.getDebugState = function () {
    return {
      renderMode: _state.renderMode,
      degradeReason: _state.degradeReason,
      seed: Utils.getSeed()
    };
  };

  self.start = function () {
    _dom.container = document.getElementById('game-container');
    _dom.canvas = document.getElementById('game-canvas');

    if (!_dom.container || !_dom.canvas) {
      console.error('缺少 #game-container 或 #game-canvas，无法启动。');
      return;
    }

    // 初始化 RNG / 调试
    Utils.setSeed(CONFIG.Debug.seed);
    DebugOverlay && DebugOverlay.installGlobalHandlers && DebugOverlay.installGlobalHandlers();

    // 初始化 UI
    UI.init();
    _bindUi();
    UI.showView('menu');

    // 渲染模式与 HUD
    _state.renderMode = _pickRenderMode();
    _state.threeRevision = typeof window.THREE !== 'undefined' ? String(window.THREE.REVISION || '-') : '-';
    UI.setRenderHud(_state.renderMode, _state.threeRevision);
    if (_state.degradeReason) Logger && Logger.warn && Logger.warn('degradeReason =', _state.degradeReason);
    if (typeof window.THREE !== 'undefined') Logger && Logger.info && Logger.info('THREE.REVISION =', window.THREE.REVISION);

    if (_state.renderMode === 'three') {
      try {
        _threeInit();
      } catch (err) {
        _state.degradeReason = 'Three.js 初始化异常：' + (err && err.message ? err.message : String(err));
        Logger && Logger.warn && Logger.warn('Three.js 初始化失败，降级到 Canvas2D：', err);
        _state.renderMode = 'canvas2d';
        _canvas2dInit();
        UI.setRenderHud(_state.renderMode, _state.threeRevision);
      }
    } else {
      _canvas2dInit();
    }

    // resize + visibility dt 保护
    _resize();
    window.addEventListener('resize', _resize);
    document.addEventListener('visibilitychange', function () {
      // 页面回到前台时重置时间戳，避免 dt 巨大
      _state.lastTs = 0;
    });

    _state.running = true;
    requestAnimationFrame(_loop);
  };

  return self;
})();

window.addEventListener('load', function () {
  Loader.init(function () {
    Input.init();
    Game.start();
  });
});

