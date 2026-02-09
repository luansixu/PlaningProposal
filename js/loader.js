// js/loader.js：资源预加载（本原型仅做占位，保证流程闭环）

const Loader = (function () {
  const self = {};

  self.init = function (onDone) {
    // 受控例外：即使没有任何资源，也必须可运行
    if (typeof onDone === 'function') onDone();
  };

  return self;
})();

