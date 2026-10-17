import jwt

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.user import (
    User as UserModel,
)

from app.services.auth import (
    decode_access_token,
)


bearer_scheme = HTTPBearer()


def get_current_user(
    credentials:
        HTTPAuthorizationCredentials
        = Depends(bearer_scheme),

    db: Session = Depends(get_db),
) -> UserModel:

    token = credentials.credentials

    try:
        user_id = decode_access_token(
            token
        )

    except (
        jwt.InvalidTokenError,
        ValueError,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail=(
                "Invalid or expired "
                "access token"
            ),
        )

    user = db.get(
        UserModel,
        user_id
    )

    if user is None:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,

            detail="User not found",
        )

    return user