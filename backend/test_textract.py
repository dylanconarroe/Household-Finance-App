from pathlib import Path
from pprint import pprint

from app.services.receipt_parser import parse_receipt


receipt_path = Path("receipt.jpeg")

with open(receipt_path, "rb") as f:
    image_bytes = f.read()

result = parse_receipt(image_bytes)

pprint(result)