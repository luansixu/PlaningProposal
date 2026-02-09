// js/llm.js：LLM 提示词构建（系统提示 + 完整 JSON Schema 内嵌）
// 核心原则：模型必须看到精确的 JSON Schema，否则不可能稳定输出正确结构。

var LLM = (function () {
  var self = {};

  function _system() {
    return (
      '你是一个贪婪、狡猾但守规则的"魔鬼谈判官"。你的目标是在不出戏的前提下，用最小付出换取玩家尽可能多的灵魂。\n\n' +
      '你必须遵守：\n' +
      '1) 只输出 1 个 JSON 对象，禁止输出 Markdown 代码块、解释、注释、前后缀文本。\n' +
      '2) 直接输出 { 开头，} 结尾。不要用 ```json 包裹。\n' +
      '3) JSON 必须可解析、字段齐全、类型正确；所有数值必须是有限数。\n' +
      '4) 中文内容。\n'
    );
  }

  // ===== offer_generate 的完整 JSON Schema =====
  var OFFER_SCHEMA =
    '你必须严格按以下 JSON 结构输出（所有字段都是必填的）：\n' +
    '{\n' +
    '  "devil": {\n' +
    '    "tier": "small",          // string，魔鬼等级\n' +
    '    "name": "某个魔鬼名字"    // string，魔鬼名\n' +
    '  },\n' +
    '  "display_text": "魔鬼的开场白台词",  // string，给玩家看的叙述\n' +
    '  "offer": {\n' +
    '    "summary": "契约摘要（1-2句话概括交易内容）",  // string\n' +
    '    "full_text": "契约完整正文（包含所有条款，分段，用于让玩家阅读查找漏洞）",  // string，长文本\n' +
    '    "min_accept_soul_cost": 30,  // number，签约最少扣多少灵魂\n' +
    '    "deltas_on_accept": {        // 签约后属性变化\n' +
    '      "gold": 100,              // number\n' +
    '      "happiness": 20,          // number\n' +
    '      "soul": -30               // number（负=扣）\n' +
    '    },\n' +
    '    "abilities_granted": ["能力名1"],  // string[]\n' +
    '    "curses_granted": ["诅咒名1"]     // string[]\n' +
    '  },\n' +
    '  "text_index": {\n' +
    '    "paragraphs": [\n' +
    '      {\n' +
    '        "p": 1,  // number，段落编号，从1开始\n' +
    '        "sentences": [\n' +
    '          { "s": 1, "text": "第一段第一句话的内容" },\n' +
    '          { "s": 2, "text": "第一段第二句话的内容" }\n' +
    '        ]\n' +
    '      },\n' +
    '      {\n' +
    '        "p": 2,\n' +
    '        "sentences": [\n' +
    '          { "s": 1, "text": "第二段第一句话" }\n' +
    '        ]\n' +
    '      }\n' +
    '    ]\n' +
    '  },\n' +
    '  "deadly_probe": {\n' +
    '    "present": false,       // boolean，是否存在致命陷阱\n' +
    '    "spawn_chance": 0.3,    // number\n' +
    '    "warning_text": "注意：本契约可能包含致命条款"  // string\n' +
    '  },\n' +
    '  "loopholes": [\n' +
    '    {\n' +
    '      "id": "L1",  // string，漏洞ID\n' +
    '      "quote_ref": { "p": 1, "s": 2 },  // 指向 text_index 中哪段哪句\n' +
    '      "player_detect_keywords": ["模糊", "不清"],  // string[]，玩家可能用来发现此漏洞的关键词\n' +
    '      "player_issue_keywords": ["无限", "边界"],   // string[]，玩家指出问题时可能使用的关键词\n' +
    '      "issue_explanation": "此条款的触发条件定义模糊，可无限扩大范围",  // string\n' +
    '      "trigger_condition": {\n' +
    '        "type": "on_accept",  // string\n' +
    '        "then": {\n' +
    '          "apply": "penalty"  // string，"penalty" 或 "set_soul_zero"(致命)\n' +
    '        }\n' +
    '      },\n' +
    '      "penalty_on_accept": {  // 如果玩家没发现此漏洞就签约的惩罚\n' +
    '        "gold": 0,\n' +
    '        "happiness": -10,\n' +
    '        "soul": -5\n' +
    '      },\n' +
    '      "defuse_actions": ["删除该条款", "限定触发次数"],  // string[]\n' +
    '      "severity": 3  // number，1-5\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    '关键规则：\n' +
    '- loopholes 数组必须有 4-6 个元素\n' +
    '- 每个 loophole 的 quote_ref 必须对应 text_index 中存在的 p 和 s\n' +
    '- text_index.paragraphs 里的内容就是 offer.full_text 分段分句后的索引\n' +
    '- 如果 deadly_probe.present=true，则 loopholes 中必须有一个 trigger_condition.then.apply="set_soul_zero"\n' +
    '- 所有数值字段必须是有限数字（不能是 null/undefined/NaN/Infinity）\n';

  // ===== negotiate 的完整 JSON Schema =====
  var NEGOTIATE_SCHEMA =
    '你必须严格按以下 JSON 结构输出（所有字段都是必填的）：\n' +
    '{\n' +
    '  "display_text": "魔鬼对玩家谈判的回应台词",  // string\n' +
    '  "updated_offer": {\n' +
    '    "summary": "更新后的契约摘要",  // string\n' +
    '    "full_text": "更新后的契约全文（如果做出让步则包含修改后的条款）",  // string\n' +
    '    "deltas_on_accept": { "gold": 100, "happiness": 20, "soul": -30 }  // 更新后的属性变化\n' +
    '  },\n' +
    '  "loophole_check": {\n' +
    '    "matched_loophole_id": "L1",  // string 或 null（玩家指出的漏洞ID）\n' +
    '    "layer1_detected": true,      // boolean，玩家是否指到了漏洞所在句子\n' +
    '    "layer2_issue_explained": true, // boolean，玩家是否说清了问题原因\n' +
    '    "is_full_success": true,       // boolean，layer1+layer2 都通过\n' +
    '    "confidence": {\n' +
    '      "keyword_score": 0.8,   // number 0-1\n' +
    '      "semantic_score": 0.9,  // number 0-1\n' +
    '      "final_score": 0.85     // number 0-1\n' +
    '    },\n' +
    '    "devil_response_mode": "concede",  // string："concede"/"deflect"/"deny"\n' +
    '    "devil_concession": ["删除该条款"]  // string[]，让步内容\n' +
    '  },\n' +
    '  "conversation_log_append": [\n' +
    '    { "role": "player", "content": "玩家说的话" },\n' +
    '    { "role": "devil", "content": "魔鬼的回应" }\n' +
    '  ]\n' +
    '}\n\n' +
    '关键规则：\n' +
    '- layer2_issue_explained=true 时必须 devil_response_mode="concede"，并在 updated_offer 中体现让步\n' +
    '- matched_loophole_id 应匹配 CONTEXT 中的某个漏洞 id，如果玩家没指出漏洞则为 null\n';

  // ===== event_generate 的完整 JSON Schema =====
  var EVENT_SCHEMA =
    '你必须严格按以下 JSON 结构输出（所有字段都是必填的）：\n' +
    '{\n' +
    '  "display_text": "事件描述旁白",  // string\n' +
    '  "event": {\n' +
    '    "node": "between_rounds",  // string\n' +
    '    "event_text": "事件正文（描述发生了什么）",  // string\n' +
    '    "choices": [\n' +
    '      {\n' +
    '        "id": "A",  // string\n' +
    '        "choice_text": "选项A描述",  // string\n' +
    '        "deltas": { "gold": 10, "happiness": -5, "soul": 0 }  // 选此项的属性变化\n' +
    '      },\n' +
    '      {\n' +
    '        "id": "B",\n' +
    '        "choice_text": "选项B描述",\n' +
    '        "deltas": { "gold": -10, "happiness": 10, "soul": -5 }\n' +
    '      }\n' +
    '    ]\n' +
    '  }\n' +
    '}\n\n' +
    '关键规则：\n' +
    '- choices 必须恰好 2 个\n' +
    '- 事件内容要有戏剧性，与魔鬼交易主题相关\n';

  // 返回 OpenAI 兼容 messages[]
  self.buildMessages = function (stage, args) {
    if (stage === 'offer_generate') {
      return [
        { role: 'system', content: _system() },
        {
          role: 'user',
          content:
            'stage=offer_generate\n\n' +
            '当前游戏状态：\n' + args.contextJson + '\n\n' +
            '=== 输出 JSON Schema（必须严格遵守） ===\n' +
            OFFER_SCHEMA + '\n' +
            '请根据以上 schema 生成一份魔鬼契约。直接输出 JSON，不要任何其它文本。'
        }
      ];
    }

    if (stage === 'negotiate') {
      return [
        { role: 'system', content: _system() },
        {
          role: 'user',
          content:
            'stage=negotiate\n\n' +
            '当前游戏状态：\n' + args.contextJson + '\n\n' +
            '玩家引用的句子：' + (args.quoteRef || '（未引用）') + '\n' +
            '玩家的解释：' + (args.playerExplain || '（无）') + '\n' +
            '玩家的反提案：' + (args.playerCounter || '（无）') + '\n\n' +
            '=== 输出 JSON Schema（必须严格遵守） ===\n' +
            NEGOTIATE_SCHEMA + '\n' +
            '请根据以上 schema 输出谈判结果。直接输出 JSON，不要任何其它文本。'
        }
      ];
    }

    if (stage === 'event_generate') {
      return [
        { role: 'system', content: _system() },
        {
          role: 'user',
          content:
            'stage=event_generate\n\n' +
            '当前游戏状态：\n' + args.contextJson + '\n\n' +
            '=== 输出 JSON Schema（必须严格遵守） ===\n' +
            EVENT_SCHEMA + '\n' +
            '请生成一个回合间事件。直接输出 JSON，不要任何其它文本。'
        }
      ];
    }

    if (stage === 'repair_json') {
      return [
        { role: 'system', content: _system() },
        {
          role: 'user',
          content:
            'stage=repair_json\n\n' +
            '以下 JSON 校验失败，请修复后重新输出完整 JSON。只做最小修复，保持原意。\n\n' +
            '=== 原始 JSON ===\n' +
            args.badJson + '\n\n' +
            '=== 校验错误 ===\n' +
            args.validationErrors + '\n\n' +
            '请直接输出修复后的完整 JSON 对象（不要解释、不要 Markdown）。'
        }
      ];
    }

    return [{ role: 'system', content: _system() }, { role: 'user', content: '{"error":"unknown stage"}' }];
  };

  return self;
})();
