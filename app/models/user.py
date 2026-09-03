from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime
import bcrypt

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(db.Model, UserMixin):
    __tablename__ = 'tblUser'

    UserID = db.Column(db.Integer, primary_key=True)
    UserName = db.Column(db.String(50), nullable=False, unique=True)
    UserEmail = db.Column(db.String(100), nullable=False, unique=True)
    UserPassword = db.Column(db.String(255), nullable=False)
    Role = db.Column(db.String(20), nullable=False, default='owner')
    BusinessID = db.Column(db.Integer, db.ForeignKey('tblBusiness.BusinessID'), nullable=True)
    IsActive = db.Column(db.Boolean, default=True, nullable=False)
    CreatedAt = db.Column(db.DateTime, default=datetime.utcnow)

    # Only owners have businesses through this relationship
    businesses = db.relationship('Business', backref='owner',
                                  lazy=True, foreign_keys='Business.UserID')

    def get_id(self):
        return str(self.UserID)

    def is_owner(self):
        return self.Role == 'owner'

    def is_staff(self):
        return self.Role == 'staff'

    def get_business_id(self):
        if self.is_owner():
            from app.models.business import Business
            biz = Business.query.filter_by(UserID=self.UserID).first()
            return biz.BusinessID if biz else None
        return self.BusinessID

    def set_password(self, password):
        self.UserPassword = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.UserPassword.encode('utf-8')
        )

    def __repr__(self):
        return f'<User {self.UserName} ({self.Role})>'