from flask import Blueprint, request, redirect, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models.user import User
from app.models.business import Business

auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')
    business_name = request.form.get('business_name')
    business_industry = request.form.get('business_industry')

    if User.query.filter_by(UserEmail=email).first():
        return redirect('/register.html?error=Email+already+registered')

    if User.query.filter_by(UserName=username).first():
        return redirect('/register.html?error=Username+already+taken')

    # Create owner user
    new_user = User(UserName=username, UserEmail=email, Role='owner', IsActive=True)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    # Create their business
    new_business = Business(
        UserID=new_user.UserID,
        BusinessName=business_name,
        BusinessIndustry=business_industry,
        BusinessCurrency='KES'
    )
    db.session.add(new_business)
    db.session.commit()

    return redirect('/login.html?success=Account+created+successfully')


@auth.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')
    user = User.query.filter_by(UserEmail=email).first()

    if not user or not user.check_password(password):
        return redirect('/login.html?error=Invalid+email+or+password')

    if not user.IsActive:
        return redirect('/login.html?error=Your+account+has+been+disabled')

    login_user(user)
    from app.utils import log_action
    from app.models.business import Business
    biz = Business.query.filter_by(UserID=user.UserID).first() \
        if user.is_owner() else Business.query.get(user.BusinessID)
    if biz:
        log_action(db, user, biz.BusinessID,
                 'LOGIN', f'User logged in', request)

    # Redirect based on role
    if user.is_owner():
        return redirect('/dashboard.html')
    else:
        return redirect('/staff-dashboard.html')


@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect('/login.html')


@auth.route('/api/me')
def me():
    if current_user.is_authenticated:
        business_id = current_user.get_business_id()
        business = Business.query.get(business_id) if business_id else None
        return jsonify({
            'authenticated': True,
            'username': current_user.UserName,
            'email': current_user.UserEmail,
            'role': current_user.Role,
            'is_owner': current_user.is_owner(),
            'is_active': current_user.IsActive,
            'business_name': business.BusinessName if business else '',
            'business_id': business_id
        })
    return jsonify({'authenticated': False}), 401