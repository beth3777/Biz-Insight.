from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.models.product import Product
from app.models.transaction import Transaction
from sqlalchemy import func
from datetime import datetime, timedelta

notifications = Blueprint('notifications', __name__)


def get_business(user):
    try:
        if user.is_owner():
            return Business.query.filter_by(UserID=user.UserID).first()
        return Business.query.get(user.BusinessID) if user.BusinessID else None
    except Exception:
        return None


@notifications.route('/api/notifications')
@login_required
def get_notifications():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'notifications': []})

        alerts = []
        seven_days_ago = datetime.utcnow().date() - timedelta(days=7)
        products = Product.query.filter_by(
            BusinessID=business.BusinessID
        ).all()

        for product in products:
            recent_qty = db.session.query(
                func.sum(Transaction.Quantity)
            ).filter(
                Transaction.ProductID == product.ProductID,
                Transaction.TransactionType == 'sale',
                Transaction.TransactionDate >= seven_days_ago
            ).scalar() or 0

            total_qty = db.session.query(
                func.sum(Transaction.Quantity)
            ).filter(
                Transaction.ProductID == product.ProductID,
                Transaction.TransactionType == 'sale'
            ).scalar() or 0

            if total_qty > 0 and recent_qty == 0:
                alerts.append({
                    'type': 'warning',
                    'icon': 'fa-box',
                    'title': 'Low Stock Alert',
                    'message': f'"{product.ProductName}" has had no sales '
                               f'in the last 7 days.',
                    'time': 'Last 7 days'
                })

        # Over-budget check (owner only)
        if current_user.is_owner():
            start_of_month = datetime.utcnow().date().replace(day=1)

            monthly_revenue = db.session.query(
                func.sum(Transaction.TransactionAmount)
            ).filter(
                Transaction.BusinessID == business.BusinessID,
                Transaction.TransactionType == 'sale',
                Transaction.TransactionDate >= start_of_month
            ).scalar() or 0

            monthly_expenses = db.session.query(
                func.sum(Transaction.TransactionAmount)
            ).filter(
                Transaction.BusinessID == business.BusinessID,
                Transaction.TransactionType == 'expense',
                Transaction.TransactionDate >= start_of_month
            ).scalar() or 0

            if float(monthly_revenue) > 0:
                ratio = float(monthly_expenses) / float(monthly_revenue)
                if ratio >= 0.8:
                    alerts.append({
                        'type': 'danger',
                        'icon': 'fa-exclamation-triangle',
                        'title': 'Over-Budget Warning',
                        'message': f'Expenses are {round(ratio*100)}% '
                                   f'of revenue this month.',
                        'time': 'This month'
                    })
                elif ratio >= 0.6:
                    alerts.append({
                        'type': 'warning',
                        'icon': 'fa-exclamation-circle',
                        'title': 'Budget Caution',
                        'message': f'Expenses are {round(ratio*100)}% '
                                   f'of revenue this month.',
                        'time': 'This month'
                    })

        total_transactions = Transaction.query.filter_by(
            BusinessID=business.BusinessID
        ).count()

        if total_transactions == 0:
            alerts.append({
                'type': 'info',
                'icon': 'fa-info-circle',
                'title': 'No Data Yet',
                'message': 'Upload your first file to start seeing insights.',
                'time': 'Now'
            })

        return jsonify({'notifications': alerts})

    except Exception as e:
        print(f"[NOTIFICATIONS ERROR] {str(e)}")
        return jsonify({'notifications': []})