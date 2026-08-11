from decimal import Decimal

from pydantic import BaseModel


class MemberBalance(BaseModel):
    member_id: int
    name: str
    paid: Decimal
    owed: Decimal
    balance: Decimal


class HouseholdBalances(BaseModel):
    household_id: int
    balances: list[MemberBalance]