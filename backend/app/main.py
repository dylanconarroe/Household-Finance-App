from fastapi import FastAPI

from app.database import Base, engine
from app.models import household, expense, rule
from app.routers import households, expenses, rules


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="HouseSplit API"
)


app.include_router(households.router)
app.include_router(expenses.router)
app.include_router(rules.router)


@app.get("/")
def root():
    return {"message": "HouseSplit API is running"}