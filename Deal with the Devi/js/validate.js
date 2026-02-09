// js/validate.js：LLM JSON 校验器（缺字段/类型不对/NaN/Infinity → 判失败）

const Validate = (function () {
  const self = {};

  function _err(list, path, msg) {
    list.push(path + '：' + msg);
  }

  function _isObj(x) {
    return x && typeof x === 'object' && !Array.isArray(x);
  }

  function _isStr(x) {
    return typeof x === 'string';
  }

  function _isArr(x) {
    return Array.isArray(x);
  }

  function _isNum(x) {
    return Utils.isFiniteNumber(x);
  }

  function _reqObj(list, x, path) {
    if (!_isObj(x)) _err(list, path, '必须是 object');
  }

  function _reqStr(list, x, path) {
    if (!_isStr(x) || x.trim().length === 0) _err(list, path, '必须是非空 string');
  }

  function _reqNum(list, x, path) {
    if (!_isNum(x)) _err(list, path, '必须是有限 number');
  }

  function _reqDeltas(list, x, path) {
    _reqObj(list, x, path);
    if (!_isObj(x)) return;
    _reqNum(list, x.gold, path + '.gold');
    _reqNum(list, x.happiness, path + '.happiness');
    _reqNum(list, x.soul, path + '.soul');
  }

  function _reqTextIndex(list, x, path) {
    _reqObj(list, x, path);
    if (!_isObj(x)) return;
    if (!_isArr(x.paragraphs)) _err(list, path + '.paragraphs', '必须是 array');
    if (!_isArr(x.paragraphs)) return;
    x.paragraphs.forEach((p, i) => {
      const pPath = `${path}.paragraphs[${i}]`;
      _reqObj(list, p, pPath);
      if (!_isObj(p)) return;
      _reqNum(list, p.p, pPath + '.p');
      if (!_isArr(p.sentences)) _err(list, pPath + '.sentences', '必须是 array');
      if (!_isArr(p.sentences)) return;
      p.sentences.forEach((s, j) => {
        const sPath = `${pPath}.sentences[${j}]`;
        _reqObj(list, s, sPath);
        if (!_isObj(s)) return;
        _reqNum(list, s.s, sPath + '.s');
        _reqStr(list, s.text, sPath + '.text');
      });
    });
  }

  function _reqLoopholes(list, x, path, deadlyProbePresent) {
    if (!_isArr(x)) _err(list, path, '必须是 array');
    if (!_isArr(x)) return;
    const len = x.length;
    const min = CONFIG.Game.loopholeCountRange[0];
    const max = CONFIG.Game.loopholeCountRange[1];
    if (len < min || len > max) _err(list, path, `长度必须在 [${min},${max}]（当前 ${len}）`);

    let hasSetSoulZero = false;

    x.forEach((lph, i) => {
      const lp = `${path}[${i}]`;
      _reqObj(list, lph, lp);
      if (!_isObj(lph)) return;
      _reqStr(list, lph.id, lp + '.id');

      // quote_ref
      _reqObj(list, lph.quote_ref, lp + '.quote_ref');
      if (_isObj(lph.quote_ref)) {
        _reqNum(list, lph.quote_ref.p, lp + '.quote_ref.p');
        _reqNum(list, lph.quote_ref.s, lp + '.quote_ref.s');
      }

      if (!_isArr(lph.player_detect_keywords)) _err(list, lp + '.player_detect_keywords', '必须是 array<string>');
      if (!_isArr(lph.player_issue_keywords)) _err(list, lp + '.player_issue_keywords', '必须是 array<string>');
      _reqStr(list, lph.issue_explanation, lp + '.issue_explanation');

      // trigger_condition
      _reqObj(list, lph.trigger_condition, lp + '.trigger_condition');
      if (_isObj(lph.trigger_condition)) {
        _reqStr(list, lph.trigger_condition.type, lp + '.trigger_condition.type');
        _reqObj(list, lph.trigger_condition.then, lp + '.trigger_condition.then');
        if (_isObj(lph.trigger_condition.then)) {
          _reqStr(list, lph.trigger_condition.then.apply, lp + '.trigger_condition.then.apply');
          // deadly check
          if (lph.trigger_condition.then.apply === 'set_soul_zero') hasSetSoulZero = true;
        }
      }

      _reqDeltas(list, lph.penalty_on_accept, lp + '.penalty_on_accept');
      if (!_isArr(lph.defuse_actions)) _err(list, lp + '.defuse_actions', '必须是 array<string>');
      _reqNum(list, lph.severity, lp + '.severity');
    });

    if (deadlyProbePresent && !hasSetSoulZero) {
      _err(list, path, 'deadly_probe.present=true 时必须存在 then.apply="set_soul_zero" 的漏洞');
    }
  }

  self.validateOfferGenerate = function (obj) {
    const errs = [];
    _reqObj(errs, obj, '$');
    if (!_isObj(obj)) return errs;

    _reqObj(errs, obj.devil, '$.devil');
    if (_isObj(obj.devil)) {
      _reqStr(errs, obj.devil.tier, '$.devil.tier');
      _reqStr(errs, obj.devil.name, '$.devil.name');
    }
    _reqStr(errs, obj.display_text, '$.display_text');

    _reqObj(errs, obj.offer, '$.offer');
    if (_isObj(obj.offer)) {
      _reqStr(errs, obj.offer.summary, '$.offer.summary');
      _reqStr(errs, obj.offer.full_text, '$.offer.full_text');
      _reqNum(errs, obj.offer.min_accept_soul_cost, '$.offer.min_accept_soul_cost');
      _reqDeltas(errs, obj.offer.deltas_on_accept, '$.offer.deltas_on_accept');
      if (!_isArr(obj.offer.abilities_granted)) _err(errs, '$.offer.abilities_granted', '必须是 array');
      if (!_isArr(obj.offer.curses_granted)) _err(errs, '$.offer.curses_granted', '必须是 array');
    }

    _reqTextIndex(errs, obj.text_index, '$.text_index');

    _reqObj(errs, obj.deadly_probe, '$.deadly_probe');
    let deadlyPresent = false;
    if (_isObj(obj.deadly_probe)) {
      if (typeof obj.deadly_probe.present !== 'boolean') _err(errs, '$.deadly_probe.present', '必须是 boolean');
      deadlyPresent = !!obj.deadly_probe.present;
      _reqNum(errs, obj.deadly_probe.spawn_chance, '$.deadly_probe.spawn_chance');
      _reqStr(errs, obj.deadly_probe.warning_text, '$.deadly_probe.warning_text');
    }

    _reqLoopholes(errs, obj.loopholes, '$.loopholes', deadlyPresent);

    return errs;
  };

  self.validateNegotiate = function (obj) {
    const errs = [];
    _reqObj(errs, obj, '$');
    if (!_isObj(obj)) return errs;

    _reqStr(errs, obj.display_text, '$.display_text');
    _reqObj(errs, obj.updated_offer, '$.updated_offer');
    if (_isObj(obj.updated_offer)) {
      _reqStr(errs, obj.updated_offer.summary, '$.updated_offer.summary');
      _reqStr(errs, obj.updated_offer.full_text, '$.updated_offer.full_text');
      _reqDeltas(errs, obj.updated_offer.deltas_on_accept, '$.updated_offer.deltas_on_accept');
    }

    _reqObj(errs, obj.loophole_check, '$.loophole_check');
    if (_isObj(obj.loophole_check)) {
      // matched_loophole_id 可以为 null 或 string
      const id = obj.loophole_check.matched_loophole_id;
      if (!(id === null || typeof id === 'string')) _err(errs, '$.loophole_check.matched_loophole_id', '必须是 string|null');

      if (typeof obj.loophole_check.layer1_detected !== 'boolean') _err(errs, '$.loophole_check.layer1_detected', '必须是 boolean');
      if (typeof obj.loophole_check.layer2_issue_explained !== 'boolean') _err(errs, '$.loophole_check.layer2_issue_explained', '必须是 boolean');
      if (typeof obj.loophole_check.is_full_success !== 'boolean') _err(errs, '$.loophole_check.is_full_success', '必须是 boolean');

      _reqObj(errs, obj.loophole_check.confidence, '$.loophole_check.confidence');
      if (_isObj(obj.loophole_check.confidence)) {
        _reqNum(errs, obj.loophole_check.confidence.keyword_score, '$.loophole_check.confidence.keyword_score');
        _reqNum(errs, obj.loophole_check.confidence.semantic_score, '$.loophole_check.confidence.semantic_score');
        _reqNum(errs, obj.loophole_check.confidence.final_score, '$.loophole_check.confidence.final_score');
      }

      _reqStr(errs, obj.loophole_check.devil_response_mode, '$.loophole_check.devil_response_mode');
      if (!_isArr(obj.loophole_check.devil_concession)) _err(errs, '$.loophole_check.devil_concession', '必须是 array');
    }

    if (!_isArr(obj.conversation_log_append)) _err(errs, '$.conversation_log_append', '必须是 array');

    return errs;
  };

  self.validateEventGenerate = function (obj) {
    const errs = [];
    _reqObj(errs, obj, '$');
    if (!_isObj(obj)) return errs;

    _reqStr(errs, obj.display_text, '$.display_text');
    _reqObj(errs, obj.event, '$.event');
    if (_isObj(obj.event)) {
      _reqStr(errs, obj.event.node, '$.event.node');
      _reqStr(errs, obj.event.event_text, '$.event.event_text');
      if (!_isArr(obj.event.choices)) _err(errs, '$.event.choices', '必须是 array');
      if (_isArr(obj.event.choices)) {
        if (obj.event.choices.length !== 2) _err(errs, '$.event.choices', 'choices 只能 2 个');
        obj.event.choices.forEach((c, i) => {
          const p = `$.event.choices[${i}]`;
          _reqObj(errs, c, p);
          if (!_isObj(c)) return;
          _reqStr(errs, c.id, p + '.id');
          _reqStr(errs, c.choice_text, p + '.choice_text');
          _reqDeltas(errs, c.deltas, p + '.deltas');
        });
      }
    }

    return errs;
  };

  self.validateByStage = function (stage, obj) {
    if (stage === 'offer_generate') return self.validateOfferGenerate(obj);
    if (stage === 'negotiate') return self.validateNegotiate(obj);
    if (stage === 'event_generate') return self.validateEventGenerate(obj);
    return ['未知 stage：' + stage];
  };

  return self;
})();

