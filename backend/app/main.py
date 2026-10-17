from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.models import (
    household,
    expense,
    rule,
    category_mapping,
    bill_template,
    user,
)

from app.routers import (
    households,
    expenses,
    rules,
    receipts,
    bill_templates,
    auth,
)


Base.metadata.create_all(bind=engine)

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="HouseSplit API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(households.router)
app.include_router(expenses.router)
app.include_router(rules.router)
app.include_router(receipts.router)
app.include_router(bill_templates.router)
app.include_router(auth.router)


@app.get("/")
def root():
    return {"message": "HouseSplit API is running"}