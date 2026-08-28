from ollama import chat
from pydantic import BaseModel


class CategoryResult(BaseModel):
    category: str | None


def categorize_item(
    merchant: str,
    description: str,
    categories: list[str]
) -> str | None:

    categories = sorted({
        category.strip().lower()
        for category in categories
        if category.strip()
    })

    if not categories:
        return None

    prompt = f"""
You categorize abbreviated retail receipt items.

Merchant:
{merchant}

Receipt item:
{description}

Allowed categories:
{", ".join(categories)}

Rules:
- Choose a category ONLY when the item clearly belongs there.
- Do NOT guess.
- Do NOT use "groceries" as a generic fallback.
- If the abbreviated item name is unclear or ambiguous, return null.
- If you cannot tell what the product actually is, return null.
- You may only choose from the allowed categories.

Return JSON only.
"""

    response = chat(
        model="qwen3:8b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        format=CategoryResult.model_json_schema(),
        options={
            "temperature": 0
        },
        think=False
    )

    result = CategoryResult.model_validate_json(
        response.message.content
    )

    if result.category is None:
        return None

    category = result.category.strip().lower()

    if category not in categories:
        return None

    return category