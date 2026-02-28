from psycopg import Timestamp
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from datetime import datetime
from server.database import Base

class Categories(Base):
    __tablename__ = "categories"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    name           = Column(String)
    monthly_budget = Column(Numeric(10, 2))
    account_id     = Column(Integer, ForeignKey("accounts.id"))


class Accounts(Base):
    __tablename__ = "accounts"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    account_name = Column(String,unique=True, nullable=False)
    balance      = Column(Numeric(12, 2), nullable=False)
    email        = Column(String,unique=True, nullable=False)


class Expenses(Base):
    __tablename__ = "expenses"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    amount      = Column(Numeric(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    account_id  = Column(Integer, ForeignKey("accounts.id"))
    description = Column(String)
    created_at  = Column(DateTime, default=datetime.now)