# import matplotlib
# import os
# import matplotlib.pyplot as plt
# import seaborn as sns
# import pandas as pd
# from typing import Dict, Callable
#
# from server.database import books,reviews,sales,sale_details
#
# matplotlib.use('agg')
# # server/ directory so plots save to server/static/plots (matches app when run from server/)
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
#
# sns.set_theme(style="dark")
#
# def reroute(question_id: int):
#     questions: Dict[int, Callable] = {
#         1: average_book_price_by_year,
#         2: top_authors_by_reviews,
#         3: daily_sales_trend,
#         4: top_selling_books,
#         5: monthly_revenue_performance,
#         6: avg_rating_profession,
#         7: monthly_review_volume,
#         8: top_10_authors_by_revenue,
#         9: distribution_units_transaction,
#         10: monthly_revenue_growth_rate
#     }
#     handler = questions.get(question_id)
#     if handler is None:
#         return None
#     return handler()
#
#
# def average_book_price_by_year():
#     avg_price_by_year = books.groupby('year')['price'].mean()
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Plot with bookshop aesthetic
#     ax.plot(avg_price_by_year.index, avg_price_by_year.values,
#             marker='o', linewidth=2.5, color='#8B4513',
#             markersize=8, markerfacecolor='#654321',
#             markeredgecolor='#4A3428', markeredgewidth=1.5)
#
#     ax.grid(True, linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Year", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Price ($)", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Average book price by year", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "average_book_price_by_year.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def top_authors_by_reviews():
#     # customer_reviews has no 'author'; join with books on book_id to get author
#     merged = pd.merge(reviews, books[['book_id', 'author']], on='book_id', how='inner')
#     top_authors = merged.groupby('author')['rating'].mean().reset_index().sort_values(by='rating', ascending=False)
#     top_10 = top_authors.head(10)
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create bars with bookshop aesthetic
#     bars = ax.bar(top_10['author'], top_10['rating'],
#                    color='#8B4513', edgecolor='#4A3428', linewidth=1.5)
#
#     ax.grid(True, axis='x', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Author", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Rating", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Top 10 authors by reviews", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#     plt.xticks(rotation=45, ha='right')
#     plt.tight_layout()
#
#     plot_filename = "top_10_authors_by_reviews_graph.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def daily_sales_trend():
#     sales['sale_date'] = pd.to_datetime(sales['sale_date'])
#
#     daily_sales = sales.groupby('sale_date')['total_amount'].sum().reset_index()
#     year = sales['sale_date'].max()
#     latest_year = sales['sale_date'].dt.year.max()
#     start_date = year - pd.Timedelta(weeks=2)
#     recent_sales = daily_sales[
#         (daily_sales['sale_date'] >= start_date) &
#         (daily_sales['sale_date'] <= year)
#         ]
#     recent_sales['day'] = recent_sales['sale_date'].dt.strftime('%d')
#     month_name = recent_sales['sale_date'].dt.strftime('%B').iloc[0]
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Plot with bookshop aesthetic
#     ax.plot(recent_sales['day'], recent_sales['total_amount'],
#             marker='o', linewidth=2.5, color='#8B4513',
#             markersize=8, markerfacecolor='#654321',
#             markeredgecolor='#4A3428', markeredgewidth=1.5)
#
#     ax.grid(True, linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Day", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Total Amount ($)", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title(f"Daily sales trend - {latest_year} {month_name}", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "daily_sales_trend.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def top_selling_books():
#     # Use quantity from sale_details (suffix _y after merge; books.quantity is _x)
#     merged = pd.merge(books, sale_details, how='inner', on='book_id')
#     sold = merged.groupby('title')['quantity_y'].sum().reset_index().rename(columns={'quantity_y': 'quantity'})
#     top_10 = sold.sort_values(by='quantity', ascending=False).head(10)
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(12, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create bars with bookshop aesthetic
#     ax.bar(top_10['title'], top_10['quantity'],
#            color='#8B4513', edgecolor='#4A3428', linewidth=1.5)
#
#     ax.grid(True, axis='y', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Title", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Quantity", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Top selling books by title", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif', rotation=45, ha='right')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "top_selling_books_by_title.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def monthly_revenue_performance():
#     sales['sale_date'] = pd.to_datetime(sales['sale_date'])
#     sales['year_month'] = sales['sale_date'].dt.to_period('M')
#     twelve_months = sales.groupby('year_month')['total_amount'].sum().reset_index().sort_values(by='year_month').tail(
#         12)
#     twelve_months['month_name'] = twelve_months['year_month'].dt.strftime('%b')
#     latest_year = twelve_months['year_month'].dt.year.max()
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create bars with bookshop aesthetic
#     ax.bar(twelve_months['month_name'], twelve_months['total_amount'],
#            width=0.6, color='#8B4513', edgecolor='#4A3428', linewidth=1.5)
#
#     ax.grid(True, axis='y', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel(latest_year, fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Total Amount ($)", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Monthly revenue", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "monthly_revenue_performance.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def avg_rating_profession():
#     professions = reviews.groupby('profession')['rating'].mean().reset_index()
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create bars with bookshop aesthetic
#     ax.bar(professions['profession'], professions['rating'],
#             color='#8B4513', edgecolor='#4A3428', linewidth=1.5)
#
#     ax.grid(True, axis='x', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Profession", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Rating", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Average rating by profession", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "avg_rating_profession.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def monthly_review_volume():
#     reviews['review_date'] = pd.to_datetime(reviews['review_date'])
#     reviews['year_month'] = reviews['review_date'].dt.to_period('M')
#     twelve_months = reviews.groupby('year_month')['reviewed'].count().reset_index().sort_values(by='year_month',
#                                                                                                 ascending=False).head(
#         12)
#     twelve_months = twelve_months.sort_values(by='year_month')
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create bars with bookshop aesthetic
#     ax.bar(twelve_months['year_month'].astype(str), twelve_months['reviewed'],
#            color='#8B4513', edgecolor='#4A3428', linewidth=1.5)
#
#     ax.grid(True, axis='y', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Month", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Review Amount", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Monthly review volume by month", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif', rotation=45, ha='right')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "monthly_review_volume.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def top_10_authors_by_revenue():
#     sale_details['revenue'] = sale_details['quantity'] * sale_details['unit_price_at_sale']
#     merged = pd.merge(books, sale_details, how='inner', on='book_id')
#     full = pd.merge(merged, sales, how='inner', on='sale_id')
#     top_10 = full.groupby('author')['revenue'].sum().reset_index().sort_values(by='revenue', ascending=False).head(10)
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create bars with bookshop aesthetic
#     ax.bar(top_10['author'], top_10['revenue'],
#             color='#8B4513', edgecolor='#4A3428', linewidth=2, width= 0.7)
#
#     ax.grid(True, axis='x', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Author", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif' )
#     ax.set_ylabel("Revenue", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Top 10 authors by revenue", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#     plt.xticks(rotation=45, ha='right')
#     plt.tight_layout()
#
#     plot_filename = "top_10_authors_by_revenue.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def distribution_units_transaction():
#     total_items_per_sale = sale_details.groupby('sale_id')['quantity'].sum()
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(10, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Create histogram with bookshop aesthetic
#     ax.hist(total_items_per_sale, bins=range(1, total_items_per_sale.max() + 2),
#             edgecolor='#4A3428', color='#8B4513', align='left', linewidth=1.5)
#
#     ax.grid(True, axis='y', linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Number of Items in a Single Sale", fontsize=12, fontweight='bold', color='#3E2723',
#                   fontfamily='serif')
#     ax.set_ylabel("Number of Transactions", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Distribution of Items per Sale (Basket Size)", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.set_xticks(range(1, int(total_items_per_sale.max()) + 1))
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "distribution_units_transaction.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename
#
#
# def monthly_revenue_growth_rate():
#     sales['sale_date'] = pd.to_datetime(sales['sale_date'])
#     sales['year_month'] = sales['sale_date'].dt.to_period('M')
#     monthly_rev = sales.groupby('year_month')['total_amount'].sum().reset_index().tail(12)
#     monthly_rev = monthly_rev.sort_values('year_month')
#     monthly_rev['growth_rate'] = monthly_rev['total_amount'].pct_change() * 100
#
#     # Vintage styling
#     fig, ax = plt.subplots(figsize=(12, 6), facecolor='#F5F1E8')
#     ax.set_facecolor('#F5F1E8')
#
#     # Plot with bookshop aesthetic
#     ax.plot(monthly_rev['year_month'].astype(str), monthly_rev['growth_rate'],
#             marker='o', linewidth=2.5, color='#8B4513',
#             markersize=8, markerfacecolor='#654321',
#             markeredgecolor='#4A3428', markeredgewidth=1.5,
#             label='MoM Growth %')
#
#     ax.axhline(0, color='#8B4513', linestyle='--', alpha=0.5, linewidth=2)
#
#     ax.grid(True, linestyle='--', linewidth=0.8, color='#D4C5B0', alpha=0.6)
#
#     for spine in ax.spines.values():
#         spine.set_color('#8B6F47')
#         spine.set_linewidth(2)
#
#     ax.set_xlabel("Month", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_ylabel("Percentage Change (%)", fontsize=12, fontweight='bold', color='#3E2723', fontfamily='serif')
#     ax.set_title("Monthly Revenue Growth Rate (%)", fontsize=14, fontweight='bold',
#                  color='#3E2723', fontfamily='serif', pad=15)
#
#     ax.tick_params(colors='#3E2723', labelsize=10)
#     plt.setp(ax.get_xticklabels(), fontfamily='serif', rotation=45, ha='right')
#     plt.setp(ax.get_yticklabels(), fontfamily='serif')
#
#     plt.tight_layout()
#
#     plot_filename = "monthly_revenue_growth_rate.png"
#     path = os.path.join(BASE_DIR, "static", "plots", plot_filename)
#     os.makedirs(os.path.dirname(path), exist_ok=True)
#     plt.savefig(path, dpi=150, facecolor='#F5F1E8')
#     plt.close()
#
#     return plot_filename