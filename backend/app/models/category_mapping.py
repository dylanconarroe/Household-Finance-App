from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CategoryMapping(Base):
    __tablename__ = "category_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)

    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id"),
        nullable=False
    )

    merchant: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    product_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    description: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    normalized_description: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )