const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('tratto_token') : null
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud')
  return data
}

export const auth = {
  register: (body: { email: string; password: string; name: string; country: string; role?: string }) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    apiFetch<{ user: any; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<{ user: any }>('/api/auth/me'),
  updateProfile: (body: { name?: string; phone?: string; city?: string; country?: string }) =>
    apiFetch<{ user: any }>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
}

export const companies = {
  list: (params: Record<string, string> = {}) => apiFetch<{ companies: any[]; pagination: any }>(`/api/companies?${new URLSearchParams(params).toString()}`),
  get: (slug: string) => apiFetch<{ company: any; ads: any[] }>(`/api/companies/${slug}`),
  create: (body: any) => apiFetch<{ company: any }>('/api/companies', { method: 'POST', body: JSON.stringify(body) }),
  claim: (id: string, body: any) => apiFetch(`/api/companies/${id}/claim`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch<{ company: any }>(`/api/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  stats: (id: string) => apiFetch<any>(`/api/companies/${id}/stats`),
}

export const reviews = {
  list: (companyId: string, params: Record<string, string> = {}) => apiFetch<{ reviews: any[]; pagination: any }>(`/api/reviews?${new URLSearchParams({ companyId, ...params }).toString()}`),
  create: (body: any) => apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify(body) }),
  respond: (reviewId: string, body: string) => apiFetch(`/api/reviews/${reviewId}/response`, { method: 'POST', body: JSON.stringify({ body }) }),
  helpful: (reviewId: string) => apiFetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' }),
  report: (reviewId: string, reason: string) => apiFetch(`/api/reviews/${reviewId}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),
}

export const categories = { list: () => apiFetch<{ categories: any[] }>('/api/categories') }

export const leads = {
  create: (body: any) => apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
  my: () => apiFetch<{ leads: any[] }>('/api/leads/my'),
}

export const medals = { get: (companyId: string) => apiFetch<{ medals: any[] }>(`/api/medals/${companyId}`) }

export const ads = {
  feed: (params: { categoryId?: string; country?: string } = {}) => apiFetch<{ ads: any[] }>(`/api/ads/feed?${new URLSearchParams(params as any).toString()}`),
  click: (adId: string) => apiFetch(`/api/ads/${adId}/click`, { method: 'POST' }),
  my: () => apiFetch<{ account: any; ads: any[] }>('/api/ads/my'),
  create: (body: any) => apiFetch('/api/ads', { method: 'POST', body: JSON.stringify(body) }),
}

export const subscriptions = {
  my: () => apiFetch<{ subscription: any }>('/api/subscriptions/my'),
  checkout: (plan: 'PROFESSIONAL' | 'PREMIUM', provider: 'STRIPE' | 'DLOCALGO') =>
    apiFetch<{ checkoutUrl: string }>('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ plan, provider }) }),
  cancel: () => apiFetch('/api/payments/cancel', { method: 'POST' }),
}

export const upload = {
  proof: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/proof`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) throw new Error('Error subiendo archivo')
    return res.json()
  },
  companyLogo: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/company-logo`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) throw new Error('Error subiendo logo')
    return res.json()
  },
  avatar: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/avatar`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) throw new Error('Error subiendo foto de perfil')
    return res.json()
  },
}

export const admin = {
  dashboard: () => apiFetch<any>('/api/admin/dashboard'),
  reviews: (params?: any) => apiFetch<any>(`/api/admin/reviews?${new URLSearchParams(params).toString()}`),
  companies: (params?: any) => apiFetch<any>(`/api/admin/companies?${new URLSearchParams(params).toString()}`),
  revenue: () => apiFetch<any>('/api/admin/revenue'),
  moderateReview: (id: string, status: 'APPROVED' | 'REJECTED', note?: string) => apiFetch(`/api/reviews/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  verifyCompany: (id: string, verified: boolean) => apiFetch(`/api/admin/companies/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified }) }),
  moderateAd: (id: string, status: 'ACTIVE' | 'REJECTED', note?: string) => apiFetch(`/api/ads/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
}
