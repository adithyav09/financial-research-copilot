"""Compatibility shim so RAGAS 0.2.x imports under this repo's langchain 1.x stack.

RAGAS 0.2.15 does a load-time ``from langchain_community.chat_models.vertexai import
ChatVertexAI``, but langchain-community 0.4.x removed that deprecated shim. We never use
Vertex in evals, so we register a stub module *before* RAGAS is imported. Importing this
module (for its side effect) at the top of any eval module that touches RAGAS is enough.

Remove this once RAGAS ships a release that no longer imports the deprecated path.
"""

import sys
import types

_MODULE = "langchain_community.chat_models.vertexai"

if _MODULE not in sys.modules:
    try:  # if the real module exists (older community), leave it alone
        __import__(_MODULE)
    except ImportError:
        stub = types.ModuleType(_MODULE)

        class ChatVertexAI:  # noqa: D401 - placeholder; never instantiated in evals
            """Stub for the removed langchain_community Vertex chat model."""

        stub.ChatVertexAI = ChatVertexAI
        sys.modules[_MODULE] = stub

# RAGAS calls nest_asyncio.apply() at import time. On Python 3.14 that patch breaks
# asyncio.current_task(), so every metric's asyncio.wait_for() raises
# "Timeout should be used inside a task". We run scoring in our own asyncio.run and
# never nest event loops, so neutralize apply() with a no-op registered before RAGAS
# imports nest_asyncio. Remove once nest_asyncio supports 3.14 (or RAGAS drops it).
if "nest_asyncio" not in sys.modules:
    _na = types.ModuleType("nest_asyncio")
    _na.apply = lambda *args, **kwargs: None
    sys.modules["nest_asyncio"] = _na
