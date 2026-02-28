from pydantic import BaseModel

class CreateExpense(BaseModel):
    amount: float | int
    category : str
    description : str


class UpdateExpenses(BaseModel):
    amount: float | int
    category : str
    description : str
    expense_id : int

class DeleteExpense(BaseModel):
    expense_id : int