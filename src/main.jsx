import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ProductsPage from './ProductsPage.jsx'
import ProductDetailsPage from './ProductDetailsPage.jsx'
import CartPage from './CartPage.jsx'
import CheckoutPage from './CheckoutPage.jsx'
import ThankYouPage from './ThankYouPage.jsx'
import BlogsPage from './BlogsPage.jsx'
import BlogDetails from './BlogDetails.jsx'
import ThankuMessagePage from './ThankuMessagePage.jsx'
import ContactPage from './ContactPage.jsx'
import AboutUsPage from './AboutUsPage.jsx'

import { AdminAuthProvider, useAdminAuth } from './admin/contexts/AdminAuthContext.jsx'
import AdminLayout from './admin/components/admin/AdminLayout.jsx'
import AdminLogin from './admin/pages/admin/AdminLogin.jsx'
import Dashboard from './admin/pages/admin/Dashboard.jsx'
import AdminProducts from './admin/pages/admin/Products.jsx'
import Categories from './admin/pages/admin/Categories.jsx'
import Attributes from './admin/pages/admin/Attributes.jsx'
import Stores from './admin/pages/admin/Stores.jsx'
import Orders from './admin/pages/admin/Orders.jsx'
import OrdersPackaging from './admin/pages/admin/OrdersPackaging.jsx'
import OrdersShipped from './admin/pages/admin/OrdersShipped.jsx'
import OrdersDelivered from './admin/pages/admin/OrdersDelivered.jsx'
import OrdersCancelled from './admin/pages/admin/OrdersCancelled.jsx'
import Payments from './admin/pages/admin/Payments.jsx'
import DiscountsCoupons from './admin/pages/admin/DiscountsCoupons.jsx'
import DiscountsProductDiscounts from './admin/pages/admin/DiscountsProductDiscounts.jsx'
import Shipping from './admin/pages/admin/Shipping.jsx'
import Invoices from './admin/pages/admin/Invoices.jsx'
import Reports from './admin/pages/admin/Reports.jsx'
import Customers from './admin/pages/admin/Customers.jsx'
import Integrations from './admin/pages/admin/Integrations.jsx'
import Languages from './admin/pages/admin/Languages.jsx'
import Settings from './admin/pages/admin/Settings.jsx'
import Security from './admin/pages/admin/Security.jsx'
import LowStockProducts from './admin/pages/admin/LowStockProducts.jsx'
import Blogs from './admin/pages/admin/Blogs.jsx'

const AdminProviders = () => (
  <AdminAuthProvider>
    <Outlet />
  </AdminAuthProvider>
)

const AdminGate = ({ children }) => {
  const { isAdmin } = useAdminAuth()
  if (!isAdmin) {
    return <Navigate to='/admin-login' replace />
  }
  return <>{children}</>
}

const AdminLoginGate = () => {
  const { isAdmin } = useAdminAuth()
  if (isAdmin) {
    return <Navigate to='/admin' replace />
  }
  return <AdminLogin />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path='/' element={<App />} />

        <Route element={<AdminProviders />}>
          <Route path='/admin-login' element={<AdminLoginGate />} />
          <Route
            path='/admin'
            element={
              <AdminGate>
                <AdminLayout />
              </AdminGate>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path='products' element={<AdminProducts />} />
            <Route path='categories' element={<Categories />} />
            <Route path='attributes' element={<Attributes />} />
            <Route path='stores' element={<Stores />} />
            <Route path='orders' element={<Orders />} />
            <Route path='orders/total' element={<Orders />} />
            <Route path='orders/packaging' element={<OrdersPackaging />} />
            <Route path='orders/shipped' element={<OrdersShipped />} />
            <Route path='orders/delivered' element={<OrdersDelivered />} />
            <Route path='orders/cancelled' element={<OrdersCancelled />} />
            <Route path='payments' element={<Payments />} />
            <Route path='discounts' element={<Navigate to='/admin/discounts/coupons' replace />} />
            <Route path='discounts/coupons' element={<DiscountsCoupons />} />
            <Route path='discounts/product-discounts' element={<DiscountsProductDiscounts />} />
            <Route path='shipping' element={<Shipping />} />
            <Route path='invoices' element={<Invoices />} />
            <Route path='reports' element={<Reports />} />
            <Route path='customers' element={<Customers />} />
            <Route path='integrations' element={<Integrations />} />
            <Route path='languages' element={<Languages />} />
            <Route path='settings' element={<Settings />} />
            <Route path='security' element={<Security />} />
            <Route path='low-stock' element={<LowStockProducts />} />
            <Route path='blogs' element={<Blogs />} />
          </Route>
        </Route>

        <Route path='/products' element={<ProductsPage />} />
        <Route path='/productDetails/:id' element={<ProductDetailsPage />} />
        <Route path='/productDetails' element={<ProductDetailsPage />} />
        <Route path='/cart' element={<CartPage />} />
        <Route path='/thank-you' element={<ThankYouPage />} />
        <Route path='/blog' element={<BlogsPage />} />
        <Route path='/checkout' element={<CheckoutPage />} />
        <Route path='/blog/:slug' element={<BlogDetails />} />
        <Route path='/blogDetails' element={<BlogDetails />} />
        <Route path='/thanku-message' element={<ThankuMessagePage />} />
        <Route path='/contact' element={<ContactPage />} />
        <Route path='/about-us' element={<AboutUsPage />} />
      </Routes>
    </Router>
  </StrictMode>
)
