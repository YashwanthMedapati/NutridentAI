import logging
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("nutrident")

MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

GOOGLE_API_KEY_ENV = "GOOGLE_API_KEY"

RATE_LIMIT_DEFAULT = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")
RATE_LIMIT_EXTERNAL = os.getenv("RATE_LIMIT_EXTERNAL", "20/minute")
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() not in {"0", "false", "no"}

# Rate-limit counters live in-memory per process by default, which is fine for
# a single instance but resets independently on each worker/replica behind a
# load balancer. Set REDIS_URL (e.g. redis://host:6379/0) to share counters
# across instances instead.
REDIS_URL = os.getenv("REDIS_URL")


def split_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def google_api_key() -> str | None:
    return os.getenv(GOOGLE_API_KEY_ENV)


def usda_api_key() -> str | None:
    return os.getenv("USDA_API_KEY")
