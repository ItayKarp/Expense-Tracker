# from fastapi import APIRouter
# # from server.services import reroute
# from fastapi.templating import Jinja2Templates
# templates = Jinja2Templates(directory="templates/statistics/statistics_graphs")
#
#
#
# statistics_router = APIRouter(
#     prefix="/statistics",
#     tags=["statistics"],
# )
#
# @statistics_router.get("/{question_id}")
# def statistics(question_id: int):
#     plot_filename = reroute(question_id)
#     return templates.TemplateResponse(plot_filename)
#















