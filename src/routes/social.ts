import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import type { ISocialRepository } from '../repositories/interfaces'
import type { AppEnv } from '../types'

function addDays(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function createSocialRouter(socialRepo: ISocialRepository) {
  const router = new Hono<AppEnv>()

  // GET /api/social/connections
  router.get('/connections', (c) => {
    const userId = c.get('userId')
    const connections = socialRepo.getConnections(userId)
    return c.json(connections)
  })

  // DELETE /api/social/connections/:userId
  router.delete('/connections/:userId', (c) => {
    const userId = c.get('userId')
    const targetId = parseInt(c.req.param('userId'), 10)
    if (isNaN(targetId)) return c.json({ error: 'Invalid userId' }, 400)

    const deleted = socialRepo.deleteConnection(userId, targetId)
    if (!deleted) return c.json({ error: 'Connection not found' }, 404)
    return c.json({ ok: true })
  })

  // POST /api/social/invite-codes
  router.post('/invite-codes', (c) => {
    const userId = c.get('userId')
    const code = randomUUID()
    const expiresAt = addDays(new Date(), 7)
    const inviteCode = socialRepo.createInviteCode(userId, code, expiresAt)
    return c.json(inviteCode, 201)
  })

  // GET /api/social/invite-codes
  router.get('/invite-codes', (c) => {
    const userId = c.get('userId')
    const codes = socialRepo.listInviteCodes(userId)
    const now = new Date().toISOString()
    const codesWithStatus = codes.map(code => ({
      ...code,
      status: code.usedAt ? 'used' : code.expiresAt < now ? 'expired' : 'active',
    }))
    return c.json(codesWithStatus)
  })

  // DELETE /api/social/invite-codes/:id
  router.delete('/invite-codes/:id', (c) => {
    const userId = c.get('userId')
    const codeId = parseInt(c.req.param('id'), 10)
    if (isNaN(codeId)) return c.json({ error: 'Invalid id' }, 400)

    const code = socialRepo.getInviteCodeByToken('') // need to look up by id
    // Get code by id via list then filter (no separate method needed)
    const codes = socialRepo.listInviteCodes(userId)
    const found = codes.find(c => c.id === codeId)

    if (!found) return c.json({ error: 'Not found' }, 404)
    if (found.createdByUserId !== userId) return c.json({ error: 'Not found' }, 404)
    if (found.usedAt) return c.json({ error: 'Cannot delete a used code' }, 400)

    socialRepo.deleteInviteCode(codeId)
    return c.json({ ok: true })
  })

  // POST /api/social/connect — redeem an invite code
  router.post(
    '/connect',
    zValidator('json', z.object({ code: z.string().min(1) })),
    (c) => {
      const userId = c.get('userId')
      const { code } = c.req.valid('json')

      const inviteCode = socialRepo.getInviteCodeByToken(code)
      if (!inviteCode) return c.json({ error: 'Invalid code' }, 400)
      if (inviteCode.createdByUserId === userId) return c.json({ error: 'Cannot redeem your own code' }, 400)
      if (inviteCode.usedAt) return c.json({ error: 'Code already used' }, 400)
      if (inviteCode.expiresAt < new Date().toISOString()) return c.json({ error: 'Code expired' }, 400)

      const now = new Date().toISOString()
      socialRepo.markCodeUsed(inviteCode.id, userId, now)
      socialRepo.createConnection(inviteCode.createdByUserId, userId)
      return c.json({ ok: true })
    }
  )

  // POST /api/social/connection-requests
  router.post(
    '/connection-requests',
    zValidator('json', z.object({ toUserId: z.number().int().positive() })),
    (c) => {
      const userId = c.get('userId')
      const { toUserId } = c.req.valid('json')

      if (!socialRepo.shareAGroup(userId, toUserId)) {
        return c.json({ error: 'No shared group with this user' }, 403)
      }

      if (socialRepo.isConnected(userId, toUserId)) {
        return c.json({ error: 'Already connected' }, 409)
      }

      const active = socialRepo.getActiveRequest(userId, toUserId)
      if (active) return c.json({ error: 'Request already pending' }, 409)

      socialRepo.pruneStaleRequests(userId, toUserId)

      const expiresAt = addDays(new Date(), 7)
      const request = socialRepo.createRequest(userId, toUserId, expiresAt)
      return c.json(request, 201)
    }
  )

  // GET /api/social/connection-requests/pending
  router.get('/connection-requests/pending', (c) => {
    const userId = c.get('userId')
    return c.json(socialRepo.getPendingIncoming(userId))
  })

  // GET /api/social/connection-requests/sent
  router.get('/connection-requests/sent', (c) => {
    const userId = c.get('userId')
    return c.json(socialRepo.getSentRequests(userId))
  })

  // PUT /api/social/connection-requests/:id
  router.put(
    '/connection-requests/:id',
    zValidator('json', z.object({ action: z.enum(['accept', 'decline']) })),
    (c) => {
      const userId = c.get('userId')
      const requestId = parseInt(c.req.param('id'), 10)
      if (isNaN(requestId)) return c.json({ error: 'Invalid id' }, 400)

      const { action } = c.req.valid('json')
      const now = new Date().toISOString()

      // Fetch the request to validate ownership
      const pending = socialRepo.getPendingIncoming(userId)
      const request = pending.find(r => r.id === requestId)
      if (!request) return c.json({ error: 'Request not found or not yours' }, 403)

      const status = action === 'accept' ? 'accepted' : 'declined'
      socialRepo.respondToRequest(requestId, status, now)

      if (action === 'accept') {
        socialRepo.createConnection(request.fromUserId, userId)
      }

      return c.json({ ok: true })
    }
  )

  // GET /api/social/groups
  router.get('/groups', (c) => {
    const userId = c.get('userId')
    return c.json(socialRepo.listGroupsForUser(userId))
  })

  // POST /api/social/groups
  router.post(
    '/groups',
    zValidator('json', z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      memberUserIds: z.array(z.number().int().positive()).default([]),
    })),
    (c) => {
      const userId = c.get('userId')
      const { name, description, memberUserIds } = c.req.valid('json')

      for (const memberId of memberUserIds) {
        if (!socialRepo.isConnected(userId, memberId)) {
          return c.json({ error: `User ${memberId} is not connected to you` }, 400)
        }
      }

      const group = socialRepo.createGroup(name, description ?? null, userId)
      socialRepo.addMember(group.id, userId)
      for (const memberId of memberUserIds) {
        socialRepo.addMember(group.id, memberId)
      }

      const members = socialRepo.getMembersWithConnectionStatus(group.id, userId)
      return c.json({ ...group, members }, 201)
    }
  )

  // GET /api/social/groups/:id
  router.get('/groups/:id', (c) => {
    const userId = c.get('userId')
    const groupId = parseInt(c.req.param('id'), 10)
    if (isNaN(groupId)) return c.json({ error: 'Invalid id' }, 400)

    if (!socialRepo.isMember(groupId, userId)) return c.json({ error: 'Forbidden' }, 403)

    const group = socialRepo.getGroup(groupId)
    if (!group) return c.json({ error: 'Not found' }, 404)

    const members = socialRepo.getMembersWithConnectionStatus(groupId, userId)
    return c.json({ ...group, members })
  })

  // PUT /api/social/groups/:id
  router.put(
    '/groups/:id',
    zValidator('json', z.object({
      name: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
    })),
    (c) => {
      const userId = c.get('userId')
      const groupId = parseInt(c.req.param('id'), 10)
      if (isNaN(groupId)) return c.json({ error: 'Invalid id' }, 400)

      if (!socialRepo.isMember(groupId, userId)) return c.json({ error: 'Forbidden' }, 403)

      const data = c.req.valid('json')
      const group = socialRepo.updateGroup(groupId, data)
      if (!group) return c.json({ error: 'Not found' }, 404)
      return c.json(group)
    }
  )

  // DELETE /api/social/groups/:id
  router.delete('/groups/:id', (c) => {
    const userId = c.get('userId')
    const groupId = parseInt(c.req.param('id'), 10)
    if (isNaN(groupId)) return c.json({ error: 'Invalid id' }, 400)

    if (!socialRepo.isMember(groupId, userId)) return c.json({ error: 'Forbidden' }, 403)

    socialRepo.deleteGroup(groupId)
    return c.json({ ok: true })
  })

  // POST /api/social/groups/:id/members
  router.post(
    '/groups/:id/members',
    zValidator('json', z.object({ userId: z.number().int().positive() })),
    (c) => {
      const requesterId = c.get('userId')
      const groupId = parseInt(c.req.param('id'), 10)
      if (isNaN(groupId)) return c.json({ error: 'Invalid id' }, 400)

      if (!socialRepo.isMember(groupId, requesterId)) return c.json({ error: 'Forbidden' }, 403)

      const { userId: newMemberId } = c.req.valid('json')

      if (!socialRepo.isConnected(requesterId, newMemberId)) {
        return c.json({ error: 'You must be connected to add this user' }, 403)
      }

      socialRepo.addMember(groupId, newMemberId)
      return c.json({ ok: true }, 201)
    }
  )

  // DELETE /api/social/groups/:id/members/:userId
  router.delete('/groups/:id/members/:userId', (c) => {
    const requesterId = c.get('userId')
    const groupId = parseInt(c.req.param('id'), 10)
    const targetId = parseInt(c.req.param('userId'), 10)
    if (isNaN(groupId) || isNaN(targetId)) return c.json({ error: 'Invalid id' }, 400)

    if (!socialRepo.isMember(groupId, requesterId)) return c.json({ error: 'Forbidden' }, 403)

    socialRepo.removeMember(groupId, targetId)
    const remaining = socialRepo.getMembersWithConnectionStatus(groupId, requesterId)
    if (remaining.length === 0) socialRepo.deleteGroup(groupId)
    return c.json({ ok: true })
  })

  // GET /api/social/users/connectable
  router.get('/users/connectable', (c) => {
    const userId = c.get('userId')
    return c.json(socialRepo.getConnectableUsers(userId))
  })

  // GET /api/social/users/visible — group co-members not yet connected
  router.get('/users/visible', (c) => {
    const userId = c.get('userId')
    return c.json(socialRepo.getVisibleCoMembers(userId))
  })

  return router
}
