from pydantic import BaseModel

class CreateCategory(BaseModel):
    category_name: str
    monthly_budget: float