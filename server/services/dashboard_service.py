from fastapi import HTTPException

from server.database import Session
from server.models import Categories, Accounts


def get_categories(email:str):
    try:
        with Session() as session:
            account_id = session.query(Accounts.id).filter(Accounts.email == email).scalar()
            if account_id is None:
                raise HTTPException(status_code=404, detail="Account not found")
            categories = session.query(Categories).filter(Categories.account_id==account_id).all()
            return categories
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


