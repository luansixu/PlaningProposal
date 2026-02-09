// js/loader.js：资源预加载（本原型允许无资源也可运行）

const Loader = (function () {
  const self = {};

  self.init = function (onDone) {
    if (typeof onDone === 'function') onDone();
  };

  return self;
})();

