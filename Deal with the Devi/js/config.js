// js/config.js：所有数值与开关的唯一来源（禁止在逻辑里写魔法数字）

const CONFIG = {
  Screen: {
    width: 1280,
    height: 720
  },

  Render: {
    mode: 'three', // 'three' 优先，失败自动降级到 'canvas2d'
    threeVersion: 'r155',
    maxPixelRatio: 2
  },

  Debug: {
    enabled: true,
    // debug/info/warn/error/silent
    logLevel: 'debug',
    maxDt: 0.05,
    seed: 20260206,
    // 故障注入：用于验收 overlay（true 时每帧随机小概率抛错）
    chaosMode: false,
    chaosChancePerSecond: 0.02
  },

  Game: {
    roundMax: 1,
    initial: {
      happiness: 60,
      gold: 0,
      soul: 100,
      round: 1
    },
    // 原型规则
    devil: {
      tier: 'small',
      name: '格里姆·小角'
    },
    minAcceptSoulCost: 10,
    deadlyProbeSpawnChance: 0.3,
    loopholeCountRange: [4, 6],
    negotiateMaxTimes: 2
  },

  Input: {
    bindings: {
      confirm: ['Enter', 'Space'],
      cancel: ['Escape']
    }
  },

  UI: {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Arial, sans-serif',
    maxTextAreaChars: 1200,
    maxJsonPasteChars: 120000
  }
};

