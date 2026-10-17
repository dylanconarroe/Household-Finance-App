from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.household import Household as HouseholdModel
from app.models.household import Member as MemberModel
from app.schemas.household import (
    HouseholdCreate,
    HouseholdUpdate,
    Household,
    MemberCreate,
    MemberUpdate,
    Member,
)
from app.models.rule import SplitRule as SplitRuleModel
from app.models.bill_template import BillTemplate as BillTemplateModel
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

@router.patch(
    "/{household_id}",
    response_model=Household
)
def update_household(
    household_id: int,
    updates: HouseholdUpdate,
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

    name = updates.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Household name cannot be empty"
        )

    household.name = name

    db.commit()
    db.refresh(household)

    return household


@router.post(
    "/{household_id}/members",
    response_model=Household,
    status_code=status.HTTP_201_CREATED
)
def add_household_member(
    household_id: int,
    member_data: MemberCreate,
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

    name = member_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Member name cannot be empty"
        )

    duplicate_name = any(
        member.name.strip().lower()
        == name.lower()
        for member in household.members
    )

    if duplicate_name:
        raise HTTPException(
            status_code=400,
            detail="A member with that name already exists"
        )

    new_member = MemberModel(
        name=name
    )

    household.members.append(
        new_member
    )

    db.commit()
    db.refresh(household)

    return household


@router.patch(
    "/{household_id}/members/{member_id}",
    response_model=Member
)
def update_household_member(
    household_id: int,
    member_id: int,
    updates: MemberUpdate,
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

    member = next(
        (
            member
            for member in household.members
            if member.id == member_id
        ),
        None
    )

    if member is None:
        raise HTTPException(
            status_code=404,
            detail="Member not found in this household"
        )

    name = updates.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Member name cannot be empty"
        )

    duplicate_name = any(
        other_member.id != member_id
        and other_member.name.strip().lower()
        == name.lower()
        for other_member in household.members
    )

    if duplicate_name:
        raise HTTPException(
            status_code=400,
            detail="A member with that name already exists"
        )

    member.name = name

    db.commit()
    db.refresh(member)

    return member


@router.delete(
    "/{household_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def remove_household_member(
    household_id: int,
    member_id: int,
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

    member = next(
        (
            member
            for member in household.members
            if member.id == member_id
        ),
        None
    )

    if member is None:
        raise HTTPException(
            status_code=404,
            detail="Member not found in this household"
        )

    if len(household.members) <= 1:
        raise HTTPException(
            status_code=400,
            detail="A household must contain at least one member"
        )

    existing_expense = db.scalar(
        select(ExpenseModel.id)
        .where(
            ExpenseModel.household_id
            == household_id
        )
        .limit(1)
    )

    if existing_expense is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot remove a member while this household "
                "has saved expenses. Clear the household's "
                "expenses first."
            )
        )

    existing_rule = db.scalar(
        select(SplitRuleModel.id)
        .where(
            SplitRuleModel.household_id
            == household_id
        )
        .limit(1)
    )

    if existing_rule is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot remove a member while this household "
                "has split rules. Update or remove the rules first."
            )
        )

    existing_template = db.scalar(
        select(BillTemplateModel.id)
        .where(
            BillTemplateModel.household_id
            == household_id
        )
        .limit(1)
    )

    if existing_template is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Cannot remove a member while this household "
                "has saved bill templates. Update or remove "
                "the templates first."
            )
        )

    household.members.remove(
        member
    )

    db.flush()

    # If this member is not attached to any
    # other household, remove the orphaned
    # member record as well.
    if len(member.households) == 0:
        db.delete(member)

    db.commit()

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