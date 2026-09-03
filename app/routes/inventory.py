from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.models.product import Product
from app.models.transaction import Transaction
from sqlalchemy import func
from datetime import datetime, timedelta

inventory = Blueprint('inventory', __name__)


def get_business(user):
    try:
        if user.is_owner():
            return Business.query.filter_by(UserID=user.UserID).first()
        return Business.query.get(user.BusinessID) if user.BusinessID else None
    except Exception as e:
        print(f"[get_business error] {e}")
        return None


@inventory.route('/api/inventory')
@login_required
def get_inventory():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'inventory': []})

        products = Product.query.filter_by(
            BusinessID=business.BusinessID
        ).all()

        seven_days_ago = datetime.utcnow().date() - timedelta(days=7)
        inventory_data = []

        for product in products:
            total_sold = db.session.query(
                func.sum(Transaction.Quantity)
            ).filter(
                Transaction.ProductID == product.ProductID,
                Transaction.TransactionType == 'sale'
            ).scalar() or 0

            total_revenue = db.session.query(
                func.sum(Transaction.TransactionAmount)
            ).filter(
                Transaction.ProductID == product.ProductID,
                Transaction.TransactionType == 'sale'
            ).scalar() or 0

            last_sale = db.session.query(
                func.max(Transaction.TransactionDate)
            ).filter(
                Transaction.ProductID == product.ProductID,
                Transaction.TransactionType == 'sale'
            ).scalar()

            recent_sales = db.session.query(
                func.sum(Transaction.Quantity)
            ).filter(
                Transaction.ProductID == product.ProductID,
                Transaction.TransactionType == 'sale',
                Transaction.TransactionDate >= seven_days_ago
            ).scalar() or 0

            if total_sold == 0:
                status = 'no_sales'
            elif recent_sales == 0:
                status = 'low'
            elif recent_sales < 3:
                status = 'medium'
            else:
                status = 'good'

            inventory_data.append({
                'product_id': product.ProductID,
                'product_name': product.ProductName,
                'category': product.ProductCategory or 'Uncategorized',
                'cost_price': float(product.ProductCost or 0),
                'selling_price': float(product.ProductPrice or 0),
                'total_sold': int(total_sold),
                'total_revenue': float(total_revenue),
                'last_sale': str(last_sale) if last_sale else 'Never',
                'recent_sales_7d': int(recent_sales),
                'status': status
            })

        status_order = {'low': 0, 'no_sales': 1, 'medium': 2, 'good': 3}
        inventory_data.sort(key=lambda x: status_order.get(x['status'], 4))

        return jsonify({'inventory': inventory_data})

    except Exception as e:
        print(f"[INVENTORY ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'inventory': [], 'error': str(e)}), 500


@inventory.route('/api/inventory/summary')
@login_required
def inventory_summary():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'total_products': 0, 'low_stock_count': 0})

        total_products = Product.query.filter_by(
            BusinessID=business.BusinessID
        ).count()

        seven_days_ago = datetime.utcnow().date() - timedelta(days=7)
        all_products = Product.query.filter_by(
            BusinessID=business.BusinessID
        ).all()

        low_stock_count = 0
        for p in all_products:
            recent = db.session.query(
                func.sum(Transaction.Quantity)
            ).filter(
                Transaction.ProductID == p.ProductID,
                Transaction.TransactionType == 'sale',
                Transaction.TransactionDate >= seven_days_ago
            ).scalar() or 0

            total = db.session.query(
                func.sum(Transaction.Quantity)
            ).filter(
                Transaction.ProductID == p.ProductID,
                Transaction.TransactionType == 'sale'
            ).scalar() or 0

            if total > 0 and recent == 0:
                low_stock_count += 1

        return jsonify({
            'total_products': total_products,
            'low_stock_count': low_stock_count
        })

    except Exception as e:
        print(f"[INVENTORY SUMMARY ERROR] {str(e)}")
        return jsonify({'total_products': 0, 'low_stock_count': 0}), 500