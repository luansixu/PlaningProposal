// js/utils.js：通用工具函数（简体中文注释）

const Utils = (function () {
  const self = {};

  // 可复现 RNG：所有玩法随机必须走这里（禁止直接 Math.random()）
  let _rng = null;
  let _seed = 0;

  function _mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  self.setSeed = function (seed) {
    _seed = (seed >>> 0) || 0;
    _rng = _mulberry32(_seed || 1);
  };

  self.getSeed = function () {
    return _seed;
  };

  self.rand = function () {
    if (!_rng) self.setSeed((CONFIG && CONFIG.Debug && CONFIG.Debug.seed) || 1);
    return _rng();
  };

  self.randInt = function (min, max) {
    const r = self.rand();
    return min + Math.floor(r * (max - min + 1));
  };

  self.clamp = function (v, min, max) {
    return Math.max(min, Math.min(max, v));
  };

  self.isFiniteNumber = function (n) {
    return typeof n === 'number' && Number.isFinite(n);
  };

  self.safeInt = function (n, fallback) {
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  };

  self.escapeHtml = function (s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  self.nowIso = function () {
    return new Date().toISOString();
  };

  self.deepClone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  self.truncate = function (s, max) {
    const x = String(s);
    if (x.length <= max) return x;
    return x.slice(0, Math.max(0, max - 1)) + '…';
  };

  return self;
})();

