import { useEffect, useState, useCallback } from 'react'
import { socialApi, type Connection, type ConnectionRequest, type SocialUser } from './api'

export function PeopleTab() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<ConnectionRequest[]>([])
  const [coMembers, setCoMembers] = useState<SocialUser[]>([])
  const [sentIds, setSentIds] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    const [conns, reqs, visible] = await Promise.all([
      socialApi.getConnections(),
      socialApi.getPendingRequests(),
      socialApi.getConnectableUsers(), // visible co-members endpoint not yet wired; using getConnectableUsers as placeholder
    ])
    setConnections(conns)
    setPending(reqs)
    // Co-members are group members not yet connected — fetched separately
    const coM = await fetchVisibleCoMembers()
    setCoMembers(coM)
  }, [])

  useEffect(() => { load() }, [load])

  async function fetchVisibleCoMembers(): Promise<SocialUser[]> {
    try {
      const res = await fetch('/api/social/users/visible', { credentials: 'include' })
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  async function respond(id: number, action: 'accept' | 'decline') {
    await socialApi.respondToRequest(id, action)
    await load()
  }

  async function revoke(userId: number) {
    await socialApi.deleteConnection(userId)
    await load()
  }

  async function requestConnection(userId: number) {
    await socialApi.sendConnectionRequest(userId)
    setSentIds(prev => new Set([...prev, userId]))
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Incoming Requests
          </h3>
          <ul className="space-y-2">
            {pending.map(req => (
              <li key={req.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                <span className="text-sm">{req.user.displayName}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(req.id, 'accept')}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respond(req.id, 'decline')}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Connections
        </h3>
        {connections.length === 0 ? (
          <p className="text-sm text-gray-500">No connections yet</p>
        ) : (
          <ul className="space-y-2">
            {connections.map(conn => (
              <li key={conn.user.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
                <span className="text-sm">{conn.user.displayName}</span>
                <button
                  onClick={() => revoke(conn.user.id)}
                  className="px-2 py-1 bg-red-700 hover:bg-red-800 text-white text-xs rounded"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {coMembers.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Group Co-members
          </h3>
          <ul className="space-y-2">
            {coMembers.map(user => (
              <li key={user.id} className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded px-3 py-2 opacity-80">
                <span className="text-sm text-gray-400">{user.displayName}</span>
                {sentIds.has(user.id) ? (
                  <span className="text-xs text-gray-500">Request Sent</span>
                ) : (
                  <button
                    onClick={() => requestConnection(user.id)}
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    Request Connection
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
