// Unikart Fullstack API Client
// Connects Next.js Frontend directly to the Java / Spring Boot 3 + PostgreSQL backend.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('unikart_token');
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('unikart_token', token);
  } else {
    localStorage.removeItem('unikart_token');
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !json.success) {
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }
    return json.data;
  } catch (err: any) {
    // If backend connection fails, throw with helpful message
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Cannot connect to Unikart Backend at ${API_BASE}. Make sure the Spring Boot service is running.`);
    }
    throw err;
  }
}

// ----------------------------------------------------------------------------
// Auth API
// ----------------------------------------------------------------------------
export interface LoginResponseData {
  token?: string;
  tokenType?: string;
  requires2Fa: boolean;
  tempToken?: string;
  message: string;
  user?: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
    designation: string;
    status: string;
    institutionId?: string;
    institutionName?: string;
    institutionCode?: string;
    storeId?: string;
    storeName?: string;
    walletBalance: number;
    reservedBalance: number;
    activeBorrowsCount: number;
    unreadNotificationsCount: number;
  };
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseData> => {
    return apiFetch<LoginResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  verify2Fa: async (tempToken: string, otp: string): Promise<LoginResponseData> => {
    return apiFetch<LoginResponseData>('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, otp }),
    });
  },

  register: async (payload: {
    institutionCode: string;
    institutionalId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    designation?: string;
  }): Promise<LoginResponseData> => {
    return apiFetch<LoginResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: async () => {
    return apiFetch<LoginResponseData['user']>('/auth/me');
  },

  updateProfile: async (payload: { fullName?: string; phone?: string }) => {
    return apiFetch<LoginResponseData['user']>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// ----------------------------------------------------------------------------
// Wallet API
// ----------------------------------------------------------------------------
export const walletApi = {
  getWallet: async () => {
    return apiFetch<{
      walletId: string;
      userId: string;
      currency: string;
      availableBalance: number;
      reservedBalance: number;
      bankAccounts: any[];
      transactions: any[];
    }>('/wallet');
  },

  topUp: async (amount: number, idempotencyKey?: string) => {
    return apiFetch('/wallet/top-up', {
      method: 'POST',
      body: JSON.stringify({ amount, idempotencyKey }),
    });
  },

  redeem: async (amount: number, bankAccountId: string, idempotencyKey: string) => {
    return apiFetch('/wallet/redeem', {
      method: 'POST',
      body: JSON.stringify({ amount, bankAccountId, idempotencyKey }),
    });
  },

  debit: async (payload: { amount: number; idempotencyKey?: string; referenceType?: string; referenceId?: string; description?: string }) => {
    return apiFetch<{
      walletId: string;
      userId: string;
      currency: string;
      availableBalance: number;
      reservedBalance: number;
      bankAccounts: any[];
      transactions: any[];
    }>('/wallet/debit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ----------------------------------------------------------------------------
// Catalog API
// ----------------------------------------------------------------------------
export const catalogApi = {
  getListings: async (params?: {
    query?: string;
    category?: string;
    institutionId?: string;
    storeId?: string;
    listingType?: string;
    condition?: string;
    inStockOnly?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.query) q.set('query', params.query);
    if (params?.category) q.set('category', params.category);
    if (params?.institutionId) q.set('institutionId', params.institutionId);
    if (params?.storeId) q.set('storeId', params.storeId);
    if (params?.listingType) q.set('listingType', params.listingType);
    if (params?.condition) q.set('condition', params.condition);
    if (params?.inStockOnly) q.set('inStockOnly', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/catalog/listings${qs}`);
  },

  getItems: async (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiFetch<any[]>(`/catalog/items${qs}`);
  },

  getItemDetail: async (itemId: string) => {
    return apiFetch<any>(`/catalog/items/${itemId}`);
  },

  getListingDetail: async (listingId: string) => {
    return apiFetch<any>(`/catalog/listings/${listingId}`);
  },

  getItemReviews: async (itemId: string) => {
    return apiFetch<any>(`/catalog/items/${itemId}/reviews`);
  },

  submitReview: async (itemId: string, data: { rating: number; reviewText?: string }) => {
    return apiFetch<any>(`/catalog/items/${itemId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ----------------------------------------------------------------------------
// Cart API
// ----------------------------------------------------------------------------
export const cartApi = {
  getCart: async () => {
    return apiFetch<any>('/cart');
  },
  addLine: async (payload: {
    listingId: string;
    lineType: 'PURCHASE' | 'BORROW';
    borrowDuration?: string;
    quantity?: number;
  }) => {
    return apiFetch<any>('/cart/lines', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  clearCart: async () => {
    return apiFetch<any>('/cart', {
      method: 'DELETE',
    });
  },
};

// ----------------------------------------------------------------------------
// Orders & Fulfilment API
// ----------------------------------------------------------------------------
export const ordersApi = {
  getMyOrders: async () => {
    return apiFetch<any[]>('/orders/my-orders');
  },

  checkout: async (payload: {
    cartId: string;
    items?: Array<{ bookId: string; title?: string; isbn?: string; mode: string; duration?: number; storeId?: string }>;
    fulfilmentChoices?: Array<{ storeId: string; type: string; address?: string }>;
    storeFulfilments?: Array<{ storeId: string; type: string; address?: string }>;
    paymentMethod: 'WALLET' | 'GATEWAY';
    idempotencyKey: string;
    walletAmount?: number;
  }) => {
    const resolveStoreUuid = (id?: string) => {
      if (!id) return 'b0000000-0000-0000-0000-000000000001';
      const clean = id.toLowerCase().trim();
      if (clean === 'b0000000-0000-0000-0000-000000000003' || clean.includes('allduniv') || clean.includes('uoa') || clean.includes('au')) {
        return 'b0000000-0000-0000-0000-000000000003';
      }
      if (clean === 'b0000000-0000-0000-0000-000000000002' || clean.includes('iiita') || clean.includes('iiit')) {
        return 'b0000000-0000-0000-0000-000000000002';
      }
      if (clean === 'b0000000-0000-0000-0000-000000000001' || clean.includes('mnnit')) {
        return 'b0000000-0000-0000-0000-000000000001';
      }
      return clean.length === 36 ? clean : 'b0000000-0000-0000-0000-000000000001';
    };

    const choices = payload.fulfilmentChoices || payload.storeFulfilments || [
      { storeId: 'b0000000-0000-0000-0000-000000000001', type: 'SELF_PICKUP' },
    ];
    const resolvedChoices = choices.map((c) => ({
      ...c,
      storeId: resolveStoreUuid(c.storeId),
    }));

    const resolvedItems = (payload.items || []).map((it) => ({
      ...it,
      storeId: resolveStoreUuid(it.storeId),
    }));

    return apiFetch<any>('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        items: resolvedItems,
        fulfilmentChoices: resolvedChoices,
        storeFulfilments: resolvedChoices,
        confirmRevisedTotalIfPartialUnavailable: true,
      }),
    });
  },

  cancelOrder: async (storeOrderId: string, reason?: string) => {
    return apiFetch<any>(`/orders/${storeOrderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: `IDEMP-CANCEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        reason: reason || 'Customer requested cancellation',
      }),
    });
  },
};

// ----------------------------------------------------------------------------
// Borrow & Fines API
// ----------------------------------------------------------------------------
export const borrowApi = {
  getMyBorrows: async () => {
    return apiFetch<any[]>('/borrow/my-borrows');
  },

  renewBorrow: async (borrowId: string, idempotencyKey?: string) => {
    return apiFetch<any>(`/borrow/${borrowId}/renew`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey: idempotencyKey || `RENEW-${Date.now()}` }),
    });
  },

  getMyFines: async () => {
    return apiFetch<any[]>('/borrow/my-fines');
  },

  disputeFine: async (fineId: string, reason: string) => {
    return apiFetch<any>(`/borrow/fines/${fineId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// ----------------------------------------------------------------------------
// Notifications API
// ----------------------------------------------------------------------------
export const notificationsApi = {
  getAll: async () => {
    return apiFetch<any[]>('/notifications');
  },

  markRead: async (notificationId: string) => {
    return apiFetch<any>(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  },
};

// ----------------------------------------------------------------------------
// Manager & Admin APIs
// ----------------------------------------------------------------------------
export const managerApi = {
  getOverview: async () => {
    return apiFetch<any>('/manager/overview');
  },
  getPageData: async (page: string) => {
    return apiFetch<any>(`/manager/pages/${page}`);
  },
  getOrders: async (storeId: string) => {
    return apiFetch<any[]>(`/manager/stores/${storeId}/orders`);
  },
  addItemForSale: async (payload: {
    title: string;
    author: string;
    isbnOrCode?: string;
    category: string;
    condition: string;
    salePrice: number;
    baseItemValue?: number;
    listingType?: string;
    initialStock?: number;
  }) => {
    return apiFetch<any>('/manager/items-for-sale', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteListing: async (listingId: string) => {
    return apiFetch<any>(`/manager/listings/${listingId}`, {
      method: 'DELETE',
    });
  },
  deleteCopy: async (copyId: string) => {
    return apiFetch<any>(`/manager/copies/${copyId}`, {
      method: 'DELETE',
    });
  },
  verifyHandover: async (storeOrderId: string, otpCode: string) => {
    return apiFetch<any>(`/manager/orders/${storeOrderId}/handover`, {
      method: 'POST',
      body: JSON.stringify({ otpCode }),
    });
  },
  handoverBorrow: async (borrowId: string, otpCode?: string) => {
    return apiFetch<any>(`/manager/borrows/${borrowId}/handover`, {
      method: 'POST',
      body: JSON.stringify({ otpCode: otpCode || '' }),
    });
  },
  markReadyForPickup: async (storeOrderId: string) => {
    return apiFetch<any>(`/manager/orders/${storeOrderId}/ready-for-pickup`, {
      method: 'POST',
    });
  },
  decideSellSubmission: async (submissionId: string, payload: { decision: 'ACCEPT' | 'REJECT'; reason?: string; finalValuation?: number }) => {
    return apiFetch<any>(`/manager/sell-submissions/${submissionId}/decision`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export const adminApi = {
  getOverview: async () => {
    return apiFetch<any>('/admin/overview');
  },
  getPageData: async (module: string) => {
    return apiFetch<any>(`/admin/pages/${module}`);
  },
  getAuditLogs: async () => {
    return apiFetch<any[]>('/admin/audit-logs');
  },
  addInstitution: async (payload: { name: string; code?: string; city?: string; emailDomain?: string }) => {
    return apiFetch<any>('/admin/institutions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
