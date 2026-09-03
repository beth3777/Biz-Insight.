from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.models.product import Product
from app.models.transaction import Transaction
from app.utils import owner_required
from datetime import datetime

data_entry = Blueprint('data_entry', __name__)


@data_entry.route('/api/entry/products')
@login_required
@owner_required
def get_products():
    business = Business.query.filter_by(
        UserID=current_user.UserID
    ).first()
    if not business:
        return jsonify({'products': []})

    products = Product.query.filter_by(
        BusinessID=business.BusinessID
    ).order_by(Product.ProductName).all()

    return jsonify({'products': [{
        'id': p.ProductID,
        'name': p.ProductName,
        'category': p.ProductCategory,
        'price': float(p.ProductPrice or 0),
        'cost': float(p.ProductCost or 0)
    } for p in products]})


@data_entry.route('/api/entry/transaction', methods=['POST'])
@login_required
@owner_required
def add_transaction():
    try:
        business = Business.query.filter_by(
            UserID=current_user.UserID
        ).first()
        if not business:
            return jsonify({'error': 'No business found'}), 404

        data = request.get_json()

        product_id = data.get('product_id')
        new_product_name = data.get('new_product_name', '').strip()
        category = data.get('category', 'General').strip()
        trans_date = data.get('date')
        amount = float(data.get('amount', 0))
        quantity = int(data.get('quantity', 1))
        cost = float(data.get('cost', 0))
        trans_type = data.get('type', 'sale').lower()

        if not trans_date or amount <= 0:
            return jsonify({'error': 'Date and amount are required'}), 400

        # Get or create product
        if product_id:
            product = Product.query.get(product_id)
        elif new_product_name:
            product = Product.query.filter_by(
                BusinessID=business.BusinessID,
                ProductName=new_product_name
            ).first()
            if not product:
                product = Product(
                    BusinessID=business.BusinessID,
                    ProductName=new_product_name,
                    ProductCategory=category,
                    ProductCost=cost,
                    ProductPrice=amount / quantity if quantity > 0 else amount
                )
                db.session.add(product)
                db.session.flush()
        else:
            return jsonify({'error': 'Select a product or enter a new one'}), 400

        transaction = Transaction(
            BusinessID=business.BusinessID,
            ProductID=product.ProductID,
            TransactionDate=datetime.strptime(trans_date, '%Y-%m-%d').date(),
            TransactionAmount=amount,
            Quantity=quantity,
            TransactionType=trans_type
        )
        db.session.add(transaction)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Transaction added: {product.ProductName} — '
                       f'KES {amount:,.0f}'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500