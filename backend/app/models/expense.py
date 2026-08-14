from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Date,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)

    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id"),
        nullable=False
    )

    paid_by: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False
    )

    merchant: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    expense_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    tax: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )

    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    items: Mapped[list["ExpenseItem"]] = relationship(
        back_populates="expense",
        cascade="all, delete-orphan"
    )


class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    expense_id: Mapped[int] = mapped_column(
        ForeignKey("expenses.id"),
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    expense: Mapped["Expense"] = relationship(
        back_populates="items"
    )

    splits: Mapped[list["ItemSplit"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan"
    )


class ItemSplit(Base):
    __tablename__ = "item_splits"

    __table_args__ = (
        UniqueConstraint(
            "item_id",
            "member_id",
            name="uq_item_member"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    item_id: Mapped[int] = mapped_column(
        ForeignKey("expense_items.id"),
        nullable=False
    )

    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    item: Mapped["ExpenseItem"] = relationship(
        back_populates="splits"
    )


