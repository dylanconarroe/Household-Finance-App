from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.household import Household as HouseholdModel
from app.models.household import Member as MemberModel
from app.schemas.household import HouseholdCreate, Household
from app.models.expense import Expense as ExpenseModel
from app.schemas.balance import HouseholdBalances, MemberBalance
from app.schemas.settlement import HouseholdSettlement
from app.services.settlement import calculate_settlement
from app.services.split import split_equally

from decimal import Decimal

from sqlalchemy import select


router = APIRouter(
    prefix="/households",
    tags=["Households"]
)


@router.post("/", response_model=Household)
def create_household(
    household: HouseholdCreate,
    db: Session = Depends(get_db)
):

    members = []

    for member in household.members:
        new_member = MemberModel(
            name=member.name
        )

        members.append(new_member)

    new_household = HouseholdModel(
        name=household.name,
        members=members
    )

    db.add(new_household)
    db.commit()
    db.refresh(new_household)

    return new_household

@router.get(
    "/",
    response_model=list[Household]
)
def get_households(
    db: Session = Depends(get_db)
):
    households = db.scalars(
        select(HouseholdModel)
    ).all()

    return households


@router.get("/{household_id}", response_model=Household)
def get_household(
    household_id: int,
    db: Session = Depends(get_db)
):

    household = db.get(
        HouseholdModel,
        household_id
    )

    if household is None:
        raise HTTPException(
            status_code=404,
            detail="Household not found"
        )

    return household

@router.get(
    "/{household_id}/balances",
    response_model=HouseholdBalances
)
def get_household_balances(
    household_id: int,
    db: Session = Depends(get_db)
):

    household = db.get(
        HouseholdModel,
        household_id
    )

    if household is None:
        raise HTTPException(
            status_code=404,
            detail="Household not found"
        )

    balances = {}

    # Start everybody at zero
    for member in household.members:
        balances[member.id] = {
            "member_id": member.id,
            "name": member.name,
            "paid": Decimal("0.00"),
            "owed": Decimal("0.00")
        }

    household_member_ids = {
        member.id
        for member in household.members
    }

    # Get every expense belonging to this household
    expenses = db.scalars(
        select(ExpenseModel).where(
            ExpenseModel.household_id == household_id
        )
    ).all()

    for expense in expenses:

        # Money this roommate actually paid
        balances[expense.paid_by]["paid"] += expense.total

        # Money each roommate owes for purchased items
        for item in expense.items:

            for split in item.splits:

                balances[split.member_id]["owed"] += split.amount

        # Split the total receipt tax equally
        tax_splits = split_equally(
            expense.tax,
            list(household_member_ids)
        )

        for member_id, tax_amount in tax_splits.items():
            balances[member_id]["owed"] += tax_amount

    result = []

    for member_data in balances.values():

        balance = (
            member_data["paid"]
            - member_data["owed"]
        )

        result.append(
            MemberBalance(
                member_id=member_data["member_id"],
                name=member_data["name"],
                paid=member_data["paid"],
                owed=member_data["owed"],
                balance=balance
            )
        )

    return HouseholdBalances(
        household_id=household_id,
        balances=result
    )

@router.get(
    "/{household_id}/settlement",
    response_model=HouseholdSettlement
)
def get_household_settlement(
    household_id: int,
    db: Session = Depends(get_db)
):

    balance_result = get_household_balances(
        household_id,
        db
    )

    total_balance = sum(
        (
            member.balance
            for member in balance_result.balances
        ),
        Decimal("0.00")
    )

    if total_balance != Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail=(
                "Household balances do not add up to zero. "
                "Settlement cannot be calculated."
            )
        )

    payments = calculate_settlement(
        balance_result.balances
    )

    return HouseholdSettlement(
        household_id=household_id,
        payments=payments
    )