from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.expense import (
    Expense as ExpenseModel,
    ExpenseItem as ExpenseItemModel,
    ItemSplit as ItemSplitModel
)

from app.models.household import (
    Household as HouseholdModel,
    Member as MemberModel
)

from app.schemas.expense import ExpenseCreate, Expense
from app.services.split import split_equally


router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"]
)


@router.post(
    "/",
    response_model=Expense,
    status_code=status.HTTP_201_CREATED
)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db)
):

    # Make sure household exists
    household = db.get(
        HouseholdModel,
        expense.household_id
    )

    if household is None:
        raise HTTPException(
            status_code=404,
            detail="Household not found"
        )

    # Make sure payer exists
    payer = db.get(
        MemberModel,
        expense.paid_by
    )

    if payer is None:
        raise HTTPException(
            status_code=404,
            detail="Payer not found"
        )

    # Get valid member IDs for this household
    household_member_ids = {
        member.id
        for member in household.members
    }

    # Make sure payer belongs to household
    if expense.paid_by not in household_member_ids:
        raise HTTPException(
            status_code=400,
            detail="Payer is not a member of this household"
        )

    # Must have at least one item
    if len(expense.items) == 0:
        raise HTTPException(
            status_code=400,
            detail="Expense must contain at least one item"
        )

    # Validate subtotal
    calculated_subtotal = sum(
        (item.amount for item in expense.items),
        Decimal("0.00")
    )

    if calculated_subtotal != expense.subtotal:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Item amounts add up to {calculated_subtotal}, "
                f"but subtotal is {expense.subtotal}"
            )
        )

    # Validate total
    calculated_total = expense.subtotal + expense.tax

    if calculated_total != expense.total:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Subtotal + tax equals {calculated_total}, "
                f"but total is {expense.total}"
            )
        )

    items = []

    for item in expense.items:

        # Every item needs someone responsible for it
        if len(item.split_between) == 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{item.description} must be split "
                    f"between at least one member"
                )
            )

        # Prevent duplicate roommate IDs
        if len(item.split_between) != len(set(item.split_between)):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{item.description} contains "
                    f"duplicate member IDs"
                )
            )

        # Make sure everyone belongs to this household
        invalid_members = (
            set(item.split_between)
            - household_member_ids
        )

        if invalid_members:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{item.description} contains members "
                    f"who do not belong to this household: "
                    f"{sorted(invalid_members)}"
                )
            )

        # HOUSE SPLIT DOES THE MATH
        calculated_splits = split_equally(
            item.amount,
            item.split_between
        )

        split_models = []

        for member_id, amount in calculated_splits.items():

            split_models.append(
                ItemSplitModel(
                    member_id=member_id,
                    amount=amount
                )
            )

        new_item = ExpenseItemModel(
            description=item.description,
            amount=item.amount,
            splits=split_models
        )

        items.append(new_item)

    new_expense = ExpenseModel(
        household_id=expense.household_id,
        paid_by=expense.paid_by,
        merchant=expense.merchant,
        expense_date=expense.expense_date,
        subtotal=expense.subtotal,
        tax=expense.tax,
        total=expense.total,
        items=items
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)

    return new_expense


@router.get("/{expense_id}", response_model=Expense)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):

    expense = db.get(
        ExpenseModel,
        expense_id
    )

    if expense is None:
        raise HTTPException(
            status_code=404,
            detail="Expense not found"
        )

    return expense