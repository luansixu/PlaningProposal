// js/debugOverlay.js：错误覆盖层（必须在 #game-container 内），提升出错可调试体验

const DebugOverlay = (function () {
  const self = {};

  let _root = null;
  let _pre = null;
  let _details = null;
  let _visible = false;

  function _ensure() {
    if (_root) return;
    const container = document.getElementById('game-container');
    if (!container) return;

    _root = document.createElement('div');
    _root.id = 'debug-overlay';
    _root.style.position = 'absolute';
    _root.style.top = '0';
    _root.style.left = '0';
    _root.style.width = '100%';
    _root.style.height = '100%';
    _root.style.background = 'rgba(2, 6, 23, 0.86)';
    _root.style.backdropFilter = 'blur(6px)';
    _root.style.color = 'rgba(226, 232, 240, 0.95)';
    _root.style.zIndex = '9999';
    _root.style.display = 'none';
    _root.style.padding = '16px';
    _root.style.boxSizing = 'border-box';
    _root.style.overflow = 'auto';
    _root.style.fontFamily = (CONFIG && CONFIG.UI && CONFIG.UI.fontFamily) || 'system-ui, Segoe UI, Arial';

    const title = document.createElement('div');
    title.textContent = '发生错误（已暂停）';
    title.style.fontSize = '18px';
    title.style.fontWeight = '900';
    title.style.marginBottom = '10px';

    const desc = document.createElement('div');
    desc.textContent = '请复制诊断信息用于复现与定位；或刷新重试。';
    desc.style.opacity = '0.85';
    desc.style.marginBottom = '12px';

    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.gap = '8px';
    bar.style.marginBottom = '12px';

    function mkBtn(text, onClick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.padding = '8px 10px';
      b.style.borderRadius = '10px';
      b.style.border = '1px solid rgba(148, 163, 184, 0.25)';
      b.style.background = 'rgba(15, 23, 42, 0.8)';
      b.style.color = 'rgba(226, 232, 240, 0.95)';
      b.style.cursor = 'pointer';
      b.addEventListener('click', onClick);
      return b;
    }

    const btnCopy = mkBtn('复制诊断信息', async function () {
      const text = self.buildDiagnosticsText();
      try {
        await navigator.clipboard.writeText(text);
        Logger && Logger.info && Logger.info('已复制诊断信息到剪贴板。');
      } catch (e) {
        Logger && Logger.warn && Logger.warn('剪贴板写入失败，已选中文本，请手动复制。', e);
        _details.style.display = 'block';
        _details.value = text;
        _details.focus();
        _details.select();
      }
    });

    const btnReload = mkBtn('刷新页面', function () {
      location.reload();
    });

    const btnToggle = mkBtn('展开/收起详情', function () {
      const isOn = _details.style.display !== 'none';
      _details.style.display = isOn ? 'none' : 'block';
    });

    bar.appendChild(btnCopy);
    bar.appendChild(btnReload);
    bar.appendChild(btnToggle);

    _pre = document.createElement('pre');
    _pre.style.margin = '0';
    _pre.style.padding = '12px';
    _pre.style.borderRadius = '12px';
    _pre.style.border = '1px solid rgba(148, 163, 184, 0.2)';
    _pre.style.background = 'rgba(15, 23, 42, 0.65)';
    _pre.style.whiteSpace = 'pre-wrap';
    _pre.style.wordBreak = 'break-word';
    _pre.textContent = '(暂无错误信息)';

    _details = document.createElement('textarea');
    _details.readOnly = false;
    _details.spellcheck = false;
    _details.style.display = 'none';
    _details.style.width = '100%';
    _details.style.height = '220px';
    _details.style.marginTop = '12px';
    _details.style.padding = '12px';
    _details.style.borderRadius = '12px';
    _details.style.border = '1px solid rgba(148, 163, 184, 0.2)';
    _details.style.background = 'rgba(2, 6, 23, 0.55)';
    _details.style.color = 'rgba(226, 232, 240, 0.95)';
    _details.style.boxSizing = 'border-box';

    _root.appendChild(title);
    _root.appendChild(desc);
    _root.appendChild(bar);
    _root.appendChild(_pre);
    _root.appendChild(_details);

    container.appendChild(_root);
  }

  self.showError = function (title, err) {
    _ensure();
    if (!_root) return;
    _visible = true;
    _root.style.display = 'block';

    const msg = err && err.message ? err.message : String(err || '');
    const stack = err && err.stack ? err.stack : '';
    _pre.textContent = `[${title}]\n${msg}\n\n${stack}\n`;
  };

  self.hide = function () {
    if (!_root) return;
    _visible = false;
    _root.style.display = 'none';
  };

  self.buildDiagnosticsText = function () {
    const seed = CONFIG && CONFIG.Debug ? CONFIG.Debug.seed : '';
    const mode = window.Game && window.Game.getDebugState ? window.Game.getDebugState().renderMode : '';
    const reason = window.Game && window.Game.getDebugState ? window.Game.getDebugState().degradeReason : '';
    const threeRev = typeof window.THREE !== 'undefined' ? String(window.THREE.REVISION || '') : '';

    const parts = [];
    parts.push('== Diagnostics ==');
    parts.push('time: ' + new Date().toISOString());
    parts.push('seed: ' + seed);
    parts.push('renderMode: ' + mode);
    parts.push('degradeReason: ' + reason);
    parts.push('THREE.REVISION: ' + threeRev);
    parts.push('');
    parts.push('== Recent Logs ==');
    parts.push(Logger && Logger.formatRecent ? Logger.formatRecent(80) : '(Logger unavailable)');
    parts.push('');
    parts.push('== Overlay ==');
    parts.push(_pre ? _pre.textContent : '(no overlay content)');
    return parts.join('\n');
  };

  self.installGlobalHandlers = function () {
    window.addEventListener('error', function (e) {
      const err = e && e.error ? e.error : new Error((e && e.message) || 'Unknown error');
      Logger && Logger.error && Logger.error('window.error:', (e && e.message) || '', (e && e.filename) || '', (e && e.lineno) || '');
      self.showError('Error', err);
    });

    window.addEventListener('unhandledrejection', function (e) {
      const reason = e && e.reason ? e.reason : new Error('Unhandled rejection');
      Logger && Logger.error && Logger.error('unhandledrejection:', reason && reason.message ? reason.message : String(reason));
      self.showError('Promise Rejection', reason);
    });
  };

  return self;
})();

