#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
API 连通性/有效性测试脚本（零依赖，Python 标准库）

支持：
- Google Gemini（Generative Language API / v1beta）
- OpenAI Compatible（/v1/chat/completions）
- 本地代理（本项目 proxy.py：/generate）

用法示例：
  # 1) Gemini（推荐用环境变量提供 Key）
  set GEMINI_API_KEY=YOUR_KEY
  python tools/test_api.py --provider gemini --model gemini-2.0-flash

  # 2) OpenAI Compatible
  set OPENAI_API_KEY=sk-...
  python tools/test_api.py --provider openai --base https://api.openai.com/v1 --model gpt-4.1-mini

  # 3) 本地代理（先运行 Deal with the Devi/proxy/run_proxy.bat）
  python tools/test_api.py --provider local_proxy --base http://127.0.0.1:8787 --model gemini-2.0-flash

退出码：
  0 成功
  2 参数/环境变量缺失
  3 HTTP/权限/配额等失败
  4 响应解析失败
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, Tuple


def _eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)


def _json_dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def _http_json(url: str, method: str, headers: Dict[str, str] | None, body_obj: Any | None) -> Tuple[int, Dict[str, Any]]:
    data = None
    if body_obj is not None:
        data = json.dumps(body_obj).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers=headers or {},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            status = getattr(resp, "status", 200)
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        raw = e.read().decode("utf-8", errors="replace")
    except Exception as e:
        raise RuntimeError(f"Network error: {e}") from e

    try:
        obj = json.loads(raw) if raw else {}
    except Exception as e:
        raise ValueError(f"Response is not JSON. HTTP {status}. Raw:\n{raw[:2000]}") from e

    return status, obj


def _classify_gemini_error(status: int, obj: Dict[str, Any]) -> str:
    err = obj.get("error") if isinstance(obj, dict) else None
    msg = ""
    code = ""
    st = ""
    if isinstance(err, dict):
        msg = str(err.get("message") or "")
        code = str(err.get("code") or "")
        st = str(err.get("status") or "")

    low = msg.lower()
    if "reported as leaked" in low:
        return (
            "Gemini 返回：Your API key was reported as leaked。\n"
            "结论：该 Key 已被服务端封禁/拒绝使用，必须更换新 Key。"
        )
    if status == 403 or st == "PERMISSION_DENIED":
        return (
            "Gemini 权限被拒绝（403 / PERMISSION_DENIED）。\n"
            "常见原因：Key 无效/被禁用、Key 做了来源限制（file:// Origin=null）、项目未启用 API、无模型权限。\n"
            f"message={msg}\ncode={code}\nstatus={st}"
        )
    if status == 429 or st == "RESOURCE_EXHAUSTED":
        return (
            "Gemini 被限流/配额耗尽（429 / RESOURCE_EXHAUSTED）。\n"
            f"message={msg}\ncode={code}\nstatus={st}"
        )
    return f"Gemini HTTP {status}: {msg} (code={code}, status={st})"


def test_gemini(base: str, model: str, api_key: str) -> int:
    base = base.rstrip("/")
    url = f"{base}/models/{model}:generateContent?key={api_key}"
    body = {
        "systemInstruction": {
            "parts": [{"text": "只输出一个 JSON 对象，不要任何其它文本。"}]
        },
        "contents": [{"role": "user", "parts": [{"text": "输出：{\"ok\":true,\"provider\":\"gemini\"}"}]}],
        "generationConfig": {"temperature": 0.0},
    }
    status, obj = _http_json(url, "POST", {"Content-Type": "application/json"}, body)
    if status < 200 or status >= 300:
        _eprint(_classify_gemini_error(status, obj))
        return 3

    # 尝试提取文本
    try:
        parts = obj["candidates"][0]["content"]["parts"]
        text = "".join([str(p.get("text") or "") for p in parts])
    except Exception:
        _eprint("Gemini 响应结构异常：\n" + _json_dumps(obj)[:2000])
        return 4

    print("OK: Gemini reachable.")
    print("Raw model text (truncated):")
    print(text[:800])
    return 0


def test_openai(base: str, model: str, api_key: str) -> int:
    base = base.rstrip("/")
    url = f"{base}/chat/completions"
    body = {
        "model": model,
        "temperature": 0.0,
        "messages": [
            {"role": "system", "content": "只输出一个 JSON 对象，不要任何其它文本。"},
            {"role": "user", "content": "输出：{\"ok\":true,\"provider\":\"openai\"}"},
        ],
    }
    status, obj = _http_json(
        url,
        "POST",
        {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        body,
    )
    if status < 200 or status >= 300:
        _eprint(f"OpenAI Compatible HTTP {status}:\n{_json_dumps(obj)[:2000]}")
        return 3

    try:
        text = obj["choices"][0]["message"]["content"]
    except Exception:
        _eprint("OpenAI 响应结构异常：\n" + _json_dumps(obj)[:2000])
        return 4

    print("OK: OpenAI-compatible reachable.")
    print("Raw model text (truncated):")
    print(str(text)[:800])
    return 0


def test_local_proxy(base: str, model: str) -> int:
    base = base.rstrip("/")
    url = f"{base}/generate"
    body = {
        "provider": "local_proxy",
        "model": model,
        "messages": [
            {"role": "system", "content": "只输出一个 JSON 对象，不要任何其它文本。"},
            {"role": "user", "content": "输出：{\"ok\":true,\"provider\":\"local_proxy\"}"},
        ],
    }
    status, obj = _http_json(url, "POST", {"Content-Type": "application/json"}, body)
    if status < 200 or status >= 300:
        _eprint(f"Local proxy HTTP {status}:\n{_json_dumps(obj)[:2000]}")
        return 3

    content = obj.get("content")
    if not isinstance(content, str):
        _eprint("代理响应缺少 content 字段：\n" + _json_dumps(obj)[:2000])
        return 4

    print("OK: local_proxy reachable.")
    print("Raw model text (truncated):")
    print(content[:800])
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--provider", choices=["gemini", "openai", "local_proxy"], required=True)
    p.add_argument("--base", default="")
    p.add_argument("--model", default="")
    args = p.parse_args()

    if args.provider == "gemini":
        base = args.base or "https://generativelanguage.googleapis.com/v1beta"
        model = args.model or "gemini-2.0-flash"
        key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            _eprint("缺少环境变量 GEMINI_API_KEY。")
            return 2
        return test_gemini(base, model, key)

    if args.provider == "openai":
        base = args.base or "https://api.openai.com/v1"
        model = args.model or "gpt-4.1-mini"
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            _eprint("缺少环境变量 OPENAI_API_KEY。")
            return 2
        return test_openai(base, model, key)

    if args.provider == "local_proxy":
        base = args.base or "http://127.0.0.1:8787"
        model = args.model or "gemini-2.0-flash"
        return test_local_proxy(base, model)

    _eprint("Unknown provider.")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

