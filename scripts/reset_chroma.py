"""
Utility script to wipe all ChromaDB collections.
Run from the backend directory:
    python ../scripts/reset_chroma.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.chroma import get_chroma_client


def main():
    client = get_chroma_client()
    collections = client.list_collections()
    if not collections:
        print("No collections found. Nothing to reset.")
        return

    print(f"Found {len(collections)} collection(s):")
    for col in collections:
        print(f"  - {col.name}")

    confirm = input("\nDelete ALL collections? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        return

    for col in collections:
        client.delete_collection(col.name)
        print(f"  Deleted: {col.name}")

    print("Done.")


if __name__ == "__main__":
    main()
