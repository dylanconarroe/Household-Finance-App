import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()


JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

JWT_ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_HOURS = 24


if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set"
    )


def hash_password(
    password: str
) -> str:
    return password_hash.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password
    )


def create_access_token(
    user_id: int
) -> str:

    expires_at = (
        datetime.now(
            timezone.utc
        )
        + timedelta(
            hours=ACCESS_TOKEN_EXPIRE_HOURS
        )
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(
    token: str
) -> int:

    payload = jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[
            JWT_ALGORITHM
        ],
    )

    user_id = payload.get(
        "sub"
    )

    if user_id is None:
        raise ValueError(
            "Token has no user ID"
        )

    return int(user_id)