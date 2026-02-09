#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Deal with the Devi - 本地 LLM 代理（零依赖，Python 标准库）

用途：
- 让前端在 file:// 直开时也能稳定请求（代理加 CORS: *）
- API Key 不进入前端代码/浏览器存储，改用环境变量读取

运行：
  set GEMINI_API_KEY=你的key
  python proxy.py

默认监听：
  http://127.0.0.1:8787

前端配置：
  Provider = local_proxy
  API Base = http://127.0.0.1:8787
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import urllib.request
import urllib.error


HOST = "127.0.0.1"
PORT = 8787


def _json_response(handler, status, obj):
    data = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(data)


def _read_body_json(handler):
    length = int(handler.headers.get("Content-Length", "0") or "0")
    raw = handler.rfile.read(length).decode("utf-8") if length > 0 else ""
    return json.loads(raw) if raw else {}


def _gemini_generate_content(model, messages):
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY env var")

    base = "https://generativelanguage.googleapis.com/v1beta"

    system = None
    contents = []
    for m in messages or []:
        role = m.get("role")
        content = str(m.get("content") or "")
        if role == "system":
            system = content
        else:
            contents.append(
                {"role": "model" if role == "assistant" else "user", "parts": [{"text": content}]}
            )

    body = {
        "contents": contents,
        "generationConfig": {"temperature": 0.2},
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    url = f"{base}/models/{model}:generateContent?key={api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            txt = resp.read().decode("utf-8")
            data = json.loads(txt)
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(txt)
        except Exception:
            data = {"error": {"message": txt}}
        raise RuntimeError(f"Gemini HTTP {e.code}: {data}")

    parts = []
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except Exception:
        parts = []
    content = "".join([str(p.get("text") or "") for p in parts])
    return content


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path != "/generate":
            _json_response(self, 404, {"error": {"message": "Not found"}})
            return

        try:
            payload = _read_body_json(self)
            provider = payload.get("provider")
            model = payload.get("model")
            messages = payload.get("messages") or []

            if provider != "local_proxy":
                _json_response(self, 400, {"error": {"message": "provider must be local_proxy"}})
                return
            if not model:
                _json_response(self, 400, {"error": {"message": "missing model"}})
                return

            content = _gemini_generate_content(model, messages)
            _json_response(self, 200, {"content": content})
        except Exception as e:
            _json_response(self, 500, {"error": {"message": str(e)}})

    def log_message(self, fmt, *args):
        # 安静一点：避免刷屏
        return


def main():
    srv = HTTPServer((HOST, PORT), Handler)
    print(f"[proxy] listening on http://{HOST}:{PORT}")
    print("[proxy] set GEMINI_API_KEY env var before running")
    srv.serve_forever()


if __name__ == "__main__":
    main()

