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
  resendVerification: (email: string) =>
    apiFetch('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  activateStaff: (token: string, password: string) =>
    apiFetch<{ message: string; token: string; user: any }>('/api/auth/activate-staff', { method: 'POST', body: JSON.stringify({ token, password }) }),
  updateTargeting: (body: { ageRange?: string; gender?: string; interests?: string[]; incomeLevel?: string }) =>
    apiFetch<{ user: any }>('/api/auth/targeting', { method: 'PATCH', body: JSON.stringify(body) }),
  skipTargeting: () => apiFetch<{ ok: boolean }>('/api/auth/targeting/skip', { method: 'POST' }),
}

export const team = {
  list: () => apiFetch<{ owner: any; members: any[]; pendingInvites: any[] }>('/api/team'),
  invite: (email: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') =>
    apiFetch<{ status: 'added' | 'invited'; member?: any; invite?: any }>('/api/team', { method: 'POST', body: JSON.stringify({ email, role }) }),
  updateRole: (memberId: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') =>
    apiFetch<{ member: any }>(`/api/team/${memberId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  remove: (memberId: string) => apiFetch<{ ok: boolean }>(`/api/team/${memberId}`, { method: 'DELETE' }),
  cancelInvite: (inviteId: string) => apiFetch<{ ok: boolean }>(`/api/team/invites/${inviteId}`, { method: 'DELETE' }),
}

export const branches = {
  list: (companyId: string) => apiFetch<{ branches: any[] }>(`/api/companies/${companyId}/branches`),
  create: (companyId: string, body: { name: string; address: string; city: string; phone?: string }) =>
    apiFetch<{ branch: any }>(`/api/companies/${companyId}/branches`, { method: 'POST', body: JSON.stringify(body) }),
  update: (companyId: string, branchId: string, body: { name?: string; address?: string; city?: string; phone?: string }) =>
    apiFetch<{ branch: any }>(`/api/companies/${companyId}/branches/${branchId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (companyId: string, branchId: string) =>
    apiFetch<{ ok: boolean }>(`/api/companies/${companyId}/branches/${branchId}`, { method: 'DELETE' }),
}

export const webhookSubscriptions = {
  list: () => apiFetch<{ webhooks: any[] }>('/api/webhook-subscriptions'),
  create: (url: string, events: string[]) =>
    apiFetch<{ webhook: any; secret: string; warning: string }>('/api/webhook-subscriptions', { method: 'POST', body: JSON.stringify({ url, events }) }),
  toggle: (id: string, isActive: boolean) =>
    apiFetch<{ webhook: any }>(`/api/webhook-subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  remove: (id: string) => apiFetch<{ ok: boolean }>(`/api/webhook-subscriptions/${id}`, { method: 'DELETE' }),
}

export const dataExport = {
  download: async (type: 'reviews' | 'leads'): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tratto_token') : null
    const res = await fetch(`${API_URL}/api/export?type=${type}&format=csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Error al exportar')
    }
    return res.blob()
  },
}

export const apiKeys = {
  get: () => apiFetch<{ apiKey: any | null }>('/api/api-keys'),
  generate: () => apiFetch<{ key: string; warning: string }>('/api/api-keys', { method: 'POST', body: JSON.stringify({}) }),
  revoke: () => apiFetch<{ ok: boolean; message: string }>('/api/api-keys', { method: 'DELETE' }),
}

export const companies = {
  list: (params: Record<string, string> = {}) => apiFetch<{ companies: any[]; pagination: any }>(`/api/companies?${new URLSearchParams(params).toString()}`),
  get: (slug: string) => apiFetch<{ company: any; ads: any[] }>(`/api/companies/${slug}`),
  create: (body: any) => apiFetch<{ company: any; token?: string }>('/api/companies', { method: 'POST', body: JSON.stringify(body) }),
  claim: (id: string, body: any) => apiFetch<{ company: any; token?: string; message?: string }>(`/api/companies/${id}/claim`, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch<{ company: any }>(`/api/companies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  stats: (id: string) => apiFetch<any>(`/api/companies/${id}/stats`),
  revealContact: (id: string) => apiFetch<{ phone: string | null; website: string | null; address: string | null }>(`/api/companies/${id}/contact-reveal`, { method: 'POST', body: JSON.stringify({}) }),
  disputeClaim: (id: string, body: { reason: string; evidenceDocUrl?: string }) => apiFetch<{ message: string }>(`/api/companies/${id}/dispute-claim`, { method: 'POST', body: JSON.stringify(body) }),
  competitiveIntel: (id: string) => apiFetch<any>(`/api/companies/${id}/competitive-intel`),
  contactReveals: (id: string) => apiFetch<{ reveals: any[] }>(`/api/companies/${id}/contact-reveals`),
  downloadCertificate: async (id: string): Promise<Blob> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('tratto_token') : null
    const res = await fetch(`${API_URL}/api/companies/${id}/certificate`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Error al descargar el certificado')
    }
    return res.blob()
  },
}

export const reviews = {
  list: (companyId: string, params: Record<string, string> = {}) => apiFetch<{ reviews: any[]; pagination: any }>(`/api/reviews?${new URLSearchParams({ companyId, ...params }).toString()}`),
  create: (body: any) => apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify(body) }),
  respond: (reviewId: string, body: string) => apiFetch(`/api/reviews/${reviewId}/response`, { method: 'POST', body: JSON.stringify({ body }) }),
  helpful: (reviewId: string) => apiFetch(`/api/reviews/${reviewId}/helpful`, { method: 'POST' }),
  report: (reviewId: string, reason: string) => apiFetch(`/api/reviews/${reviewId}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),
}

export const categories = { list: (includeHidden?: boolean) => apiFetch<{ categories: any[] }>(`/api/categories${includeHidden ? '?includeHidden=true' : ''}`) }

export const leads = {
  create: (body: any) => apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(body) }),
  my: () => apiFetch<{ leads: any[] }>('/api/leads/my'),
  respond: (id: string) => apiFetch<{ lead: any }>(`/api/leads/${id}/respond`, { method: 'PATCH' }),
}

export const medals = { get: (companyId: string) => apiFetch<{ medals: any[] }>(`/api/medals/${companyId}`) }
export const ai = { generateSummary: (companyId: string) => apiFetch<{ message: string }>(`/api/ai/summary/${companyId}`, { method: 'POST', body: JSON.stringify({}) }) }

export const ads = {
  feed: (params: { categoryId?: string; country?: string } = {}) => apiFetch<{ ads: any[] }>(`/api/ads/feed?${new URLSearchParams(params as any).toString()}`),
  click: (adId: string, channel: 'whatsapp' | 'phone' | 'email' | 'website' | 'instagram' | 'facebook' = 'whatsapp') =>
    apiFetch<{ success: boolean; redirectUrl?: string }>(`/api/ads/${adId}/click`, { method: 'POST', body: JSON.stringify({ channel }) }),
  trackDetailView: (adId: string) => apiFetch(`/api/ads/${adId}/detail-view`, { method: 'POST' }).catch(() => {}),
  myStats: (period: '7d' | '30d' | 'all' | 'custom', from?: string, to?: string) => {
    const params = new URLSearchParams({ period })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return apiFetch<{ from: string | null; to: string | null; totals: any; byAd: any[] }>(`/api/ads/my/stats?${params.toString()}`)
  },
  my: () => apiFetch<{ account: any; ads: any[] }>('/api/ads/my'),
  create: (body: any) => apiFetch('/api/ads', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch<{ ad: any; message: string }>(`/api/ads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggleStatus: (id: string) => apiFetch<{ ad: any }>(`/api/ads/${id}/toggle-status`, { method: 'PATCH' }),
}

export const subscriptions = {
  my: () => apiFetch<{ subscription: any }>('/api/subscriptions/my'),
  checkout: (plan: 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE', provider: 'STRIPE' | 'DLOCALGO') =>
    apiFetch<{ checkoutUrl: string }>('/api/payments/checkout', { method: 'POST', body: JSON.stringify({ plan, provider }) }),
  cancel: () => apiFetch('/api/payments/cancel', { method: 'POST' }),
  rechargeAds: (amountUsd: number, provider: 'STRIPE' | 'DLOCALGO') =>
    apiFetch<{ checkoutUrl: string }>('/api/payments/ads/recharge', { method: 'POST', body: JSON.stringify({ amountUsd, provider }) }),
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
  adImage: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/ad-image`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) throw new Error('Error subiendo la imagen del anuncio')
    return res.json()
  },
  companyPhoto: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/company-photo`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Error subiendo la foto') }
    return res.json()
  },
  deleteCompanyPhoto: async (url: string): Promise<void> => {
    const token = localStorage.getItem('tratto_token')
    const res = await fetch(`${API_URL}/api/upload/company-photo`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ url }) })
    if (!res.ok) throw new Error('Error borrando la foto')
  },
  reviewPhoto: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/review-photo`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) throw new Error('Error subiendo la foto')
    return res.json()
  },
  verificationDoc: async (file: File): Promise<{ url: string }> => {
    const token = localStorage.getItem('tratto_token')
    const form = new FormData(); form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload/verification-doc`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Error subiendo el documento') }
    return res.json()
  },
}

export const admin = {
  dashboard: () => apiFetch<any>('/api/admin/dashboard'),
  pendingCounts: () => apiFetch<{ pendingReviews: number; reportedReviews: number; pendingAds: number; pendingDisputes: number; pendingCategorySuggestions: number; total: number }>('/api/admin/pending-counts'),
  reviews: (params?: any) => apiFetch<any>(`/api/admin/reviews?${new URLSearchParams(params).toString()}`),
  companies: (params?: any) => apiFetch<any>(`/api/admin/companies?${new URLSearchParams(params).toString()}`),
  revenue: () => apiFetch<any>('/api/admin/revenue'),
  moderateReview: (id: string, status: 'APPROVED' | 'REJECTED', note?: string) => apiFetch(`/api/reviews/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  verifyCompany: (id: string, verified: boolean) => apiFetch(`/api/admin/companies/${id}/verify`, { method: 'PATCH', body: JSON.stringify({ verified }) }),
  suspendCompany: (id: string) => apiFetch(`/api/admin/companies/${id}/suspend`, { method: 'PATCH' }),
  moderateAd: (id: string, status: 'ACTIVE' | 'REJECTED', note?: string) => apiFetch(`/api/ads/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status, note }) }),
  pendingAds: () => apiFetch<{ ads: any[] }>('/api/ads/pending'),
  claimDisputes: (status?: string) => apiFetch<{ disputes: any[] }>(`/api/admin/claim-disputes${status ? `?status=${status}` : ''}`),
  resolveClaimDispute: (id: string, action: 'approve' | 'reject', note?: string) => apiFetch(`/api/admin/claim-disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action, note }) }),
  categorySuggestions: (status?: string) => apiFetch<{ suggestions: any[] }>(`/api/admin/category-suggestions${status ? `?status=${status}` : ''}`),
  resolveCategorySuggestion: (id: string, action: 'approve' | 'reject', categoryId?: string, emoji?: string) => apiFetch(`/api/admin/category-suggestions/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action, categoryId, emoji }) }),
  categories: () => apiFetch<{ categories: any[] }>('/api/admin/categories'),
  createCategory: (body: { name: string; emoji: string; phase: number; isHidden: boolean; priority?: boolean }) =>
    apiFetch<{ category: any }>('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: { emoji?: string; isHidden?: boolean; phase?: number; priority?: boolean }) =>
    apiFetch<{ category: any }>(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  staff: () => apiFetch<{ staff: any[] }>('/api/admin/staff'),
  inviteStaff: (body: { name: string; email: string; role: 'ADMIN' | 'COLLABORATOR'; country: string; phone?: string }) =>
    apiFetch<{ user: any; message: string }>(`/api/admin/staff`, { method: 'POST', body: JSON.stringify(body) }),
  resendStaffInvite: (id: string) => apiFetch<{ message: string }>(`/api/admin/staff/${id}/resend-invite`, { method: 'POST' }),
  updateStaffRole: (id: string, role: 'ADMIN' | 'COLLABORATOR') => apiFetch(`/api/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeStaff: (id: string) => apiFetch(`/api/admin/staff/${id}`, { method: 'DELETE' }),
}
