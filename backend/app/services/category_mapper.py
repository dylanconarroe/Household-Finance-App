import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category_mapping import CategoryMapping


def normalize_description(description: str) -> str:
    description = description.strip().lower()

    # Replace repeated whitespace with a single space
    description = re.sub(r"\s+", " ", description)

    return description


def find_saved_category(
    db: Session,
    household_id: int,
    merchant: str,
    description: str,
    product_code: str | None = None
) -> str | None:

    normalized = normalize_description(description)
    merchant = merchant.strip().lower()

    # 1. Best match: merchant + product code
    if product_code is not None:
        mapping = db.scalar(
            select(CategoryMapping).where(
                CategoryMapping.household_id == household_id,
                CategoryMapping.merchant == merchant,
                CategoryMapping.product_code == product_code
            )
        )

        if mapping is not None:
            return mapping.category

    # 2. Same merchant + same normalized description
    mapping = db.scalar(
        select(CategoryMapping).where(
            CategoryMapping.household_id == household_id,
            CategoryMapping.merchant == merchant,
            CategoryMapping.normalized_description == normalized
        )
    )

    if mapping is not None:
        return mapping.category

    # 3. Same product description seen at another merchant
    mapping = db.scalar(
        select(CategoryMapping).where(
            CategoryMapping.household_id == household_id,
            CategoryMapping.normalized_description == normalized
        )
    )

    if mapping is not None:
        return mapping.category

    return None

def save_category_mapping(
    db: Session,
    household_id: int,
    merchant: str,
    description: str,
    category: str,
    product_code: str | None = None
) -> CategoryMapping:

    normalized = normalize_description(description)
    merchant = merchant.strip().lower()
    category = category.strip().lower()

    mapping = CategoryMapping(
        household_id=household_id,
        merchant=merchant,
        product_code=product_code,
        description=description.strip(),
        normalized_description=normalized,
        category=category
    )

    db.add(mapping)
    db.commit()
    db.refresh(mapping)

    return mapping