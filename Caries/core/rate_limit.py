from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import RATE_LIMIT_DEFAULT, RATE_LIMIT_ENABLED

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[RATE_LIMIT_DEFAULT],
    enabled=RATE_LIMIT_ENABLED,
)
