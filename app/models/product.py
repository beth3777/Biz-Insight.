from app import db

class Product(db.Model):
    __tablename__ = 'tblProduct'

    ProductID = db.Column(db.Integer, primary_key=True)
    BusinessID = db.Column(db.Integer, db.ForeignKey('tblBusiness.BusinessID'), nullable=False)
    ProductName = db.Column(db.String(100), nullable=False)
    ProductCategory = db.Column(db.String(50))
    ProductCost = db.Column(db.Numeric(10, 2))
    ProductPrice = db.Column(db.Numeric(10, 2))

    transactions = db.relationship('Transaction', backref='product', lazy=True)
    forecasts = db.relationship('Forecast', backref='product', lazy=True)

    def __repr__(self):
        return f'<Product {self.ProductName}>'