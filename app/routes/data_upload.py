from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.models.upload import Upload
from app.models.transaction import Transaction
from app.models.product import Product
from app.services.data_processor import process_file
from app.utils import owner_required
from werkzeug.utils import secure_filename
import os
import io
import csv

data_upload = Blueprint('data_upload', __name__)

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@data_upload.route('/api/upload', methods=['POST'])
@login_required
@owner_required
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Use CSV or Excel only'}), 400

    business = Business.query.filter_by(UserID=current_user.UserID).first()
    if not business:
        return jsonify({'error': 'No business found'}), 404

    filename = secure_filename(file.filename)
    upload_path = os.path.join('uploads', filename)

    os.makedirs('uploads', exist_ok=True)
    file.save(upload_path)

    result = process_file(upload_path, business.BusinessID, db, filename)

    # Clean up temp file
    if os.path.exists(upload_path):
        os.remove(upload_path)

    if result['success']:
        from app.utils import log_action
        log_action(db, current_user, business.BusinessID,
                   'FILE_UPLOAD',
                   f'Uploaded {filename} — {result["rows_imported"]} records',
                   request)

        return jsonify({
            'success': True,
            'message': f"Successfully imported {result['rows_imported']} records",
            'rows_imported': result['rows_imported'],
            'errors': result.get('errors', [])
        })
    else:
        return jsonify({'error': result['error']}), 400


@data_upload.route('/api/uploads/history')
@login_required
def upload_history():
    business = Business.query.filter_by(UserID=current_user.UserID).first()
    if not business:
        return jsonify({'uploads': []})

    uploads = Upload.query.filter_by(
        BusinessID=business.BusinessID
    ).order_by(Upload.UploadedAt.desc()).all()

    return jsonify({
        'uploads': [{
            'id': u.UploadID,
            'filename': u.FileName,
            'rows_imported': u.RowsImported,
            'uploaded_at': u.UploadedAt.strftime('%d/%m/%Y %H:%M'),
            'status': u.Status
        } for u in uploads]
    })


@data_upload.route('/api/uploads/<int:upload_id>', methods=['DELETE'])
@login_required
@owner_required
def delete_upload(upload_id):
    try:
        business = Business.query.filter_by(UserID=current_user.UserID).first()
        if not business:
            return jsonify({'error': 'No business found'}), 404

        upload = Upload.query.filter_by(
            UploadID=upload_id,
            BusinessID=business.BusinessID
        ).first()

        if not upload:
            return jsonify({'error': 'Upload record not found'}), 404

        # Check if user wants to delete associated transaction data
        delete_data = request.args.get('delete_data', 'false').lower() == 'true'

        if delete_data:
            # Find and delete transactions imported around the same time
            # We match by upload time window (within 60 seconds of upload)
            from datetime import timedelta
            time_window_start = upload.UploadedAt - timedelta(seconds=60)
            time_window_end = upload.UploadedAt + timedelta(seconds=60)

            deleted_transactions = Transaction.query.filter(
                Transaction.BusinessID == business.BusinessID,
                Transaction.TransactionID.in_(
                    db.session.query(Transaction.TransactionID).filter(
                        Transaction.BusinessID == business.BusinessID
                    ).order_by(
                        Transaction.TransactionID.desc()
                    ).limit(upload.RowsImported)
                )
            ).all()

            for t in deleted_transactions:
                db.session.delete(t)

        db.session.delete(upload)
        db.session.commit()
        

        message = 'Upload and associated data deleted' if delete_data \
                  else 'Upload record deleted. Data kept in system.'
        return jsonify({'success': True, 'message': message})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@data_upload.route('/api/sample-csv')
@login_required
def sample_csv():
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(['date', 'product', 'amount', 'quantity',
                     'category', 'cost', 'type'])
    writer.writerow(['01/01/2025', 'Maize Flour 2kg', '150.00',
                     '5', 'Groceries', '100.00', 'sale'])
    writer.writerow(['01/01/2025', 'Cooking Oil 1L', '220.00',
                     '3', 'Groceries', '160.00', 'sale'])
    writer.writerow(['02/01/2025', 'Sugar 1kg', '130.00',
                     '8', 'Groceries', '90.00', 'sale'])
    writer.writerow(['02/01/2025', 'Rent Payment', '15000.00',
                     '1', 'Overhead', '15000.00', 'expense'])
    writer.writerow(['03/01/2025', 'Bread Loaf', '65.00',
                     '10', 'Bakery', '45.00', 'sale'])
    writer.writerow(['03/01/2025', 'Milk 500ml', '55.00',
                     '12', 'Dairy', '38.00', 'sale'])
    writer.writerow(['04/01/2025', 'Maize Flour 2kg', '150.00',
                     '4', 'Groceries', '100.00', 'sale'])
    writer.writerow(['04/01/2025', 'Electricity Bill', '3500.00',
                     '1', 'Overhead', '3500.00', 'expense'])
    writer.writerow(['05/01/2025', 'Rice 1kg', '180.00',
                     '6', 'Groceries', '130.00', 'sale'])
    writer.writerow(['05/01/2025', 'Cooking Oil 1L', '220.00',
                     '2', 'Groceries', '160.00', 'sale'])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode()),
        mimetype='text/csv',
        as_attachment=True,
        download_name='bizinsight_sample.csv'
    )