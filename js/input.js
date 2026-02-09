// js/input.js：输入管理（PC 鼠标键盘优先），对外暴露语义事件

const Input = (function () {
  const self = {};

  const _down = Object.create(null);
  const _pressed = Object.create(null);

  self.bindings = (CONFIG && CONFIG.Input && CONFIG.Input.bindings) || {};

  self.pointer = {
    x: 0,
    y: 0,
    isDown: false,
    wasClicked: false
  };

  function _setPressed(action) {
    _pressed[action] = true;
  }

  function _isMatch(code, list) {
    if (!Array.isArray(list)) return false;
    return list.indexOf(code) !== -1;
  }

  self.isDown = function (action) {
    return !!_down[action];
  };

  self.wasPressed = function (action) {
    return !!_pressed[action];
  };

  self.beginFrame = function () {
    // 每帧开始重置“按下一次”的标记
    for (const k in _pressed) delete _pressed[k];
    self.pointer.wasClicked = false;
  };

  self.init = function () {
    window.addEventListener('keydown', function (e) {
      for (const action in self.bindings) {
        if (_isMatch(e.code, self.bindings[action])) {
          if (!_down[action]) _setPressed(action);
          _down[action] = true;
        }
      }
    });

    window.addEventListener('keyup', function (e) {
      for (const action in self.bindings) {
        if (_isMatch(e.code, self.bindings[action])) {
          _down[action] = false;
        }
      }
    });

    // 统一把鼠标坐标映射到“设计分辨率坐标系”
    window.addEventListener('pointermove', function (e) {
      Game && Game.setPointerFromEvent && Game.setPointerFromEvent(e);
    });

    window.addEventListener('pointerdown', function (e) {
      self.pointer.isDown = true;
      Game && Game.setPointerFromEvent && Game.setPointerFromEvent(e);
    });

    window.addEventListener('pointerup', function (e) {
      self.pointer.isDown = false;
      self.pointer.wasClicked = true;
      Game && Game.setPointerFromEvent && Game.setPointerFromEvent(e);
    });
  };

  return self;
})();

