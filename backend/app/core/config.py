from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    sec_user_agent: str = "FinancialResearchCopilot dev@example.com"
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    fred_api_key: str = ""

    # --- Shared usage/cost controls (replaces per-user token budgets) ---------
    # One application-wide monthly dollar budget for all model spend. Derived by
    # summing timestamped usage in the current calendar month — no manual reset.
    monthly_budget_usd: float = 20.0
    # Lightweight per-user safeguards so one user can't drain the shared budget.
    user_daily_budget_usd: float = 1.0     # per-user daily dollar cap (0 = off)
    user_daily_token_limit: int = 0        # optional per-user daily token cap (0 = off)
    rate_limit_per_minute: int = 20        # per-user request rate limit (0 = off)
    # Conservative per-query cost reserved up front so concurrent requests can't
    # overspend before their actual cost is known; reconciled to actual after.
    max_cost_per_query_usd: float = 0.05
    # Optional model-price overrides ($ per 1K tokens) for the active llm_model.
    # When 0, pricing falls back to the observability price table. Prompt and
    # completion are priced separately so cost isn't a naive token count.
    cost_input_per_1k: float = 0.0
    cost_output_per_1k: float = 0.0

    # --- Budget policy (explicit + configurable) --------------------------------
    # On a budget-infra error (DB/RPC unavailable): True = allow the request and
    # record usage afterward (demo stays up); False = block with 503 (strict).
    budget_fail_open: bool = True
    # Whether ingestion (embedding) spend counts against the shared budget.
    ingest_counts_toward_budget: bool = True

    # --- Online evaluators (cheap, non-LLM per-request quality signals) ----------
    online_eval_enabled: bool = True

    # --- Distributed rate limiting (Redis) --------------------------------------
    # Redis makes the per-user rate limit correct across multiple app instances.
    # Leave REDIS_URL blank for local/dev/test — the limiter falls back to a
    # process-local limiter (single-instance only). Use rediss:// for TLS.
    redis_url: str = ""                     # e.g. redis://localhost:6379/0 (blank = in-memory)
    redis_namespace: str = "frc"            # key prefix, prevents cross-app collisions
    redis_socket_timeout_ms: int = 100      # per-command timeout (keeps the hot path fast)
    redis_connect_timeout_ms: int = 200
    redis_max_connections: int = 10         # connection pool size
    # Behavior when Redis errors/timeouts: local (process-local bounded fallback,
    # DEGRADED not distributed) | closed (reject) | open (allow). Default 'local'.
    rate_limit_fail_mode: str = "local"

    # Observability (structured logging + metrics). Works with no external infra.
    log_level: str = "INFO"          # DEBUG | INFO | WARNING | ERROR
    log_json: bool = True            # one JSON line per event (set False for dev)
    release_version: str = ""        # git sha / release tag; stamped on every event
    redact_prompt_content: bool = False  # True drops prompt/question text from logs

    # Arize AX observability (tracing). Leave space_id/api_key blank to disable.
    arize_space_id: str = ""
    arize_api_key: str = ""
    arize_project_name: str = "financial-research-copilot"
    arize_region: str = "US"  # US | EU | Canada
    arize_otlp_endpoint: str = ""  # explicit OTLP endpoint; overrides arize_region when set
    # Service-account key for the Arize management API (datasets/experiments) — used
    # only by evals/push_to_arize.py, distinct from arize_api_key (trace ingestion).
    arize_svc_key: str = ""
    # Management API host. GCP-cluster accounts (us-central-1a) are served via the
    # generic api.arize.com; AWS accounts use api.<region>.arize.com. Not the OTLP host.
    arize_api_host: str = "api.arize.com"

    # Offline eval harness (evals/). A stronger judge than the pipeline model
    # avoids a model grading its own output. Only read by evals/, never by the app.
    eval_judge_model: str = "gpt-4o"

    class Config:
        env_file = ".env"


settings = Settings()
