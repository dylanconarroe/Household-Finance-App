from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rule import SplitRule as SplitRuleModel
from app.services.category_mapper import (
    find_saved_category,
    save_category_mapping
)
from app.services.item_categorizer import categorize_item
from app.services.receipt_parser import parse_receipt
from app.schemas.category_mapping import CategoryMappingCreate


router = APIRouter(
    prefix="/receipts",
    tags=["Receipts"]
)


@router.post("/parse")
async def parse_receipt_upload(
    household_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
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

    merchant = result.get("merchant") or "unknown"

    # Get the categories this household already uses
    rules = db.scalars(
        select(SplitRuleModel).where(
            SplitRuleModel.household_id == household_id,
            SplitRuleModel.match_type == "category"
        )
    ).all()

    categories = sorted({
        rule.match_value.strip().lower()
        for rule in rules
    })

    for item in result["items"]:

        # 1. Try saved mapping first
        category = find_saved_category(
            db=db,
            household_id=household_id,
            merchant=merchant,
            description=item["description"],
            product_code=item.get("product_code")
        )

        if category is not None:
            item["category"] = category
            item["category_source"] = "saved"
            continue

        # 2. Otherwise ask local AI
        category = categorize_item(
            merchant=merchant,
            description=item["description"],
            categories=categories
        )

        if category is not None:
            item["category"] = category
            item["category_source"] = "ai"
        else:
            item["category"] = None
            item["category_source"] = "unknown"

    return result


@router.post("/category-mappings")
def confirm_category_mapping(
    mapping: CategoryMappingCreate,
    db: Session = Depends(get_db)
):
    category = mapping.category.strip().lower()

    # Make sure this category has a splitting rule
    rule = db.scalar(
        select(SplitRuleModel).where(
            SplitRuleModel.household_id == mapping.household_id,
            SplitRuleModel.match_type == "category",
            SplitRuleModel.match_value == category
        )
    )

    if rule is None:
        raise HTTPException(
            status_code=400,
            detail=f"No splitting rule exists for category '{category}'"
        )

    saved_mapping = save_category_mapping(
        db=db,
        household_id=mapping.household_id,
        merchant=mapping.merchant,
        description=mapping.description,
        category=category,
        product_code=mapping.product_code
    )

    return {
        "id": saved_mapping.id,
        "merchant": saved_mapping.merchant,
        "product_code": saved_mapping.product_code,
        "description": saved_mapping.description,
        "category": saved_mapping.category
    }