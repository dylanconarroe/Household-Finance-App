from pydantic import BaseModel


class CategoryMappingCreate(BaseModel):
    household_id: int
    merchant: str
    description: str
    category: str
    product_code: str | None = None