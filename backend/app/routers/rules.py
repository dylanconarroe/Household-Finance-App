from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.household import Household as HouseholdModel
from app.models.rule import (
    SplitRule as SplitRuleModel,
    SplitRuleMember as SplitRuleMemberModel
)
from app.models.category_mapping import CategoryMapping
from app.schemas.rule import (
    SplitRuleCreate,
    SplitRuleUpdate,
    SplitRule,
    SplitRuleMember
)


router = APIRouter(
    prefix="/households/{household_id}/rules",
    tags=["Rules"]
)


def rule_to_response(rule: SplitRuleModel) -> SplitRule:

    return SplitRule(
        id=rule.id,
        household_id=rule.household_id,
        name=rule.name,
        match_type=rule.match_type,
        match_value=rule.match_value,
        split_type=rule.split_type,
        members=[
            SplitRuleMember(
                member_id=rule_member.member.id,
                name=rule_member.member.name
            )
            for rule_member in rule.members
        ]
    )


@router.post(
    "/",
    response_model=SplitRule,
    status_code=status.HTTP_201_CREATED
)
def create_rule(
    household_id: int,
    rule: SplitRuleCreate,
    db: Session = Depends(get_db)
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

    if rule.match_type != "category":
        raise HTTPException(
            status_code=400,
            detail="Only category rules are currently supported"
        )

    if rule.split_type != "equal":
        raise HTTPException(
            status_code=400,
            detail="Only equal split rules are currently supported"
        )

    if len(rule.member_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="Rule must contain at least one member"
        )

    if len(rule.member_ids) != len(set(rule.member_ids)):
        raise HTTPException(
            status_code=400,
            detail="Rule contains duplicate member IDs"
        )

    household_member_ids = {
        member.id
        for member in household.members
    }

    invalid_members = (
        set(rule.member_ids)
        - household_member_ids
    )

    if invalid_members:
        raise HTTPException(
            status_code=400,
            detail=(
                "Rule contains members who do not belong "
                f"to this household: {sorted(invalid_members)}"
            )
        )

    rule_members = [
        SplitRuleMemberModel(
            member_id=member_id
        )
        for member_id in rule.member_ids
    ]

    new_rule = SplitRuleModel(
        household_id=household_id,
        name=rule.name.strip(),
        match_type=rule.match_type.strip().lower(),
        match_value=rule.match_value.strip().lower(),
        split_type=rule.split_type.strip().lower(),
        members=rule_members
    )

    db.add(new_rule)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="A rule for this category already exists"
        )

    db.refresh(new_rule)

    return rule_to_response(new_rule)


@router.get(
    "/",
    response_model=list[SplitRule]
)
def get_rules(
    household_id: int,
    db: Session = Depends(get_db)
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

    rules = db.scalars(
        select(SplitRuleModel).where(
            SplitRuleModel.household_id == household_id
        )
    ).all()

    return [
        rule_to_response(rule)
        for rule in rules
    ]


@router.delete(
    "/{rule_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_rule(
    household_id: int,
    rule_id: int,
    db: Session = Depends(get_db)
):
    rule = db.get(
        SplitRuleModel,
        rule_id
    )

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Rule not found"
        )

    if rule.household_id != household_id:
        raise HTTPException(
            status_code=404,
            detail="Rule not found in this household"
        )

    # If this is a category rule, remove any saved
    # categorization mappings that depend on it.
    if rule.match_type == "category":
        db.query(CategoryMapping).filter(
            CategoryMapping.household_id == household_id,
            CategoryMapping.category == rule.match_value
        ).delete(
            synchronize_session=False
        )

    db.delete(rule)
    db.commit()


@router.patch(
    "/{rule_id}",
    response_model=SplitRule
)
def update_rule(
    household_id: int,
    rule_id: int,
    updates: SplitRuleUpdate,
    db: Session = Depends(get_db)
):
    rule = db.get(
        SplitRuleModel,
        rule_id
    )

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Rule not found"
        )

    if rule.household_id != household_id:
        raise HTTPException(
            status_code=404,
            detail="Rule not found in this household"
        )

    # Update rule name
    if updates.name is not None:
        rule.name = updates.name.strip()

    # Update which members participate in the split
    if updates.member_ids is not None:

        if len(updates.member_ids) == 0:
            raise HTTPException(
                status_code=400,
                detail="Rule must contain at least one member"
            )

        if len(updates.member_ids) != len(set(updates.member_ids)):
            raise HTTPException(
                status_code=400,
                detail="Rule contains duplicate member IDs"
            )

        household = db.get(
            HouseholdModel,
            household_id
        )

        household_member_ids = {
            member.id
            for member in household.members
        }

        invalid_members = (
            set(updates.member_ids)
            - household_member_ids
        )

        if invalid_members:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Rule contains members who do not belong "
                    f"to this household: {sorted(invalid_members)}"
                )
            )

        # Remove existing members
        rule.members.clear()

        # Important:
        # execute those DELETEs before adding
        # replacement members
        db.flush()

        # Add replacement members
        rule.members.extend(
            [
                SplitRuleMemberModel(
                    member_id=member_id
                )
                for member_id in updates.member_ids
            ]
        )

    db.commit()
    db.refresh(rule)

    return rule_to_response(rule)