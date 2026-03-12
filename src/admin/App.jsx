// import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { UserAuthProvider } from "@/contexts/UserAuthContext";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrdersPage from "./pages/Orders";
import OrderDetailsPage from "./pages/OrderDetails";
import Account from "./pages/Account";
import Otp from "./pages/Otp";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProducts from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Stores from "./pages/admin/Stores";
import Orders from "./pages/admin/Orders";
import OrdersPackaging from "./pages/admin/OrdersPackaging";
import OrdersShipped from "./pages/admin/OrdersShipped";
import OrdersDelivered from "./pages/admin/OrdersDelivered";
import OrdersCancelled from "./pages/admin/OrdersCancelled";
import Payments from "./pages/admin/Payments";
import DiscountsCoupons from "./pages/admin/DiscountsCoupons";
import DiscountsProductDiscounts from "./pages/admin/DiscountsProductDiscounts";
import Shipping from "./pages/admin/Shipping";
import Invoices from "./pages/admin/Invoices";
import Reports from "./pages/admin/Reports";
import Customers from "./pages/admin/Customers";
import Integrations from "./pages/admin/Integrations";
import Languages from "./pages/admin/Languages";
import Settings from "./pages/admin/Settings";
import Security from "./pages/admin/Security";
import LowStockProducts from "./pages/admin/LowStockProducts";
import Blogs from "./pages/admin/Blogs";
const queryClient = new QueryClient();
const AdminGate = ({ children }) => {
  const { isAdmin } = useAdminAuth();
  if (!isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }
  return <>{children}</>;
};
const App = () => <QueryClientProvider client={queryClient}>
    <AdminAuthProvider>
      <UserAuthProvider>
        <LanguageProvider>
          <CartProvider>
            <TooltipProvider>
              {/* <Toaster /> */}
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route
  path="/admin"
  element={<AdminGate>
                        <AdminLayout />
                      </AdminGate>}
>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="stores" element={<Stores />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/total" element={<Orders />} />
                    <Route path="orders/packaging" element={<OrdersPackaging />} />
                    <Route path="orders/shipped" element={<OrdersShipped />} />
                    <Route path="orders/delivered" element={<OrdersDelivered />} />
                    <Route path="orders/cancelled" element={<OrdersCancelled />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="discounts" element={<Navigate to="/admin/discounts/coupons" replace />} />
                    <Route path="discounts/coupons" element={<DiscountsCoupons />} />
                    <Route path="discounts/product-discounts" element={<DiscountsProductDiscounts />} />
                    <Route path="shipping" element={<Shipping />} />
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="integrations" element={<Integrations />} />
                    <Route path="languages" element={<Languages />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="security" element={<Security />} />
                    <Route path="low-stock" element={<LowStockProducts />} />
                    <Route path="blogs" element={<Blogs />} />
                  </Route>
                  <Route path="/store" element={<Index />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:id" element={<OrderDetailsPage />} />
                  <Route path="/otp" element={<Otp />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </LanguageProvider>
      </UserAuthProvider>
    </AdminAuthProvider>
  </QueryClientProvider>;
var stdin_default = App;
export {
  stdin_default as default
};
