async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw { status: res.status, ...body }
  return body as T
}

export interface SocialUser {
  id: number
  email: string
  displayName: string
}

export interface Connection {
  user: SocialUser
  connectedAt: string
}

export interface InviteCode {
  id: number
  code: string
  createdByUserId: number
  createdAt: string
  expiresAt: string
  usedByUserId: number | null
  usedAt: string | null
  status: 'active' | 'used' | 'expired'
}

export interface ConnectionRequest {
  id: number
  fromUserId: number
  toUserId: number
  status: string
  createdAt: string
  expiresAt: string
  user: SocialUser
}

export interface Group {
  id: number
  name: string
  description: string | null
  createdByUserId: number
  createdAt: string
}

export interface GroupMember {
  id: number
  email: string
  displayName: string
  connected: boolean
}

export interface GroupDetail extends Group {
  members: GroupMember[]
}

export const socialApi = {
  getConnections: () => fetchApi<Connection[]>('/api/social/connections'),
  deleteConnection: (userId: number) =>
    fetchApi<{ ok: boolean }>(`/api/social/connections/${userId}`, { method: 'DELETE' }),

  createInviteCode: () => fetchApi<InviteCode>('/api/social/invite-codes', { method: 'POST' }),
  listInviteCodes: () => fetchApi<InviteCode[]>('/api/social/invite-codes'),
  deleteInviteCode: (id: number) =>
    fetchApi<{ ok: boolean }>(`/api/social/invite-codes/${id}`, { method: 'DELETE' }),

  redeemCode: (code: string) =>
    fetchApi<{ ok: boolean }>('/api/social/connect', { method: 'POST', body: JSON.stringify({ code }) }),

  getPendingRequests: () => fetchApi<ConnectionRequest[]>('/api/social/connection-requests/pending'),
  getSentRequests: () => fetchApi<ConnectionRequest[]>('/api/social/connection-requests/sent'),
  sendConnectionRequest: (toUserId: number) =>
    fetchApi<ConnectionRequest>('/api/social/connection-requests', {
      method: 'POST',
      body: JSON.stringify({ toUserId }),
    }),
  respondToRequest: (id: number, action: 'accept' | 'decline') =>
    fetchApi<{ ok: boolean }>(`/api/social/connection-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    }),

  getGroups: () => fetchApi<Group[]>('/api/social/groups'),
  createGroup: (data: { name: string; description?: string; memberUserIds: number[] }) =>
    fetchApi<GroupDetail>('/api/social/groups', { method: 'POST', body: JSON.stringify(data) }),
  getGroup: (id: number) => fetchApi<GroupDetail>(`/api/social/groups/${id}`),
  updateGroup: (id: number, data: { name?: string; description?: string | null }) =>
    fetchApi<Group>(`/api/social/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id: number) =>
    fetchApi<{ ok: boolean }>(`/api/social/groups/${id}`, { method: 'DELETE' }),
  addMember: (groupId: number, userId: number) =>
    fetchApi<{ ok: boolean }>(`/api/social/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  removeMember: (groupId: number, userId: number) =>
    fetchApi<{ ok: boolean }>(`/api/social/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),

  getConnectableUsers: () => fetchApi<SocialUser[]>('/api/social/users/connectable'),
  getVisibleCoMembers: () => fetchApi<SocialUser[]>('/api/social/users/visible'),
}
