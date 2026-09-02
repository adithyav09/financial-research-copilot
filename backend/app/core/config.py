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
    max_token_budget_grant: int = 200000

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
