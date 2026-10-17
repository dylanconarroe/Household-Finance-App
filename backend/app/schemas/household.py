from pydantic import BaseModel, ConfigDict, Field


class MemberCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100
    )


class MemberUpdate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100
    )


class Member(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(
        from_attributes=True
    )


class HouseholdCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100
    )

    members: list[MemberCreate]


class HouseholdUpdate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100
    )


class Household(BaseModel):
    id: int
    name: str
    members: list[Member]

    model_config = ConfigDict(
        from_attributes=True
    )