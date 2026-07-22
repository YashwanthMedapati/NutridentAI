from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import RATE_LIMIT_DEFAULT, RATE_LIMIT_ENABLED, REDIS_URL, logger


def _build_limiter() -> Limiter:
    common_kwargs = dict(
        key_func=get_remote_address,
        default_limits=[RATE_LIMIT_DEFAULT],
        enabled=RATE_LIMIT_ENABLED,
    )
    if REDIS_URL:
        try:
            built = Limiter(storage_uri=REDIS_URL, **common_kwargs)
            logger.info("Rate limiter using Redis-backed storage (shared across instances)")
            return built
        except Exception:
            logger.exception(
                "Failed to initialize Redis-backed rate limiter storage (REDIS_URL=%s); "
                "falling back to in-memory storage, which is NOT shared across instances",
                REDIS_URL,
            )
    return Limiter(**common_kwargs)


limiter = _build_limiter()
