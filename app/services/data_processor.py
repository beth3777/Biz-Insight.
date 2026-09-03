import pandas as pd
from app.models.product import Product
from app.models.transaction import Transaction
from app.models.upload import Upload
from datetime import datetime


def process_file(filepath, business_id, db, filename):
    try:
        # Read file
        if filepath.endswith('.csv'):
            df = pd.read_csv(filepath)
        else:
            df = pd.read_excel(filepath)

        # Normalize column names
        df.columns = df.columns.str.strip().str.lower()

        required_columns = {'date', 'product', 'amount'}
        if not required_columns.issubset(df.columns):
            return {
                'success': False,
                'error': 'Missing required columns. File must have: date, product, amount'
            }

        # Clean data
        df = df.dropna(subset=['date', 'product', 'amount'])

        # ── DATE FIX ──
        # Try multiple date formats to handle Excel dates,
        # DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD etc.
        def parse_date(val):
            if pd.isnull(val):
                return None
            # If already a datetime (Excel numeric dates)
            if isinstance(val, (pd.Timestamp, datetime)):
                return pd.Timestamp(val)
            val = str(val).strip()
            formats = [
                '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d',
                '%d-%m-%Y', '%d/%m/%y', '%m/%d/%y',
                '%Y/%m/%d', '%d %b %Y', '%d %B %Y'
            ]
            for fmt in formats:
                try:
                    return pd.Timestamp(datetime.strptime(val, fmt))
                except ValueError:
                    continue
            # Last resort — let pandas try
            try:
                return pd.Timestamp(pd.to_datetime(val, dayfirst=True))
            except Exception:
                return None

        df['date'] = df['date'].apply(parse_date)
        df = df.dropna(subset=['date'])

        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df = df.dropna(subset=['amount'])

        errors = []
        rows_imported = 0

        for _, row in df.iterrows():
            try:
                product_name = str(row['product']).strip()
                category = str(
                    row['category'] if 'category' in df.columns
                    and not pd.isnull(row.get('category'))
                    else 'General'
                ).strip()
                cost = float(row['cost']) \
                    if 'cost' in df.columns \
                    and not pd.isnull(row.get('cost')) else 0.0
                price = float(row['amount'])
                quantity = int(row['quantity']) \
                    if 'quantity' in df.columns \
                    and not pd.isnull(row.get('quantity')) else 1
                trans_type = str(
                    row['type'] if 'type' in df.columns
                    and not pd.isnull(row.get('type'))
                    else 'sale'
                ).strip().lower()

                # Get or create product
                product = Product.query.filter_by(
                    BusinessID=business_id,
                    ProductName=product_name
                ).first()

                if not product:
                    product = Product(
                        BusinessID=business_id,
                        ProductName=product_name,
                        ProductCategory=category,
                        ProductCost=cost,
                        ProductPrice=price
                    )
                    db.session.add(product)
                    db.session.flush()

                transaction = Transaction(
                    BusinessID=business_id,
                    ProductID=product.ProductID,
                    TransactionDate=row['date'].date(),
                    TransactionAmount=price,
                    Quantity=quantity,
                    TransactionType=trans_type
                )
                db.session.add(transaction)
                rows_imported += 1

            except Exception as e:
                errors.append(f'Row error: {str(e)}')
                continue

        # Save upload record
        upload_record = Upload(
            BusinessID=business_id,
            FileName=filename,
            RowsImported=rows_imported,
            Status='success'
        )
        db.session.add(upload_record)
        db.session.commit()

        return {
            'success': True,
            'rows_imported': rows_imported,
            'errors': errors
        }

    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}