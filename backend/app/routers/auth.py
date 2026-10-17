from fastapi import (
    APIRouter,
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

from app.schemas.user import (
    Token,
    User as UserSchema,
    UserCreate,
    UserLogin,
)

from app.services.auth import (
    create_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserSchema,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    email = (
        str(user_data.email)
        .strip()
        .lower()
    )

    existing_user = db.scalar(
        select(UserModel).where(
            UserModel.email == email
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=(
                "An account with this "
                "email already exists"
            ),
        )

    new_user = UserModel(
        email=email,

        password_hash=
            hash_password(
                user_data.password
            ),
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return new_user


@router.post(
    "/login",
    response_model=Token,
)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    email = (
        str(login_data.email)
        .strip()
        .lower()
    )

    user = db.scalar(
        select(UserModel).where(
            UserModel.email == email
        )
    )

    if (
        user is None
        or not verify_password(
            login_data.password,
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=(
                "Incorrect email "
                "or password"
            ),
        )

    access_token = (
        create_access_token(
            user.id
        )
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserSchema,
)
def get_me(
    current_user:
        UserModel
        = Depends(
            get_current_user
        ),
):
    return current_user