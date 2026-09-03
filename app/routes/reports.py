from flask import Blueprint, jsonify, request, send_file
from flask_login import login_required, current_user
from app import db
from app.models.business import Business
from app.models.transaction import Transaction
from app.models.product import Product
from app.utils import owner_required, staff_or_owner_required
from sqlalchemy import func
import pandas as pd
import io
from datetime import datetime

reports = Blueprint('reports', __name__)


def get_business(user):
    try:
        if user.is_owner():
            return Business.query.filter_by(UserID=user.UserID).first()
        return Business.query.get(user.BusinessID) if user.BusinessID else None
    except Exception as e:
        print(f"[get_business error] {e}")
        return None


@reports.route('/api/reports/summary')
@login_required
@staff_or_owner_required
def summary():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'data': [], 'role': current_user.Role})

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = db.session.query(
            Transaction.TransactionDate,
            Product.ProductName,
            Product.ProductCategory,
            Transaction.TransactionAmount,
            Transaction.Quantity,
            Transaction.TransactionType
        ).join(
            Product, Product.ProductID == Transaction.ProductID
        ).filter(
            Transaction.BusinessID == business.BusinessID
        )

        if current_user.is_staff():
            query = query.filter(Transaction.TransactionType == 'sale')

        if start_date:
            query = query.filter(Transaction.TransactionDate >= start_date)
        if end_date:
            query = query.filter(Transaction.TransactionDate <= end_date)

        results = query.order_by(
            Transaction.TransactionDate.desc()
        ).all()

        return jsonify({
            'data': [{
                'date': str(r.TransactionDate),
                'product': r.ProductName,
                'category': r.ProductCategory,
                'amount': float(r.TransactionAmount),
                'quantity': r.Quantity,
                'type': r.TransactionType
            } for r in results],
            'role': current_user.Role
        })

    except Exception as e:
        print(f"[REPORTS ERROR] {str(e)}")
        return jsonify({'data': [], 'error': str(e)}), 500


@reports.route('/api/reports/export')
@login_required
@owner_required
def export():
    try:
        business = get_business(current_user)
        if not business:
            return jsonify({'error': 'No business found'}), 404

        results = db.session.query(
            Transaction.TransactionDate,
            Product.ProductName,
            Product.ProductCategory,
            Transaction.TransactionAmount,
            Transaction.Quantity,
            Transaction.TransactionType
        ).join(
            Product, Product.ProductID == Transaction.ProductID
        ).filter(
            Transaction.BusinessID == business.BusinessID
        ).all()

        df = pd.DataFrame([{
            'Date': r.TransactionDate,
            'Product': r.ProductName,
            'Category': r.ProductCategory,
            'Amount (KES)': float(r.TransactionAmount),
            'Quantity': r.Quantity,
            'Type': r.TransactionType
        } for r in results])

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Transactions')
        output.seek(0)

        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'bizinsight_report_{datetime.now().strftime("%Y%m%d")}.xlsx'
        )

    except Exception as e:
        print(f"[EXPORT ERROR] {str(e)}")
        return jsonify({'error': str(e)}), 500

@reports.route('/api/reports/export-pdf')
@login_required
@owner_required
def export_pdf():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle,
                                        Paragraph, Spacer, HRFlowable)
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

        business = get_business(current_user)
        if not business:
            return jsonify({'error': 'No business found'}), 404

        # Fetch data
        results = db.session.query(
            Transaction.TransactionDate,
            Product.ProductName,
            Product.ProductCategory,
            Transaction.TransactionAmount,
            Transaction.Quantity,
            Transaction.TransactionType
        ).join(
            Product, Product.ProductID == Transaction.ProductID
        ).filter(
            Transaction.BusinessID == business.BusinessID
        ).order_by(Transaction.TransactionDate.desc()).limit(100).all()

        # KPIs
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

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                 rightMargin=2*cm, leftMargin=2*cm,
                                 topMargin=2*cm, bottomMargin=2*cm)

        styles = getSampleStyleSheet()
        NAVY  = colors.HexColor('#1A1A2E')
        RED   = colors.HexColor('#E94560')
        GREEN = colors.HexColor('#11998E')
        GREY  = colors.HexColor('#F8F9FA')

        title_style = ParagraphStyle('title', parent=styles['Heading1'],
                                      textColor=NAVY, fontSize=20,
                                      spaceAfter=4, alignment=TA_LEFT)
        sub_style   = ParagraphStyle('sub', parent=styles['Normal'],
                                      textColor=colors.grey, fontSize=10,
                                      spaceAfter=16)
        label_style = ParagraphStyle('label', parent=styles['Normal'],
                                      textColor=colors.white, fontSize=9,
                                      alignment=TA_CENTER)
        value_style = ParagraphStyle('value', parent=styles['Normal'],
                                      textColor=NAVY, fontSize=13,
                                      fontName='Helvetica-Bold',
                                      alignment=TA_CENTER)

        story = []

        # Header
        story.append(Paragraph(f"{business.BusinessName}", title_style))
        story.append(Paragraph(
            f"Business Report  |  Generated {datetime.now().strftime('%d %B %Y %H:%M')}  "
            f"|  Currency: {business.BusinessCurrency or 'KES'}",
            sub_style))
        story.append(HRFlowable(width="100%", thickness=2,
                                 color=RED, spaceAfter=16))

        # KPI table
        profit = float(total_revenue) - float(total_expenses)
        kpi_data = [
            [Paragraph('TOTAL REVENUE', label_style),
             Paragraph('TOTAL EXPENSES', label_style),
             Paragraph('NET PROFIT', label_style)],
            [Paragraph(f"KES {float(total_revenue):,.0f}", value_style),
             Paragraph(f"KES {float(total_expenses):,.0f}", value_style),
             Paragraph(f"KES {profit:,.0f}", value_style)],
        ]
        kpi_table = Table(kpi_data, colWidths=[5.5*cm, 5.5*cm, 5.5*cm])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,0), NAVY),
            ('BACKGROUND', (1,0), (1,0), NAVY),
            ('BACKGROUND', (2,0), (2,0), GREEN if profit >= 0 else RED),
            ('BACKGROUND', (0,1), (0,1), GREY),
            ('BACKGROUND', (1,1), (1,1), GREY),
            ('BACKGROUND', (2,1), (2,1), GREY),
            ('ROWHEIGHT', (0,0), (-1,-1), 28),
            ('GRID', (0,0), (-1,-1), 0.5, colors.white),
            ('ROUNDEDCORNERS', [4]),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 20))

        # Transactions table
        story.append(Paragraph("Recent Transactions (last 100)",
                                ParagraphStyle('h2', parent=styles['Heading2'],
                                               textColor=NAVY, fontSize=13,
                                               spaceAfter=10)))

        table_data = [['Date', 'Product', 'Category',
                        'Amount (KES)', 'Qty', 'Type']]
        for r in results:
            table_data.append([
                str(r.TransactionDate),
                r.ProductName[:30],
                r.ProductCategory or '-',
                f"{float(r.TransactionAmount):,.0f}",
                str(r.Quantity),
                r.TransactionType
            ])

        col_widths = [2.5*cm, 5*cm, 3*cm, 3*cm, 1.5*cm, 2*cm]
        trans_table = Table(table_data, colWidths=col_widths,
                             repeatRows=1)
        trans_table.setStyle(TableStyle([
            ('BACKGROUND',  (0,0), (-1,0),  NAVY),
            ('TEXTCOLOR',   (0,0), (-1,0),  colors.white),
            ('FONTNAME',    (0,0), (-1,0),  'Helvetica-Bold'),
            ('FONTSIZE',    (0,0), (-1,0),  9),
            ('FONTSIZE',    (0,1), (-1,-1), 8),
            ('ROWBACKGROUNDS', (0,1), (-1,-1),
             [colors.white, colors.HexColor('#F8F9FA')]),
            ('GRID',        (0,0), (-1,-1), 0.3, colors.HexColor('#EEEEEE')),
            ('ALIGN',       (3,0), (4,-1),  'RIGHT'),
            ('TOPPADDING',  (0,0), (-1,-1), 5),
            ('BOTTOMPADDING',(0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(trans_table)

        # Footer
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=1,
                                 color=colors.lightgrey))
        story.append(Paragraph(
            f"Generated by BizInsight DSS  |  "
            f"{business.BusinessName}  |  Confidential",
            ParagraphStyle('footer', parent=styles['Normal'],
                            textColor=colors.grey, fontSize=8,
                            alignment=TA_CENTER, spaceBefore=8)))

        doc.build(story)
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{business.BusinessName}_report_'
                          f'{datetime.now().strftime("%Y%m%d")}.pdf'
        )

    except Exception as e:
        print(f"[PDF EXPORT ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500