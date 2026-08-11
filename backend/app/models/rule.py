from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.household import Member


class SplitRule(Base):
    __tablename__ = "split_rules"

    __table_args__ = (
        UniqueConstraint(
            "household_id",
            "match_type",
            "match_value",
            name="uq_household_rule_match"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id"),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    match_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    match_value: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    split_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="equal"
    )

    members: Mapped[list["SplitRuleMember"]] = relationship(
        back_populates="rule",
        cascade="all, delete-orphan"
    )


class SplitRuleMember(Base):
    __tablename__ = "split_rule_members"

    __table_args__ = (
        UniqueConstraint(
            "rule_id",
            "member_id",
            name="uq_rule_member"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    rule_id: Mapped[int] = mapped_column(
        ForeignKey("split_rules.id"),
        nullable=False
    )

    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False
    )

    rule: Mapped["SplitRule"] = relationship(
        back_populates="members"
    )

    member: Mapped[Member] = relationship()