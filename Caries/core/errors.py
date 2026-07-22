from fastapi import HTTPException, UploadFile

from .config import ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, logger


def internal_error(context: str, error: Exception) -> HTTPException:
    logger.exception("%s failed", context, exc_info=error)
    return HTTPException(status_code=500, detail="Unexpected server error. Please try again.")


async def read_validated_image(file: UploadFile) -> bytes:
    content_type = (file.content_type or "").split(";")[0].lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, WEBP, HEIC, or HEIF image.")

    contents = await file.read(MAX_IMAGE_BYTES + 1)
    if len(contents) > MAX_IMAGE_BYTES:
        max_mb = round(MAX_IMAGE_BYTES / (1024 * 1024), 1)
        raise HTTPException(status_code=413, detail=f"Image is too large. Maximum size is {max_mb} MB.")
    if not contents:
        raise HTTPException(status_code=422, detail="Uploaded image is empty.")
    return contents
