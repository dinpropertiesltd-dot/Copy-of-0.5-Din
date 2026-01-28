
import { PropertyFile, Transaction, User, Notice, Message } from './types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    cnic: '33201-1691812-5',
    name: 'Imran Khan',
    email: 'imran.khan@example.pk',
    phone: '0300-3308312',
    role: 'CLIENT',
    status: 'Active',
    password: 'password123'
  },
  {
    id: 'unclaimed-sap-1',
    cnic: '33100-0000000-1',
    name: 'Unclaimed Member',
    email: 'unclaimed@sap.pk',
    phone: '0311-0000000',
    role: 'CLIENT',
    status: 'Inactive',
    password: '' // No password = Triggers activation flow on signup
  },
  {
    id: 'admin',
    cnic: '00000-0000000-0',
    name: 'System Admin',
    email: 'admin@dinproperties.com.pk',
    phone: '0000-0000000',
    role: 'ADMIN',
    status: 'Active',
    password: 'password123'
  }
];

const sampleTransactions: Transaction[] = [
  { seq: 1, transid: 1, line_id: 0, shortname: "DGFD1-01001", duedate: "26-May-23", receivable: 765000, u_intno: 1, u_intname: "BOOKING", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 765000, receipt_date: "26-May-23", mode: "Cash", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 2, transid: 2, line_id: 0, shortname: "DGFD1-01001", duedate: "26-May-23", receivable: 785000, u_intno: 2, u_intname: "CONFIRMATION", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 785000, receipt_date: "26-May-23", mode: "Cash", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 3, transid: 3, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Nov-24", receivable: 47000, u_intno: 3, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "03-Sep-24", mode: "Cash", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 4, transid: 4, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Dec-24", receivable: 47000, u_intno: 4, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "06-Nov-24", mode: "Cash", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 5, transid: 5, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Jan-25", receivable: 47000, u_intno: 5, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "04-Jan-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 6, transid: 6, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Feb-25", receivable: 47000, u_intno: 6, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "05-Feb-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 7, transid: 7, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Mar-25", receivable: 47000, u_intno: 7, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "05-Mar-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 8, transid: 81, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Apr-25", receivable: 248000, u_intno: 8, u_intname: "BALOON", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "08-Apr-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 9, transid: 82, line_id: 1, shortname: "DGFD1-01001", duedate: "10-Apr-25", receivable: 0, u_intno: 8, u_intname: "BALOON", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 201000, receipt_date: "22-Apr-25", mode: "Online", surcharge: 2775, balduedeb: 0, paysrc: 0 },
  { seq: 10, transid: 9, line_id: 0, shortname: "DGFD1-01001", duedate: "10-May-25", receivable: 47000, u_intno: 9, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "06-May-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 11, transid: 10, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Jun-25", receivable: 47000, u_intno: 10, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "03-Jun-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 12, transid: 11, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Jul-25", receivable: 47000, u_intno: 11, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Paid", balance: 0, amount_paid: 47000, receipt_date: "02-Jul-25", mode: "Online", surcharge: 0, balduedeb: 0, paysrc: 0 },
  { seq: 13, transid: 17, line_id: 0, shortname: "DGFD1-01001", duedate: "10-Jan-26", receivable: 47000, u_intno: 17, u_intname: "INSTALLMENT", transtype: "13", itemcode: "DGFD1-01001", plottype: "Residential", currency: "PKR", description: "10 Marla", doctotal: 7750000, status: "Unpaid", balance: 47000, amount_paid: 0, receipt_date: "", mode: "", surcharge: 0, balduedeb: 47000, paysrc: 0 },
];

export const MOCK_FILES: PropertyFile[] = [
  {
    fileNo: 'DGFD1-01001',
    currencyNo: 'HY3342788',
    plotSize: '10 Marla-Residential',
    plotValue: 7750000,
    balance: 5140000,
    receivable: 7750000,
    totalReceivable: 7750000,
    paymentReceived: 2610000,
    surcharge: 2775,
    overdue: 0,
    ownerName: 'Imran Khan',
    ownerCNIC: '33201-1691812-5',
    fatherName: 'Abdul Rehman',
    cellNo: '0300-3308312',
    regDate: '04-Sep-2024',
    address: 'House No 23-E, Din Gardens, Chiniot.',
    plotNo: '-', block: '-', park: '-', corner: '-', mainBoulevard: '-',
    transactions: sampleTransactions
  },
  {
    fileNo: 'DGFD1-SAP-99',
    currencyNo: '-',
    plotSize: '5 Marla-Residential',
    plotValue: 3500000,
    balance: 3500000,
    receivable: 3500000,
    totalReceivable: 3500000,
    paymentReceived: 0,
    surcharge: 0,
    overdue: 0,
    ownerName: 'Unclaimed Member',
    ownerCNIC: '33100-0000000-1',
    fatherName: '-',
    cellNo: '0311-0000000',
    regDate: '01-Jan-2024',
    address: 'Imported from SAP',
    plotNo: '-', block: '-', park: '-', corner: '-', mainBoulevard: '-',
    transactions: []
  }
];

export const MOCK_NOTICES: Notice[] = [
  { id: '1', title: 'Extension Notice - Policies for Discounts', content: 'Updated Corporate Policies on Balloting, Possessions, Surcharges & Special Discounts etc.', date: '19-Apr-2024', type: 'Policy' },
];

export const MOCK_MESSAGES: Message[] = [
  { 
    id: '1', 
    senderId: 'admin',
    senderName: 'Sales Admin', 
    receiverId: 'ALL',
    subject: 'Welcome to DIN Properties Portal', 
    body: 'Dear Valued Member, welcome to our new customer portal. You can now track your payments here.', 
    date: '2024-05-10', 
    isRead: false,
    type: 'Broadcast'
  }
];
