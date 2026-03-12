import { deleteJson, getJson, postJson, putJson } from './api';

export const adminApi = {
  listProducts: () => getJson('/api/products'),
  createProduct: (payload: unknown) => postJson('/api/products', payload),
  updateProduct: (id: string, payload: unknown) => putJson(`/api/products/${id}`, payload),
  deleteProduct: (id: string) => deleteJson(`/api/products/${id}`),
  createVariant: (productId: string, payload: unknown) => postJson(`/api/products/${productId}/variants`, payload),
  updateVariant: (variantId: string, payload: unknown) => putJson(`/api/catalog/variants/${variantId}`, payload),
  getInventory: (productId: string) => getJson(`/api/products/${productId}/inventory`),
  updateInventory: (variantId: string, storeId: string, stock_quantity: number) =>
    putJson(`/api/catalog/variants/${variantId}/inventory/${storeId}`, { stock_quantity }),

  listCategories: () => getJson('/api/catalog/categories'),
  createCategory: (payload: unknown) => postJson('/api/catalog/categories', payload),
  updateCategory: (id: string, payload: unknown) => putJson(`/api/catalog/categories/${id}`, payload),
  deleteCategory: (id: string) => deleteJson(`/api/catalog/categories/${id}`),

  listAttributes: () => getJson('/api/catalog/attributes'),
  createAttribute: (payload: unknown) => postJson('/api/catalog/attributes', payload),
  updateAttribute: (id: number, payload: unknown) => putJson(`/api/catalog/attributes/${id}`, payload),
  deleteAttribute: (id: number) => deleteJson(`/api/catalog/attributes/${id}`),

  listStores: () => getJson('/api/stores'),
  createStore: (payload: unknown) => postJson('/api/stores', payload),
  updateStore: (id: string | number, payload: unknown) => putJson(`/api/stores/${id}`, payload),
  deleteStore: (id: string | number) => deleteJson(`/api/stores/${id}`),
  getRoutingMode: () => getJson('/api/stores/routing/config'),
  setRoutingMode: (mode: 'region' | 'quantity') => putJson('/api/stores/routing/config', { mode }),

  getIntegrationSettings: () => getJson('/api/integration/settings'),
  updateIntegrationSettings: (payload: unknown) => putJson('/api/integration/settings', payload),
  manualSync: () => postJson('/api/integration/sync/manual', {}),
  getSyncLogs: () => getJson('/api/integration/logs'),

  listCoupons: () => getJson('/api/discounts/coupons'),
  createCoupon: (payload: unknown) => postJson('/api/discounts/coupons', payload),
  updateCoupon: (id: number, payload: unknown) => putJson(`/api/discounts/coupons/${id}`, payload),
  deleteCoupon: (id: number) => deleteJson(`/api/discounts/coupons/${id}`),

  listOrders: () => getJson('/api/orders'),
  getDashboardSummary: (params?: { threshold?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.threshold != null) search.set('threshold', String(params.threshold));
    if (params?.limit != null) search.set('limit', String(params.limit));
    const query = search.toString();
    return getJson(`/api/orders/dashboard/summary${query ? `?${query}` : ''}`);
  },
  getOrder: (id: number) => getJson(`/api/orders/${id}`),
  updateOrderStatus: (id: number, status: string) => putJson(`/api/orders/${id}/status`, { status }),
  createOrder: (payload: unknown) => postJson('/api/orders', payload),

  listPayments: () => getJson('/api/payments'),
  createCheckout: (payload: unknown) => postJson('/api/payments/checkout', payload),
  getPaymentByOrder: (orderId: number) => getJson(`/api/payments/order/${orderId}`),
  listPaymentWebhookLogs: () => getJson('/api/payments/webhooks/logs'),

  listShipments: () => getJson('/api/shipping'),
  generateShippingLabel: (orderId: number) => postJson(`/api/shipping/orders/${orderId}/label`, {}),
  getOrderTracking: (orderId: number) => getJson(`/api/shipping/orders/${orderId}/tracking`),
  updateOrderTrackingStatus: (orderId: number, payload: { status: string; location?: string; description?: string }) =>
    putJson(`/api/shipping/orders/${orderId}/status`, payload),

  listReportSchedules: () => getJson('/api/reports/schedules'),
  createReportSchedule: (payload: unknown) => postJson('/api/reports/schedules', payload),
  updateReportSchedule: (id: number, payload: unknown) => putJson(`/api/reports/schedules/${id}`, payload),
  deleteReportSchedule: (id: number) => deleteJson(`/api/reports/schedules/${id}`),
  runReportsNow: (schedule_id?: number) => postJson('/api/reports/run-now', schedule_id ? { schedule_id } : {}),

  listInvoices: () => getJson('/api/invoices'),
  resendInvoice: (id: number) => postJson(`/api/invoices/${id}/resend`, {}),
  syncInvoices: () => postJson('/api/invoices/sync/pending', {}),

  listLoginActivity: () => getJson('/api/security/login-activity'),
  createLoginActivity: (payload: unknown) => postJson('/api/security/login-activity', payload),

  getLanguages: () => getJson('/api/languages'),
  setLanguages: (languages: string[]) => putJson('/api/languages', { languages }),

  getSystemModules: () => getJson('/api/system/modules'),
  setSystemModule: (moduleKey: string, enabled: boolean) =>
    putJson(`/api/system/modules/${moduleKey}`, { enabled }),
  getGeneralSettings: () => getJson('/api/system/general-settings'),
  setGeneralSettings: (payload: unknown) => putJson('/api/system/general-settings', payload),

  listBlogPosts: () => getJson('/api/blog/admin'),
  createBlogPost: (payload: unknown) => postJson('/api/blog/admin', payload),
  updateBlogPost: (id: string, payload: unknown) => putJson(`/api/blog/admin/${id}`, payload),
  deleteBlogPost: (id: string) => deleteJson(`/api/blog/admin/${id}`),

  changeAdminPassword: (payload: { email: string; current_password: string; new_password: string }) =>
    postJson('/api/auth/change-password', payload),
};
