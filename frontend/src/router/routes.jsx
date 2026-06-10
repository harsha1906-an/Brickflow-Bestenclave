import { lazy } from 'react';
// Force reload

import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));
const CustomerRead = lazy(() => import('@/pages/Customer/CustomerRead'));
const Lead = lazy(() => import('@/pages/Lead'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));

const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));
const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));
const Payment = lazy(() => import('@/pages/Payment/index'));
const PaymentRead = lazy(() => import('@/pages/Payment/PaymentRead'));
const PaymentUpdate = lazy(() => import('@/pages/Payment/PaymentUpdate'));
const PaymentUpdateList = lazy(() => import('@/pages/PaymentUpdate/index'));
const InvoiceUpdateList = lazy(() => import('@/pages/InvoiceUpdate/index'));
const Approvals = lazy(() => import('@/pages/Approvals'));

const Settings = lazy(() => import('@/pages/Settings/Settings'));

const Taxes = lazy(() => import('@/pages/Taxes'));

const Profile = lazy(() => import('@/pages/Profile'));


const About = lazy(() => import('@/pages/About'));
const AuditLog = lazy(() => import('@/pages/AuditLog'));

const Labour = lazy(() => import('@/pages/Labour'));
const Attendance = lazy(() => import('@/pages/Attendance'));
const VillaList = lazy(() => import('@/pages/Villa/VillaList'));
const VillaDetail = lazy(() => import('@/pages/Villa/VillaDetail'));
const VillaCreate = lazy(() => import('@/pages/Villa/VillaCreate'));
const VillaUpdate = lazy(() => import('@/pages/Villa/VillaUpdate'));
const PettyCash = lazy(() => import('@/pages/PettyCash'));
const DailyReport = lazy(() => import('@/pages/Attendance/DailyReport'));

const PurchaseOrder = lazy(() => import('@/pages/PurchaseOrder'));
const PurchaseOrderCreate = lazy(() => import('@/pages/PurchaseOrder/PurchaseOrderCreate'));
const PurchaseOrderUpdate = lazy(() => import('@/pages/PurchaseOrder/PurchaseOrderUpdate'));
const PurchaseOrderRead = lazy(() => import('@/pages/PurchaseOrder/PurchaseOrderRead'));
const Supplier = lazy(() => import('@/pages/Supplier'));
const SupplierCreate = lazy(() => import('@/pages/Supplier/SupplierCreate'));
const SupplierUpdate = lazy(() => import('@/pages/Supplier/SupplierUpdate'));
const SupplierRead = lazy(() => import('@/pages/Supplier/SupplierRead'));
const Project = lazy(() => import('@/pages/Project'));
const ProjectCreate = lazy(() => import('@/pages/Project/ProjectCreate'));
const ProjectUpdate = lazy(() => import('@/pages/Project/ProjectUpdate'));
const ProjectRead = lazy(() => import('@/pages/Project/ProjectRead'));
const Booking = lazy(() => import('@/pages/Booking/BookingList'));
const BookingCreate = lazy(() => import('@/pages/Booking/BookingCreate'));
const BookingRead = lazy(() => import('@/pages/Booking/BookingRead'));
const BookingUpdate = lazy(() => import('@/pages/Booking/BookingUpdate'));

const Expense = lazy(() => import('@/pages/Expense'));
const ExpenseCreate = lazy(() => import('@/pages/Expense/ExpenseCreate'));
const VillaReports = lazy(() => import('@/pages/VillaReports'));
const VillaReportDetail = lazy(() => import('@/pages/VillaReports/VillaReportDetail'));
const Reports = lazy(() => import('@/pages/Reports'));

let routes = {
  expense: [],
  default: [
    {
      path: '/login',
      element: <Navigate to="/" />,
    },
    {
      path: '/logout',
      element: <Logout />,
    },
    {
      path: '/about',
      element: <About />,
    },
    {
      path: '/audit-logs',
      element: <AuditLog />,
    },
    {
      path: '/',
      element: <Dashboard />,
    },
    {
      path: '/daily-summary',
      element: <DailyReport />,
    },
    {
      path: '/reports',
      element: <Reports />,
    },
    {
      path: '/villa-reports',
      element: <VillaReports />,
    },
    {
      path: '/villa-reports/:id',
      element: <VillaReportDetail />,
    },
    {
      path: '/customer',
      element: <Customer />,
    },
    {
      path: '/customer/read/:id',
      element: <CustomerRead />,
    },
    {
      path: '/lead/*',
      element: <Lead />,
    },
    {
      path: '/inventory/*',
      element: <Inventory />,
    },

    {
      path: '/expense',
      element: <Expense />,
    },
    {
      path: '/expense/create',
      element: <ExpenseCreate />,
    },

    // {
    //   path: '/invoice',
    //   element: <Invoice />,
    // },
    // {
    //   path: '/invoice/create',
    //   element: <InvoiceCreate />,
    // },
    // {
    //   path: '/invoice/read/:id',
    //   element: <InvoiceRead />,
    // },
    // {
    //   path: '/invoice/update/:id',
    //   element: <InvoiceUpdate />,
    // },
    // {
    //   path: '/invoice/pay/:id',
    //   element: <InvoiceRecordPayment />,
    // },
    {
      path: '/quote',
      element: <Quote />,
    },
    {
      path: '/quote/create',
      element: <QuoteCreate />,
    },
    {
      path: '/quote/read/:id',
      element: <QuoteRead />,
    },
    {
      path: '/quote/update/:id',
      element: <QuoteUpdate />,
    },
    {
      path: '/payment',
      element: <Payment />,
    },
    {
      path: '/payment/read/:id',
      element: <PaymentRead />,
    },
    {
      path: '/payment/update/:id',
      element: <PaymentUpdate />,
    },
    {
      path: '/paymentupdate',
      element: <PaymentUpdateList />,
    },
    // {
    //   path: '/invoiceupdate',
    //   element: <InvoiceUpdateList />,
    // },
    {
      path: '/approvals',
      element: <Approvals />,
    },

    {
      path: '/settings',
      element: <Settings />,
    },
    {
      path: '/settings/edit/:settingsKey',
      element: <Settings />,
    },

    {
      path: '/taxes',
      element: <Taxes />,
    },

    {
      path: '/labour',
      element: <Labour />,
    },
    {
      path: '/attendance',
      element: <Attendance />,
    },
    {
      path: '/villa',
      element: <VillaList />,
    },
    {
      path: '/villa/create',
      element: <VillaCreate />,
    },
    {
      path: '/villa/update/:id',
      element: <VillaUpdate />,
    },
    {
      path: '/villa/read/:villaId',
      element: <VillaDetail />,
    },
    {
      path: '/pettycash/*',
      element: <PettyCash />,
    },

    {
      path: '/purchaseorder',
      element: <PurchaseOrder />,
    },
    {
      path: '/purchaseorder/create',
      element: <PurchaseOrderCreate />,
    },
    {
      path: '/purchaseorder/read/:id',
      element: <PurchaseOrderRead />,
    },
    {
      path: '/purchaseorder/update/:id',
      element: <PurchaseOrderUpdate />,
    },
    {
      path: '/supplier',
      element: <Supplier />,
    },
    {
      path: '/supplier/create',
      element: <SupplierCreate />,
    },
    {
      path: '/supplier/update/:id',
      element: <SupplierUpdate />,
    },
    {
      path: '/supplier/read/:id',
      element: <SupplierRead />,
    },
    {
      path: '/project',
      element: <Project />,
    },
    {
      path: '/project/create',
      element: <ProjectCreate />,
    },
    {
      path: '/project/update/:id',
      element: <ProjectUpdate />,
    },
    {
      path: '/project/read/:id',
      element: <ProjectRead />,
    },
    {
      path: '/booking',
      element: <Booking />,
    },
    {
      path: '/booking/create',
      element: <BookingCreate />,
    },
    {
      path: '/booking/read/:id',
      element: <BookingRead />,
    },
    {
      path: '/booking/update/:id',
      element: <BookingUpdate />,
    },
    {
      path: '/profile',
      element: <Profile />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
};

export default routes;
