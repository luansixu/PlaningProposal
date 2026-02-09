// js/logger.js：统一日志（可控等级 + ring buffer），用于调试 overlay / 诊断复制

const Logger = (function () {
  const self = {};

  const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 999 };
  const _buf = [];
  const _max = 180;

  function _getLevel() {
    const lv = (CONFIG && CONFIG.Debug && CONFIG.Debug.logLevel) || 'info';
    return LEVELS[lv] != null ? LEVELS[lv] : LEVELS.info;
  }

  function _push(level, args) {
    const item = {
      ts: Date.now(),
      level: level,
      msg: Array.prototype.slice.call(args).map(String).join(' ')
    };
    _buf.push(item);
    while (_buf.length > _max) _buf.shift();
  }

  function _emitConsole(level, args) {
    const prefix = '[Deal]';
    if (level === 'error') console.error(prefix, ...args);
    else if (level === 'warn') console.warn(prefix, ...args);
    else if (level === 'info') console.info(prefix, ...args);
    else console.log(prefix, ...args);
  }

  function _log(level, args) {
    _push(level, args);
    const cur = _getLevel();
    if (LEVELS[level] >= cur) _emitConsole(level, args);
  }

  self.debug = function () {
    _log('debug', arguments);
  };
  self.info = function () {
    _log('info', arguments);
  };
  self.warn = function () {
    _log('warn', arguments);
  };
  self.error = function () {
    _log('error', arguments);
  };

  self.getRecent = function (n) {
    const k = Math.max(0, Math.min(_buf.length, n || 60));
    return _buf.slice(_buf.length - k);
  };

  self.formatRecent = function (n) {
    return self
      .getRecent(n)
      .map((x) => {
        const d = new Date(x.ts);
        const t = d.toLocaleTimeString();
        return `${t} [${x.level}] ${x.msg}`;
      })
      .join('\n');
  };

  return self;
})();

