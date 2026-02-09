// js/localSecrets.js（本机私有，不提交仓库）
// 说明：仅作"未配置时的默认值"（localStorage 优先）。
// 用户只需要在游戏内"模型设置"里填 API Key 即可。

window.__DEAL_DEVIL_LLM_DEFAULTS__ = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-2.0-flash',
  apiKey: ''
};
