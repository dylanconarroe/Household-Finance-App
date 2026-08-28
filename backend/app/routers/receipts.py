from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.receipt_parser import parse_receipt


router = APIRouter(
    prefix="/receipts",
    tags=["Receipts"]
)


@router.post("/parse")
async def parse_receipt_upload(
    file: UploadFile = File(...)
):
    if file.content_type not in {
        "image/jpeg",
        "image/png"
    }:
        raise HTTPException(
            status_code=400,
            detail="Receipt must be a JPEG or PNG image"
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded receipt is empty"
        )

    result = parse_receipt(image_bytes)

    return result