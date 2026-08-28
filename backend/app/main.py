from fastapi import FastAPI

from app.database import Base, engine
from app.models import household, expense, rule, category_mapping
from app.routers import households, expenses, rules, receipts

from fastapi.middleware.cors import CORSMiddleware


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


@app.get("/")
def root():
    return {"message": "HouseSplit API is running"}