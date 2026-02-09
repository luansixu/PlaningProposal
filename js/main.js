// js/main.js：启动入口 + 渲染初始化（Three.js 优先，失败降级到 Canvas2D）

const Game = (function () {
  const self = {};

  // 设计分辨率（唯一坐标系来源）
  const DESIGN_W = CONFIG.Screen.width;
  const DESIGN_H = CONFIG.Screen.height;

  const _dom = {
    container: null,
    canvas: null,
    hudRenderMode: null,
    hudThreeRev: null
  };

  // 运行时状态（尽量少）
  const _state = {
    renderMode: 'canvas2d',
    threeRevision: '-',
    running: false,
    lastTs: 0,
    degradeReason: ''
  };

  // 渲染对象（按模式二选一）
  const _r = {
    // three
    renderer: null,
    scene: null,
    camera: null,
    cube: null,
    // canvas2d
    ctx2d: null
  };

  function _setHud() {
    if (_dom.hudRenderMode) _dom.hudRenderMode.textContent = _state.renderMode;
    if (_dom.hudThreeRev) _dom.hudThreeRev.textContent = _state.threeRevision;
  }

  function _supportsWebGL() {
    // 规则要求：若 WebGL 不可用必须降级
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
    if (hasThree && hasWebGL && wantsThree) return 'three';
    return 'canvas2d';
  }

  function _applyCanvasDpiSize() {
    const rect = _dom.canvas.getBoundingClientRect();
    const dpr = Utils.clamp(window.devicePixelRatio || 1, 1, CONFIG.Render.maxPixelRatio);

    // Canvas 真实像素尺寸（用于清晰度）
    const pxW = Math.max(1, Math.floor(rect.width * dpr));
    const pxH = Math.max(1, Math.floor(rect.height * dpr));

    if (_dom.canvas.width !== pxW) _dom.canvas.width = pxW;
    if (_dom.canvas.height !== pxH) _dom.canvas.height = pxH;
  }

  function _threeInit() {
    // 受控例外：Three.js 必须通过全局 THREE 可用
    _state.threeRevision = String(window.THREE && window.THREE.REVISION ? window.THREE.REVISION : '-');

    _r.renderer = new THREE.WebGLRenderer({
      canvas: _dom.canvas,
      antialias: true,
      alpha: true
    });

    const dpr = Utils.clamp(window.devicePixelRatio || 1, 1, CONFIG.Render.maxPixelRatio);
    _r.renderer.setPixelRatio(dpr);

    _r.scene = new THREE.Scene();
    _r.camera = new THREE.PerspectiveCamera(60, DESIGN_W / DESIGN_H, 0.1, 100);
    _r.camera.position.z = CONFIG.Demo.cameraZ;

    // 简单光照
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    _r.scene.add(light);
    _r.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // 演示立方体：用于验证 Three.js 渲染链路
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: CONFIG.Demo.cubeColor });
    _r.cube = new THREE.Mesh(geo, mat);
    _r.scene.add(_r.cube);

    // 线框叠加（更“有画面”）
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({ color: CONFIG.Demo.cubeWireColor, transparent: true, opacity: 0.65 })
    );
    _r.cube.add(wire);

    // WebGL context 丢失必须可见提示（调试体验）
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
        Logger && Logger.warn && Logger.warn('webglcontextrestored：请刷新页面以完全恢复。');
        DebugOverlay &&
          DebugOverlay.showError &&
          DebugOverlay.showError('WebGL Context Restored', new Error('WebGL context restored (建议刷新以恢复)'));
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

  function _canvas2dRender(ts, dt) {
    const ctx = _r.ctx2d;
    if (!ctx) return;

    const w = _dom.canvas.width;
    const h = _dom.canvas.height;

    // 背景
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CONFIG.Demo.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    // 基于 dt 的动画（避免写魔法数：全部引用 CONFIG）
    const speed = CONFIG.Demo.rotationSpeed;
    const t = (ts / 1000) * speed;

    // 画一个旋转方块（兜底也要“看得见”）
    const size = Math.floor(Math.min(w, h) * 0.22);
    const cx = Math.floor(w * 0.5);
    const cy = Math.floor(h * 0.5);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t);
    ctx.fillStyle = CONFIG.Demo.cubeColor;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.lineWidth = Math.max(1, Math.floor(size * 0.06));
    ctx.strokeStyle = CONFIG.Demo.cubeWireColor;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    // 文本提示（便于验证降级路径）
    ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
    ctx.font = '16px ' + CONFIG.UI.fontFamily;
    ctx.fillText('已降级到 Canvas2D（WebGL/Three 不可用或未启用）', 16, 28);
  }

  function _threeRender(ts, dt) {
    if (!_r.renderer) return;
    if (_r.cube) {
      const speed = CONFIG.Demo.rotationSpeed;
      _r.cube.rotation.x += dt * speed;
      _r.cube.rotation.y += dt * speed * 1.15;
    }
    _r.renderer.render(_r.scene, _r.camera);
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
    dt = Math.min(dt, (CONFIG && CONFIG.Debug && CONFIG.Debug.maxDt) || 0.05);
    _state.lastTs = ts;

    try {
      if (_state.renderMode === 'three') _threeRender(ts, dt);
      else _canvas2dRender(ts, dt);
    } catch (err) {
      // 主循环防崩：停止 rAF + 可见错误
      _state.running = false;
      Logger && Logger.error && Logger.error('主循环异常，已暂停：', err && err.message ? err.message : String(err));
      DebugOverlay && DebugOverlay.showError && DebugOverlay.showError('Main Loop Crash', err);
      return;
    }

    requestAnimationFrame(_loop);
  }

  self.setPointerFromEvent = function (e) {
    // 强制：把指针位置映射到设计分辨率坐标系（而不是 window 尺寸）
    if (!_dom.canvas) return;
    const rect = _dom.canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width);
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height);
    Input.pointer.x = nx * DESIGN_W;
    Input.pointer.y = ny * DESIGN_H;
  };

  self.start = function () {
    _dom.container = document.getElementById('game-container');
    _dom.canvas = document.getElementById('game-canvas');
    _dom.hudRenderMode = document.getElementById('hud-render-mode');
    _dom.hudThreeRev = document.getElementById('hud-three-rev');

    if (!_dom.container || !_dom.canvas) {
      console.error('缺少 #game-container 或 #game-canvas，无法启动。');
      return;
    }

    // 初始化可复现随机数
    Utils && Utils.setSeed && Utils.setSeed((CONFIG && CONFIG.Debug && CONFIG.Debug.seed) || 1);

    // 全局错误捕获（必须）
    DebugOverlay && DebugOverlay.installGlobalHandlers && DebugOverlay.installGlobalHandlers();

    // 决定渲染模式（Three 优先，失败降级）
    _state.renderMode = _pickRenderMode();
    _state.threeRevision = typeof window.THREE !== 'undefined' ? String(window.THREE.REVISION || '-') : '-';
    _setHud();

    // 额外：便于你直接在控制台验证（统一走 Logger）
    Logger && Logger.info && Logger.info('renderMode =', _state.renderMode);
    if (_state.degradeReason) Logger && Logger.warn && Logger.warn('degradeReason =', _state.degradeReason);
    if (typeof window.THREE !== 'undefined') Logger && Logger.info && Logger.info('THREE.REVISION =', window.THREE.REVISION);

    if (_state.renderMode === 'three') {
      try {
        _threeInit();
      } catch (err) {
        _state.degradeReason = 'Three.js 初始化异常：' + (err && err.message ? err.message : String(err));
        Logger && Logger.warn && Logger.warn('Three.js 初始化失败，自动降级到 Canvas2D：', err);
        _state.renderMode = 'canvas2d';
        _canvas2dInit();
      }
    } else {
      _canvas2dInit();
    }

    _setHud();
    _resize();
    window.addEventListener('resize', _resize);

    _state.running = true;
    requestAnimationFrame(_loop);
  };

  self.getDebugState = function () {
    return {
      renderMode: _state.renderMode,
      degradeReason: _state.degradeReason,
      seed: Utils && Utils.getSeed ? Utils.getSeed() : null
    };
  };

  return self;
})();

// 启动流程：Loader → Input → Game
window.addEventListener('load', function () {
  Loader.init(function () {
    Input.init();
    Game.start();
  });
});

