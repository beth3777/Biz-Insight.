from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.models.transaction import Transaction
from app.models.product import Product
from app.utils import staff_or_owner_required
from sqlalchemy import func
from datetime import datetime, timedelta

dashboard = Blueprint('dashboard', __name__)


def get_business(user):
    try:
        if user.is_owner():
            return Business.query.filter_by(UserID=user.UserID).first()
        else:
            if user.BusinessID:
                return Business.query.get(user.BusinessID)
            return None
    except Exception as e:
        print(f"[get_business error] {e}")
        return None


@dashboard.route('/api/dashboard/kpis')
@login_required
@staff_or_owner_required
def get_kpis():
    try:
        print(f"[KPI] User: {current_user.UserName}, "
              f"Role: {current_user.Role}, "
              f"BusinessID: {current_user.BusinessID}")

        business = get_business(current_user)

        if not business:
            print(f"[KPI] No business found for user {current_user.UserID}")
            # For staff — try to find business directly
            if current_user.is_staff() and current_user.BusinessID:
                business = Business.query.filter_by(
                    BusinessID=current_user.BusinessID
                ).first()
                if not business:
                    return jsonify({
                        'error': 'Business not found',
                        'debug': f'BusinessID={current_user.BusinessID}'
                    }), 404
            else:
                return jsonify({'error': 'No business found'}), 404

        print(f"[KPI] Found business: {business.BusinessName}")

        today = datetime.utcnow().date()
        week_start = today - timedelta(days=7)

        today_sales = db.session.query(
            func.sum(Transaction.TransactionAmount)
        ).filter(
            Transaction.BusinessID == business.BusinessID,
            Transaction.TransactionType == 'sale',
            Transaction.TransactionDate == today
        ).scalar() or 0

        week_sales = db.session.query(
            func.sum(Transaction.TransactionAmount)
        ).filter(
            Transaction.BusinessID == business.BusinessID,
            Transaction.TransactionType == 'sale',
            Transaction.TransactionDate >= week_start
        ).scalar() or 0

        response = {
            'today_sales': float(today_sales),
            'week_sales': float(week_sales),
            'role': current_user.Role,
            'business_name': business.BusinessName,
            'currency': business.BusinessCurrency or 'KES'
        }

        if current_user.is_owner():
            total_revenue = db.session.query(
                func.sum(Transaction.TransactionAmount)
            ).filter(
                Transaction.BusinessID == business.BusinessID,
                Transaction.TransactionType == 'sale'
            ).scalar() or 0

            total_expenses = db.session.query(
                func.sum(Transaction.TransactionAmount)
            ).filter(
                Transaction.BusinessID == business.BusinessID,
                Transaction.TransactionType == 'expense'
            ).scalar() or 0

            total_transactions = Transaction.query.filter_by(
                BusinessID=business.BusinessID
            ).count()

            total_products = Product.query.filter_by(
                BusinessID=business.BusinessID
            ).count()

            response.update({
                'total_revenue': float(total_revenue),
                'total_expenses': float(total_expenses),
                'total_profit': float(total_revenue) - float(total_expenses),
                'total_transactions': total_transactions,
                'total_products': total_products
            })

        print(f"[KPI] Returning: {response}")
        return jsonify(response)

    except Exception as e:
        print(f"[KPI ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@dashboard.route('/api/dashboard/sales-trend')
@login_required
@staff_or_owner_required
def sales_trend():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'labels': [], 'values': []})

        days = request.args.get(
            'days', 7 if current_user.is_staff() else 30, type=int)
        if current_user.is_staff() and days > 7:
            days = 7

        filter_start = datetime.utcnow().date() - timedelta(days=days)

        results = db.session.query(
            Transaction.TransactionDate,
            func.sum(Transaction.TransactionAmount).label('total')
        ).filter(
            Transaction.BusinessID == business.BusinessID,
            Transaction.TransactionType == 'sale',
            Transaction.TransactionDate >= filter_start
        ).group_by(
            Transaction.TransactionDate
        ).order_by(
            Transaction.TransactionDate
        ).all()

        return jsonify({
            'labels': [str(r.TransactionDate) for r in results],
            'values': [float(r.total) for r in results]
        })

    except Exception as e:
        print(f"[SALES TREND ERROR] {str(e)}")
        return jsonify({'labels': [], 'values': []}), 500


@dashboard.route('/api/dashboard/top-products')
@login_required
@staff_or_owner_required
def top_products():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'labels': [], 'values': [], 'quantities': []})

        results = db.session.query(
            Product.ProductName,
            func.sum(Transaction.TransactionAmount).label('total'),
            func.sum(Transaction.Quantity).label('qty')
        ).join(
            Transaction, Transaction.ProductID == Product.ProductID
        ).filter(
            Transaction.BusinessID == business.BusinessID,
            Transaction.TransactionType == 'sale'
        ).group_by(
            Product.ProductName
        ).order_by(
            func.sum(Transaction.TransactionAmount).desc()
        ).limit(10).all()

        return jsonify({
            'labels': [r.ProductName for r in results],
            'values': [float(r.total) for r in results],
            'quantities': [int(r.qty) for r in results]
        })

    except Exception as e:
        print(f"[TOP PRODUCTS ERROR] {str(e)}")
        return jsonify({'labels': [], 'values': [], 'quantities': []}), 500