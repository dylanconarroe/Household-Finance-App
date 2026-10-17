from sqlalchemy import (
    ForeignKey,
    String,
    UniqueConstraint,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.database import Base


class HouseholdUser(Base):
    __tablename__ = "household_users"

    __table_args__ = (
        UniqueConstraint(
            "household_id",
            "user_id",
            name="uq_household_user",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    household_id: Mapped[int] = mapped_column(
        ForeignKey(
            "households.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="member",
    )

    household = relationship(
        "Household",
        back_populates="user_memberships",
    )

    user = relationship(
        "User",
        back_populates="household_memberships",
    )