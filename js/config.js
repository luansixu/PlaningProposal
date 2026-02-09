// js/config.js：所有数值与开关的唯一来源（禁止在逻辑里写魔法数字）

const CONFIG = {
  Screen: {
    // 16:9 逻辑分辨率（横屏）
    width: 1280,
    height: 720
  },

  Render: {
    // 渲染模式：'three' 优先，失败自动降级到 'canvas2d'
    mode: 'three',
    threeVersion: 'r155',
    // 高 DPI 屏幕下限制像素比，避免性能崩溃
    maxPixelRatio: 2
  },

  Debug: {
    enabled: true,
    // debug/info/warn/error/silent
    logLevel: 'debug',
    // dt 最大值（秒），避免切后台回来物理/动画炸
    maxDt: 0.05,
    // 固定随机种子（可复现）
    seed: 20260206
  },

  Demo: {
    // 仅用于“验证 Three.js 已加载”的演示画面参数
    backgroundColor: '#0b1020',
    cubeColor: '#4F46E5',
    cubeWireColor: '#93C5FD',
    cameraZ: 3,
    rotationSpeed: 0.9
  },

  Input: {
    bindings: {
      confirm: ['Enter', 'Space'],
      cancel: ['Escape']
    }
  },

  UI: {
    primaryColor: '#4F46E5',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Arial, sans-serif'
  }
};

