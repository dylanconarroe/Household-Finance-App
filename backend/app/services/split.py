from decimal import Decimal


def split_equally(
    amount: Decimal,
    member_ids: list[int]
) -> dict[int, Decimal]:

    if len(member_ids) == 0:
        raise ValueError("At least one member is required")

    # Convert money into cents
    total_cents = int(amount * 100)

    number_of_members = len(member_ids)

    base_share = total_cents // number_of_members
    remainder = total_cents % number_of_members

    splits = {}

    # Sort so leftover cents are assigned consistently
    sorted_members = sorted(member_ids)

    for index, member_id in enumerate(sorted_members):

        cents = base_share

        if index < remainder:
            cents += 1

        splits[member_id] = (
            Decimal(cents) / Decimal("100")
        )

    return splits