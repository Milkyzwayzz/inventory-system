import jsPDF from 'jspdf';

/**
 * Generates a professional PDF invoice for a completed/paid print job.
 * @param {Object} order - The print job document from Firestore.
 */
export const generateInvoice = (order) => {
  if (!order) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette
  const primaryColor = [124, 58, 237]; // Purple #7C3AED
  const darkSlate = [15, 23, 42];      // Slate #0F172A
  const lightGray = [248, 250, 252];    // Gray #F8FAFC
  const borderGray = [226, 232, 240];   // Border #E2E8F0
  const mutedText = [100, 116, 139];    // Muted #64748B

  // Helper to set color
  const setFill = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setText = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

  // Header Banner
  setFill(primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('PRESS PRO', 20, 25);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(196, 181, 253);
  doc.text('PREMIUM PRINTING SERVICES', 20, 31);

  // Invoice Text Right-aligned
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE / RECEIPT', 190, 25, { align: 'right' });

  // Bill To / Details Group
  let y = 55;
  setText(darkSlate);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BILL TO:', 20, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(order.customerName || 'Customer', 20, y + 6);
  doc.text(order.customerEmail || 'N/A', 20, y + 11);
  if (order.deliveryDetails?.phone) {
    doc.text(`Tel: ${order.deliveryDetails.phone}`, 20, y + 16);
  }

  // Invoice Metadata Right-aligned
  doc.setFont('Helvetica', 'bold');
  doc.text('Order ID:', 130, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(order.id?.toUpperCase() || 'N/A', 155, y);

  doc.setFont('Helvetica', 'bold');
  doc.text('Date:', 130, y + 6);
  doc.setFont('Helvetica', 'normal');
  const dateStr = order.createdAt instanceof Date 
    ? order.createdAt.toLocaleDateString()
    : new Date().toLocaleDateString();
  doc.text(dateStr, 155, y + 6);

  doc.setFont('Helvetica', 'bold');
  doc.text('Payment Status:', 130, y + 11);
  doc.setFont('Helvetica', 'bold');
  if (order.paymentStatus === 'paid') {
    doc.setTextColor(22, 101, 52); // Green text
    doc.text('PAID ✓', 165, y + 11);
  } else {
    doc.setTextColor(153, 27, 27); // Red text
    doc.text('UNPAID', 165, y + 11);
  }
  setText(darkSlate);

  // Draw Horizontal Separator
  y = 80;
  setDraw(borderGray);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);

  // Table Headers
  y = 90;
  setFill(lightGray);
  doc.rect(20, y - 5, 170, 8, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Description', 22, y);
  doc.text('Qty', 120, y, { align: 'right' });
  doc.text('Rate', 150, y, { align: 'right' });
  doc.text('Total', 185, y, { align: 'right' });

  // Items
  doc.setFont('Helvetica', 'normal');
  y += 10;

  // Base Printing Item
  const basePrice = order.cataloguePricePerPage || 0.15;
  const pages = order.pages || 1;
  const copies = order.copies || 1;
  const printingTotal = basePrice * pages * copies;
  
  doc.text(`${order.catalogueItem || 'Custom Document Printing'} (${pages} pgs)`, 22, y);
  doc.text(`${copies}x`, 120, y, { align: 'right' });
  doc.text(`RM ${basePrice.toFixed(2)}`, 150, y, { align: 'right' });
  doc.text(`RM ${printingTotal.toFixed(2)}`, 185, y, { align: 'right' });

  // Optional: Cover Page
  if (order.includeCoverPage) {
    y += 8;
    const coverCharge = order.coverPage?.charge || 5;
    doc.text(`Premium Cover Page (${order.coverPage?.title || 'Untitled'})`, 22, y);
    doc.text('1', 120, y, { align: 'right' });
    doc.text(`RM ${coverCharge.toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`RM ${coverCharge.toFixed(2)}`, 185, y, { align: 'right' });
  }

  // Optional: Binding
  if (order.binding && order.binding.toLowerCase() !== 'none') {
    y += 8;
    const bindingCost = order.bindingFee || 0;
    doc.text(`Binding Option: ${order.binding}`, 22, y);
    doc.text('1', 120, y, { align: 'right' });
    doc.text(`RM ${bindingCost.toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`RM ${bindingCost.toFixed(2)}`, 185, y, { align: 'right' });
  }

  // Optional: Thesis Gold Embossing
  if (order.goldEmbossing) {
    y += 8;
    const goldEmbossingFee = order.goldEmbossingFee || 15;
    doc.text('Thesis Gold-Embossing Premium', 22, y);
    doc.text('1', 120, y, { align: 'right' });
    doc.text(`RM ${goldEmbossingFee.toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`RM ${goldEmbossingFee.toFixed(2)}`, 185, y, { align: 'right' });
  }

  // Optional: Delivery
  if (order.deliverySelected) {
    y += 8;
    const deliveryCharge = order.deliveryCharge || 8;
    doc.text(`Delivery Charge (${order.deliveryDistanceKm?.toFixed(1) || '0'} km)`, 22, y);
    doc.text('1', 120, y, { align: 'right' });
    doc.text(`RM ${deliveryCharge.toFixed(2)}`, 150, y, { align: 'right' });
    doc.text(`RM ${deliveryCharge.toFixed(2)}`, 185, y, { align: 'right' });
  }

  // Totals Area
  y += 15;
  doc.line(20, y, 190, y);

  y += 8;
  doc.setFont('Helvetica', 'bold');
  doc.text('Subtotal:', 140, y, { align: 'right' });
  doc.setFont('Helvetica', 'normal');
  doc.text(`RM ${order.subtotal?.toFixed(2) || order.price?.toFixed(2)}`, 185, y, { align: 'right' });

  if (order.deliverySelected) {
    y += 6;
    doc.setFont('Helvetica', 'bold');
    doc.text('Delivery Fee:', 140, y, { align: 'right' });
    doc.setFont('Helvetica', 'normal');
    doc.text(`RM ${(order.deliveryCharge || 8).toFixed(2)}`, 185, y, { align: 'right' });
  }

  y += 8;
  setFill(lightGray);
  doc.rect(120, y - 5, 70, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Grand Total:', 140, y);
  doc.text(`RM ${order.price?.toFixed(2)}`, 185, y, { align: 'right' });

  // Payment Audit Segment
  y += 20;
  doc.rect(20, y, 170, 22, 'S');
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.text('PAYMENT TRANSACTIONS AUDIT TRAIL', 24, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.text(`Method: ${order.paymentMethod?.toUpperCase() || 'N/A'}`, 24, y + 10);
  doc.text(`Provider: ${order.paymentProvider || 'N/A'}`, 24, y + 15);
  doc.text(`Token ID: ${order.paymentToken || 'N/A'}`, 90, y + 10);
  
  const formattedTime = order.updatedAt instanceof Date 
    ? order.updatedAt.toLocaleString()
    : new Date().toLocaleString();
  doc.text(`Settlement Time: ${formattedTime}`, 90, y + 15);

  // Footer Disclaimer
  doc.setFontSize(7);
  setText(mutedText);
  doc.text('Thank you for choosing PRESS PRO. This document serves as an official proof of payment.', 105, 280, { align: 'center' });

  doc.save(`Invoice-${order.id?.slice(-8).toUpperCase()}.pdf`);
};
