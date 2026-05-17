"""LLM client wrapper around Groq's OpenAI-compatible API.

Lazy import so the rest of the app starts even when `groq` isn't installed yet.
"""
import os
from typing import Iterable, Optional

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_client = None


def get_client():
    global _client
    if _client is None:
        try:
            from groq import Groq  # type: ignore
        except ImportError:
            raise RuntimeError("`groq` is not installed. Run: pip install groq")
        if not GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY not set. Get a free key at https://console.groq.com/"
            )
        _client = Groq(api_key=GROQ_API_KEY)
    return _client


def is_configured() -> bool:
    if not GROQ_API_KEY:
        return False
    try:
        import groq  # noqa: F401
        return True
    except ImportError:
        return False


def chat(
    messages: list[dict],
    *,
    temperature: float = 0.4,
    max_tokens: int = 1024,
    tools: Optional[list] = None,
    tool_choice: Optional[str] = None,
) -> dict:
    client = get_client()
    kwargs = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        kwargs["tools"] = tools
        kwargs["tool_choice"] = tool_choice or "auto"
    try:
        resp = client.chat.completions.create(**kwargs)
    except Exception as e:
        # llama-3.3 occasionally emits raw "<function=foo{...}>" text instead of a structured
        # tool call, which Groq rejects with `tool_use_failed`. Try to recover the
        # intended call from the error payload so the agent loop can keep going.
        err = str(e)
        if "tool_use_failed" in err or "Failed to call a function" in err:
            import re, json as _json
            m = re.search(r"<function=(\w+)\s*(\{.*?\})\s*</?function>?", err)
            if m:
                fname, fargs = m.group(1), m.group(2)
                try:
                    _json.loads(fargs)  # validate
                    return {
                        "role": "assistant",
                        "content": "",
                        "tool_calls": [{
                            "id": f"recovered_{fname}",
                            "type": "function",
                            "function": {"name": fname, "arguments": fargs},
                        }],
                    }
                except Exception:
                    pass
            # last resort: drop tools and ask for a plain answer
            kwargs.pop("tools", None)
            kwargs.pop("tool_choice", None)
            resp = client.chat.completions.create(**kwargs)
        else:
            raise
    msg = resp.choices[0].message
    return {
        "role": msg.role,
        "content": msg.content or "",
        "tool_calls": [
            {
                "id": tc.id,
                "type": tc.type,
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in (msg.tool_calls or [])
        ],
    }


def stream_chat(messages: list[dict], *, temperature: float = 0.5) -> Iterable[str]:
    client = get_client()
    stream = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
