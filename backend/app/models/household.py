from sqlalchemy import ForeignKey, String, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


household_members = Table(
    "household_members",
    Base.metadata,
    Column(
        "household_id",
        ForeignKey("households.id"),
        primary_key=True
    ),
    Column(
        "member_id",
        ForeignKey("members.id"),
        primary_key=True
    )
)


class Household(Base):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    members: Mapped[list["Member"]] = relationship(
        secondary=household_members,
        back_populates="households"
    )


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    households: Mapped[list["Household"]] = relationship(
        secondary=household_members,
        back_populates="members"
    )