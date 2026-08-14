from pydantic import BaseModel


class SplitRuleCreate(BaseModel):
    name: str
    match_type: str = "category"
    match_value: str
    split_type: str = "equal"
    member_ids: list[int]


class SplitRuleMember(BaseModel):
    member_id: int
    name: str


class SplitRule(BaseModel):
    id: int
    household_id: int
    name: str
    match_type: str
    match_value: str
    split_type: str
    members: list[SplitRuleMember]

class SplitRuleUpdate(BaseModel):
    name: str | None = None
    member_ids: list[int] | None = None