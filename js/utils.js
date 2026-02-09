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
    // 若未初始化，则用 Debug.seed 初始化
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

  self.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  self.hexToRgb = function (hex) {
    // 支持 #RRGGBB
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16)
    };
  };

  return self;
})();

