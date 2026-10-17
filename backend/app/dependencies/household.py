from fastapi import (
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db

from app.dependencies.auth import (
    get_current_user,
)

from app.models.user import (
    User as UserModel,
)

from app.models.household_user import (
    HouseholdUser as HouseholdUserModel,
)


def require_household_member(
    household_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(
        get_current_user
    ),
) -> HouseholdUserModel:

    membership = db.scalar(
        select(HouseholdUserModel).where(
            HouseholdUserModel.household_id
            == household_id,

            HouseholdUserModel.user_id
            == current_user.id,
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have access "
                "to this household."
            ),
        )

    return membership


def require_household_owner(
    membership: HouseholdUserModel = Depends(
        require_household_member
    ),
) -> HouseholdUserModel:

    if membership.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the household owner "
                "can perform this action."
            ),
        )

    return membership