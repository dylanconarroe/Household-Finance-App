from decimal import Decimal

from pydantic import BaseModel


class SettlementPayment(BaseModel):
    from_member_id: int
    from_name: str

    to_member_id: int
    to_name: str

    amount: Decimal


class HouseholdSettlement(BaseModel):
    household_id: int
    payments: list[SettlementPayment]