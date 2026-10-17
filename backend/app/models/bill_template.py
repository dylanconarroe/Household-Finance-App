from decimal import Decimal

from sqlalchemy import (
    Column,
    ForeignKey,
    Numeric,
    String,
    Table,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


bill_template_members = Table(
    "bill_template_members",
    Base.metadata,
    Column(
        "bill_template_id",
        ForeignKey("bill_templates.id", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "member_id",
        ForeignKey("members.id"),
        primary_key=True
    )
)


class BillTemplate(Base):
    __tablename__ = "bill_templates"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id"),
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    default_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    paid_by: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False
    )

    household = relationship(
        "Household"
    )

    payer = relationship(
        "Member",
        foreign_keys=[paid_by]
    )

    members = relationship(
        "Member",
        secondary=bill_template_members
    )