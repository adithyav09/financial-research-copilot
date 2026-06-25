from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    sec_user_agent: str = "FinancialResearchCopilot dev@example.com"
    chroma_path: str = "./chroma_db"
    supabase_url: str = ""
    supabase_service_key: str = ""
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5

    class Config:
        env_file = ".env"


settings = Settings()
