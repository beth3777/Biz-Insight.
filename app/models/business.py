from app import db

class Business(db.Model):
    __tablename__ = 'tblBusiness'

    BusinessID = db.Column(db.Integer, primary_key=True)
    UserID = db.Column(db.Integer, db.ForeignKey('tblUser.UserID'), nullable=False)
    BusinessName = db.Column(db.String(100), nullable=False)
    BusinessIndustry = db.Column(db.String(50))
    BusinessCurrency = db.Column(db.String(3), default='KES')

    products = db.relationship('Product', backref='business', lazy=True)
    transactions = db.relationship('Transaction', backref='business', lazy=True)
    forecasts = db.relationship('Forecast', backref='business', lazy=True)

    def __repr__(self):
        return f'<Business {self.BusinessName}>'