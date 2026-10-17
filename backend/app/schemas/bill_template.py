from decimal import Decimal

from pydantic import BaseModel, Field


class BillTemplateCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    default_amount: Decimal = Field(ge=0)
    paid_by: int
    member_ids: list[int]


class BillTemplateUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100
    )

    default_amount: Decimal | None = Field(
        default=None,
        ge=0
    )

    paid_by: int | None = None

    member_ids: list[int] | None = None


class BillTemplateMember(BaseModel):
    member_id: int
    name: str


class BillTemplate(BaseModel):
    id: int
    household_id: int
    name: str
    default_amount: Decimal
    paid_by: int
    members: list[BillTemplateMember]