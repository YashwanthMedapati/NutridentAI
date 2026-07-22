import time

from fastapi import Request

from .config import logger


async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=()")
    return response


async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    client = request.client.host if request.client else "unknown"
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.exception(
            "request failed method=%s path=%s client=%s duration_ms=%s",
            request.method, request.url.path, client, duration_ms,
        )
        raise
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    log_level = logger.warning if response.status_code >= 500 else logger.info
    log_level(
        "request method=%s path=%s status=%s client=%s duration_ms=%s",
        request.method, request.url.path, response.status_code, client, duration_ms,
    )
    return response
