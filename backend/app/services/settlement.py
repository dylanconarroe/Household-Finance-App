from decimal import Decimal

from app.schemas.balance import MemberBalance
from app.schemas.settlement import SettlementPayment


def calculate_settlement(
    balances: list[MemberBalance]
) -> list[SettlementPayment]:

    creditors = []
    debtors = []

    for member in balances:

        if member.balance > Decimal("0.00"):
            creditors.append({
                "member_id": member.member_id,
                "name": member.name,
                "amount": member.balance
            })

        elif member.balance < Decimal("0.00"):
            debtors.append({
                "member_id": member.member_id,
                "name": member.name,
                "amount": -member.balance
            })

    payments = []

    creditor_index = 0
    debtor_index = 0

    while (
        creditor_index < len(creditors)
        and debtor_index < len(debtors)
    ):

        creditor = creditors[creditor_index]
        debtor = debtors[debtor_index]

        payment_amount = min(
            creditor["amount"],
            debtor["amount"]
        )

        payments.append(
            SettlementPayment(
                from_member_id=debtor["member_id"],
                from_name=debtor["name"],
                to_member_id=creditor["member_id"],
                to_name=creditor["name"],
                amount=payment_amount
            )
        )

        creditor["amount"] -= payment_amount
        debtor["amount"] -= payment_amount

        if creditor["amount"] == Decimal("0.00"):
            creditor_index += 1

        if debtor["amount"] == Decimal("0.00"):
            debtor_index += 1

    return payments