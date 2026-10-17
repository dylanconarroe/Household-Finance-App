from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.household import (
    Household as HouseholdModel,
)

from app.models.bill_template import (
    BillTemplate as BillTemplateModel,
)

from app.schemas.bill_template import (
    BillTemplate,
    BillTemplateCreate,
    BillTemplateMember,
    BillTemplateUpdate,
)


router = APIRouter(
    prefix="/households/{household_id}/bill-templates",
    tags=["Bill Templates"]
)


def bill_template_to_response(
    template: BillTemplateModel
) -> BillTemplate:
    return BillTemplate(
        id=template.id,
        household_id=template.household_id,
        name=template.name,
        default_amount=template.default_amount,
        paid_by=template.paid_by,
        members=[
            BillTemplateMember(
                member_id=member.id,
                name=member.name
            )
            for member in template.members
        ]
    )


def get_household_or_404(
    household_id: int,
    db: Session
):
    household = db.get(
        HouseholdModel,
        household_id
    )

    if household is None:
        raise HTTPException(
            status_code=404,
            detail="Household not found"
        )

    return household


def validate_member_ids(
    member_ids: list[int],
    household: HouseholdModel
):
    if len(member_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="Bill template must contain at least one member"
        )

    if len(member_ids) != len(set(member_ids)):
        raise HTTPException(
            status_code=400,
            detail="Bill template contains duplicate member IDs"
        )

    household_member_ids = {
        member.id
        for member in household.members
    }

    invalid_members = (
        set(member_ids)
        - household_member_ids
    )

    if invalid_members:
        raise HTTPException(
            status_code=400,
            detail=(
                "Bill template contains members who do not belong "
                f"to this household: {sorted(invalid_members)}"
            )
        )


def validate_payer(
    paid_by: int,
    household: HouseholdModel
):
    household_member_ids = {
        member.id
        for member in household.members
    }

    if paid_by not in household_member_ids:
        raise HTTPException(
            status_code=400,
            detail="Payer does not belong to this household"
        )


@router.get(
    "/",
    response_model=list[BillTemplate]
)
def get_bill_templates(
    household_id: int,
    db: Session = Depends(get_db)
):
    get_household_or_404(
        household_id,
        db
    )

    templates = (
        db.query(BillTemplateModel)
        .filter(
            BillTemplateModel.household_id
            == household_id
        )
        .order_by(
            BillTemplateModel.name
        )
        .all()
    )

    return [
        bill_template_to_response(template)
        for template in templates
    ]


@router.post(
    "/",
    response_model=BillTemplate,
    status_code=status.HTTP_201_CREATED
)
def create_bill_template(
    household_id: int,
    template_data: BillTemplateCreate,
    db: Session = Depends(get_db)
):
    household = get_household_or_404(
        household_id,
        db
    )

    name = template_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Bill template name cannot be empty"
        )

    validate_payer(
        template_data.paid_by,
        household
    )

    validate_member_ids(
        template_data.member_ids,
        household
    )

    members_by_id = {
        member.id: member
        for member in household.members
    }

    template = BillTemplateModel(
        household_id=household_id,
        name=name,
        default_amount=template_data.default_amount,
        paid_by=template_data.paid_by,
        members=[
            members_by_id[member_id]
            for member_id in template_data.member_ids
        ]
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return bill_template_to_response(
        template
    )


@router.patch(
    "/{template_id}",
    response_model=BillTemplate
)
def update_bill_template(
    household_id: int,
    template_id: int,
    updates: BillTemplateUpdate,
    db: Session = Depends(get_db)
):
    household = get_household_or_404(
        household_id,
        db
    )

    template = db.get(
        BillTemplateModel,
        template_id
    )

    if (
        template is None
        or template.household_id != household_id
    ):
        raise HTTPException(
            status_code=404,
            detail="Bill template not found"
        )

    if updates.name is not None:
        name = updates.name.strip()

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Bill template name cannot be empty"
            )

        template.name = name

    if updates.default_amount is not None:
        template.default_amount = (
            updates.default_amount
        )

    if updates.paid_by is not None:
        validate_payer(
            updates.paid_by,
            household
        )

        template.paid_by = (
            updates.paid_by
        )

    if updates.member_ids is not None:
        validate_member_ids(
            updates.member_ids,
            household
        )

        members_by_id = {
            member.id: member
            for member in household.members
        }

        template.members.clear()

        db.flush()

        template.members.extend(
            [
                members_by_id[member_id]
                for member_id
                in updates.member_ids
            ]
        )

    db.commit()
    db.refresh(template)

    return bill_template_to_response(
        template
    )


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_bill_template(
    household_id: int,
    template_id: int,
    db: Session = Depends(get_db)
):
    template = db.get(
        BillTemplateModel,
        template_id
    )

    if (
        template is None
        or template.household_id != household_id
    ):
        raise HTTPException(
            status_code=404,
            detail="Bill template not found"
        )

    db.delete(template)
    db.commit()