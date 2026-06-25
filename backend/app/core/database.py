from supabase import create_client, Client
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings


def get_supabase_client() -> Client:
    """Returns a configured Supabase client."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_chroma_client() -> chromadb.PersistentClient:
    """Returns a ChromaDB persistent client."""
    return chromadb.PersistentClient(
        path=settings.chroma_path,
        settings=ChromaSettings(
            anonymized_telemetry=False,
            allow_reset=True
        )
    )
