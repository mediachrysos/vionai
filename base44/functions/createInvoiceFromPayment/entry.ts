import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_id } = await req.json();

    if (!payment_id) {
      return Response.json({ error: 'payment_id required' }, { status: 400 });
    }

    // Fetch payment
    const payments = await base44.entities.Payment.filter({ id: payment_id });
    if (!payments || payments.length === 0) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = payments[0];

    // Check if invoice already exists for this payment
    const existingInvoices = await base44.entities.Invoice.filter({ related_payment_id: payment_id });
    if (existingInvoices && existingInvoices.length > 0) {
      return Response.json({ 
        error: 'Invoice already exists for this payment', 
        invoice: existingInvoices[0] 
      }, { status: 409 });
    }

    // Fetch invoice settings
    const settings = await base44.entities.InvoiceSettings.list();
    const invoiceSettings = settings && settings.length > 0 ? settings[0] : {};

    // Generate next invoice number
    const year = new Date().getFullYear();
    const nextNumber = (invoiceSettings.last_invoice_number || 0) + 1;
    const invoiceNumber = `${year}${String(nextNumber).padStart(4, '0')}`;

    // Create invoice
    const invoiceData = {
      invoice_number: invoiceNumber,
      related_payment_id: payment_id,
      related_customer_id: payment.customer_id || '',
      supplier_company_name: invoiceSettings.company_name || '',
      supplier_address: invoiceSettings.company_address || '',
      supplier_ico: invoiceSettings.ico || '',
      supplier_dic: invoiceSettings.dic || '',
      supplier_email: invoiceSettings.email || '',
      supplier_phone: invoiceSettings.phone || '',
      customer_name: payment.customer_name || '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      taxable_supply_date: new Date().toISOString().split('T')[0],
      payment_method: payment.destination_account ? 'Bankovní převod' : 'Nespecifikováno',
      currency: 'CZK',
      item_name: payment.service_type || 'Služba',
      item_description: '',
      quantity: 1,
      unit_price: payment.amount || 0,
      total_amount: payment.amount || 0,
      status: 'draft',
      note: payment.note || ''
    };

    const invoice = await base44.entities.Invoice.create(invoiceData);

    // Update invoice settings with new number
    if (invoiceSettings.id) {
      await base44.entities.InvoiceSettings.update(invoiceSettings.id, { 
        last_invoice_number: nextNumber 
      });
    } else {
      await base44.entities.InvoiceSettings.create({ 
        company_name: invoiceSettings.company_name || 'Vaše Společnost',
        last_invoice_number: nextNumber 
      });
    }

    return Response.json({ invoice });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});