"""Create the private `resumes` bucket. Run once: python -m scripts.setup_storage"""

from supabase import create_client

from app.core.config import MAX_UPLOAD_BYTES, STORAGE_BUCKET, get_settings


def main() -> None:
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    existing = {bucket.name for bucket in client.storage.list_buckets()}
    if STORAGE_BUCKET in existing:
        print(f"Bucket '{STORAGE_BUCKET}' already exists.")
        return
    client.storage.create_bucket(
        STORAGE_BUCKET, options={"public": False, "file_size_limit": MAX_UPLOAD_BYTES}
    )
    print(f"Created private bucket '{STORAGE_BUCKET}'.")


if __name__ == "__main__":
    main()
