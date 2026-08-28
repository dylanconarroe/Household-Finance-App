import os
import re
from decimal import Decimal

import boto3
from dotenv import load_dotenv


load_dotenv(".env")

textract = boto3.client(
    "textract",
    region_name=os.getenv("AWS_REGION")
)


def parse_money(value: str | None) -> Decimal | None:
    if not value:
        return None

    match = re.search(r"\d+(?:,\d{3})*\.\d{2}", value)

    if match is None:
        return None

    return Decimal(
        match.group().replace(",", "")
    )


def parse_receipt(image_bytes: bytes):

    response = textract.analyze_expense(
        Document={
            "Bytes": image_bytes
        }
    )

    expense_document = response["ExpenseDocuments"][0]

    # -------------------------
    # Summary fields
    # -------------------------

    summary = {}

    for field in expense_document.get("SummaryFields", []):
        field_type = field.get("Type", {}).get("Text")
        value = field.get("ValueDetection", {}).get("Text")

        if field_type and value:
            summary[field_type] = value

    # -------------------------
    # Normal receipt items
    # -------------------------

    items = []

    for group in expense_document.get("LineItemGroups", []):

        for line_item in group.get("LineItems", []):

            item_data = {}

            for field in line_item.get(
                "LineItemExpenseFields",
                []
            ):
                field_type = field.get("Type", {}).get("Text")
                value = field.get("ValueDetection", {}).get("Text")

                if field_type and value:
                    item_data[field_type] = value

            description = item_data.get("ITEM")
            price = parse_money(item_data.get("PRICE"))
            product_code = item_data.get("PRODUCT_CODE")

            if description and price is not None:
                items.append(
                    {
                        "product_code": product_code,
                        "description": description,
                        "original_amount": price,
                        "discount": Decimal("0.00"),
                        "amount": price
                    }
                )

    # -------------------------
    # Costco TPD discounts
    # -------------------------

    raw_lines = [
        block.get("Text", "")
        for block in expense_document.get("Blocks", [])
        if block.get("BlockType") == "LINE"
    ]

    for index, line in enumerate(raw_lines):

        match = re.search(
            r"TPD/(\d+)",
            line,
            re.IGNORECASE
        )

        if match is None:
            continue

        product_code = match.group(1)

        # Costco prints the discount amount
        # on the next OCR line.
        if index + 1 >= len(raw_lines):
            continue

        discount = parse_money(
            raw_lines[index + 1]
        )

        if discount is None:
            continue

        # Find the purchased item with the matching
        # Costco product code.
        for item in items:

            if item["product_code"] == product_code:

                item["discount"] += discount

                item["amount"] = (
                    item["original_amount"]
                    - item["discount"]
                )

                break

    # -------------------------
    # Clean merchant name
    # -------------------------

    merchant = summary.get("VENDOR_NAME")

    if merchant:
        merchant = " ".join(
            merchant.split()
        )

    # -------------------------
    # Verify extracted subtotal
    # -------------------------

    extracted_subtotal = sum(
        (item["amount"] for item in items),
        Decimal("0.00")
    )

    receipt_subtotal = parse_money(
        summary.get("SUBTOTAL")
    )

    subtotal_matches = (
        receipt_subtotal is not None
        and extracted_subtotal == receipt_subtotal
    )

    tax = parse_money(
        summary.get("TAX")
    )

    total = parse_money(
        summary.get("TOTAL")
    )

    total_matches = (
        receipt_subtotal is not None
        and tax is not None
        and total is not None
        and receipt_subtotal + tax == total
    )

    # Convert Decimals to strings for a clean
    # JSON-friendly response.
    parsed_items = []

    for item in items:
        parsed_items.append(
            {
                "product_code": item["product_code"],
                "description": item["description"],
                "original_amount": f"{item['original_amount']:.2f}",
                "discount": f"{item['discount']:.2f}",
                "amount": f"{item['amount']:.2f}"
            }
        )

    return {
        "merchant": merchant,
        "expense_date": summary.get("INVOICE_RECEIPT_DATE"),
        "subtotal": summary.get("SUBTOTAL"),
        "tax": summary.get("TAX"),
        "total": summary.get("TOTAL"),
        "items": parsed_items,
        "extracted_subtotal": f"{extracted_subtotal:.2f}",
        "subtotal_matches": subtotal_matches,
        "total_matches": total_matches
    }