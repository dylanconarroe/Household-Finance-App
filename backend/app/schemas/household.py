from pydantic import BaseModel, ConfigDict


class MemberCreate(BaseModel):
    name: str


class Member(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class HouseholdCreate(BaseModel):
    name: str
    members: list[MemberCreate]


class Household(BaseModel):
    id: int
    name: str
    members: list[Member]

    model_config = ConfigDict(from_attributes=True)