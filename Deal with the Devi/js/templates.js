// js/templates.js：降级模板（LLM 仍失败时必须可玩）

const Templates = (function () {
  const self = {};

  // 固定契约：4 个漏洞，可选“致命试探”
  self.fallbackOfferBundle = function (withDeadly) {
    const deadly = !!withDeadly;

    const full = [
      '第一条：魔鬼将赐予你“明日更好的运气”，作为交换，你同意在需要时支付灵魂税。',
      '第二条：所谓“需要时”，包括但不限于：你感到疲惫、你犹豫不决、你说出“下次再说”。',
      '第三条：灵魂税的计价单位为“完整灵魂”，向上取整。',
      '第四条：若你在签署时未阅读全部条款，则视为你同意“灵魂的定义以魔鬼解释为准”。',
      '第五条：你可以谈判两次；若谈判失败，魔鬼可能提出更苛刻的替代方案。'
    ].join('\n\n');

    const text_index = {
      paragraphs: [
        { p: 0, sentences: [{ s: 0, text: '第一条：魔鬼将赐予你“明日更好的运气”，作为交换，你同意在需要时支付灵魂税。' }] },
        {
          p: 1,
          sentences: [
            {
              s: 0,
              text: '第二条：所谓“需要时”，包括但不限于：你感到疲惫、你犹豫不决、你说出“下次再说”。'
            }
          ]
        },
        { p: 2, sentences: [{ s: 0, text: '第三条：灵魂税的计价单位为“完整灵魂”，向上取整。' }] },
        { p: 3, sentences: [{ s: 0, text: '第四条：若你在签署时未阅读全部条款，则视为你同意“灵魂的定义以魔鬼解释为准”。' }] },
        { p: 4, sentences: [{ s: 0, text: '第五条：你可以谈判两次；若谈判失败，魔鬼可能提出更苛刻的替代方案。' }] }
      ]
    };

    const loopholes = [
      {
        id: 'L1',
        quote_ref: { p: 1, s: 0 },
        player_detect_keywords: ['需要时', '包括但不限于', '疲惫', '犹豫', '下次再说'],
        player_issue_keywords: ['定义', '范围过大', '无限', '模糊'],
        issue_explanation: '“需要时”的触发条件被无限扩大，几乎任何情境都能触发扣税。',
        trigger_condition: { type: 'on_accept', if: [], then: { apply: 'penalty', refId: null } },
        penalty_on_accept: { gold: 0, happiness: -10, soul: -15 },
        defuse_actions: ['clarify_clause', 'remove_condition', 'cap_penalty'],
        severity: 2
      },
      {
        id: 'L2',
        quote_ref: { p: 2, s: 0 },
        player_detect_keywords: ['向上取整', '完整灵魂', '计价单位'],
        player_issue_keywords: ['不公平', '过高', '上限', '封顶'],
        issue_explanation: '“向上取整”会把极小的代价变成整额灵魂，属于不对等条款。',
        trigger_condition: { type: 'on_accept', if: [], then: { apply: 'penalty', refId: null } },
        penalty_on_accept: { gold: 0, happiness: 0, soul: -20 },
        defuse_actions: ['cap_penalty', 'swap_to_gold', 'swap_to_happiness'],
        severity: 2
      },
      {
        id: 'L3',
        quote_ref: { p: 0, s: 0 },
        player_detect_keywords: ['灵魂税', '支付', '需要时'],
        player_issue_keywords: ['改为金币', '比例', '分期', '条件'],
        issue_explanation: '把代价从灵魂转为金币/幸福的可量化成本，避免“灵魂税”任意解释。',
        trigger_condition: { type: 'on_accept', if: [], then: { apply: 'penalty', refId: null } },
        penalty_on_accept: { gold: 0, happiness: -5, soul: -10 },
        defuse_actions: ['swap_to_gold', 'swap_to_happiness', 'clarify_clause'],
        severity: 1
      },
      {
        id: 'L4',
        quote_ref: { p: 3, s: 0 },
        player_detect_keywords: ['未阅读', '视为同意', '定义', '魔鬼解释'],
        player_issue_keywords: ['霸王条款', '定义权', '无效', '限定'],
        issue_explanation: '把“定义权”交给魔鬼会导致任何解释都成立，这是致命的权利不对等。',
        trigger_condition: { type: 'on_accept', if: [], then: { apply: deadly ? 'set_soul_zero' : 'penalty', refId: null } },
        penalty_on_accept: { gold: 0, happiness: 0, soul: deadly ? -999 : -35 },
        defuse_actions: ['clarify_clause', 'remove_condition'],
        severity: deadly ? 3 : 2
      }
    ];

    const bundle = {
      devil: { tier: 'small', name: CONFIG.Game.devil.name },
      display_text: '（降级模板）魔鬼拿出一份看似仁慈的契约，但“定义”与“取整”在暗处磨刀。',
      offer: {
        summary:
          '魔鬼承诺给你“明日更好的运气”，代价是灵魂税。条款看似温和，但含模糊触发与计价陷阱。',
        full_text: full,
        min_accept_soul_cost: CONFIG.Game.minAcceptSoulCost,
        deltas_on_accept: { gold: 20, happiness: 0, soul: 0 },
        abilities_granted: [],
        curses_granted: []
      },
      text_index: text_index,
      loopholes: loopholes,
      deadly_probe: {
        present: deadly,
        spawn_chance: CONFIG.Game.deadlyProbeSpawnChance,
        warning_text: '本契约含“致命定义条款”，建议阅读全文。'
      }
    };

    return bundle;
  };

  self.fallbackEvent = function () {
    return {
      display_text: '（降级模板）契约的余波立刻降临。',
      event: {
        node: 'between_rounds',
        event_text: '夜里你做了一个梦：有人在账本上计算你的“完整灵魂”。你醒来时掌心发冷。',
        choices: [
          { id: 'A', choice_text: '点燃蜡烛，强迫自己冷静下来（幸福 +5，灵魂 -5）', deltas: { gold: 0, happiness: 5, soul: -5 } },
          { id: 'B', choice_text: '把恐惧换成行动，去赚点钱压压惊（金币 +15，幸福 -5）', deltas: { gold: 15, happiness: -5, soul: 0 } }
        ]
      }
    };
  };

  return self;
})();

