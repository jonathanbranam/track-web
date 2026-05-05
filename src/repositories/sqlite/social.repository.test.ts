import { describe, it, expect } from 'vitest'
import { setupTestDb } from '../../test-utils/db'

describe('SqliteSocialRepository', () => {
  describe('normalizeIds / isConnected', () => {
    it('isConnected returns false when no connection exists', () => {
      const { socialRepo } = setupTestDb()
      expect(socialRepo.isConnected(1, 2)).toBe(false)
    })

    it('createConnection then isConnected returns true regardless of argument order', () => {
      const { userRepo, socialRepo } = setupTestDb()
      userRepo.upsert('a@test.com', 'hash')
      userRepo.upsert('b@test.com', 'hash')
      const a = userRepo.findByEmail('a@test.com')!
      const b = userRepo.findByEmail('b@test.com')!

      socialRepo.createConnection(a.id, b.id)

      expect(socialRepo.isConnected(a.id, b.id)).toBe(true)
      expect(socialRepo.isConnected(b.id, a.id)).toBe(true)
    })

    it('deleteConnection removes the connection', () => {
      const { userRepo, socialRepo } = setupTestDb()
      userRepo.upsert('a@test.com', 'hash')
      userRepo.upsert('b@test.com', 'hash')
      const a = userRepo.findByEmail('a@test.com')!
      const b = userRepo.findByEmail('b@test.com')!

      socialRepo.createConnection(a.id, b.id)
      expect(socialRepo.isConnected(a.id, b.id)).toBe(true)

      const deleted = socialRepo.deleteConnection(b.id, a.id)
      expect(deleted).toBe(true)
      expect(socialRepo.isConnected(a.id, b.id)).toBe(false)
    })

    it('deleteConnection returns false when connection does not exist', () => {
      const { socialRepo } = setupTestDb()
      expect(socialRepo.deleteConnection(1, 2)).toBe(false)
    })
  })
})
