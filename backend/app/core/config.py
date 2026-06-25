from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    sec_user_agent: str = "FinancialResearchCopilot dev@example.com"
    chroma_path: str = "./chroma_db"

    class Config:
        env_file = ".env"


settings = Settings()
