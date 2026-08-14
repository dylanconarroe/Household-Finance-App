from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ExpenseItemCreate(BaseModel):
    description: str
    amount: Decimal
    category: str
    split_between: list[int] | None = None
    save_rule: bool = False


class ItemSplit(BaseModel):
    id: int
    member_id: int
    amount: Decimal

    model_config = ConfigDict(from_attributes=True)


class ExpenseItem(BaseModel):
    id: int
    description: str
    amount: Decimal
    category: str
    splits: list[ItemSplit]

    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    household_id: int
    paid_by: int
    merchant: str
    expense_date: date
    subtotal: Decimal
    tax: Decimal = Decimal("0.00")
    total: Decimal
    items: list[ExpenseItemCreate]


class Expense(BaseModel):
    id: int
    household_id: int
    paid_by: int
    merchant: str
    expense_date: date
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    items: list[ExpenseItem]

    model_config = ConfigDict(from_attributes=True)