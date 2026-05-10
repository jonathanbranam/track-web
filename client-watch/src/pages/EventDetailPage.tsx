import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@repo/auth'
import { Badge, Button, InviteePicker, LoadingSpinner } from '@repo/ui'
import { api, type WatchEventDetail, type WatchEventCandidate, type Movie, type TvSeries, type CastPreview as CastPreviewData } from '../api'
import { CastPreview } from '../components/CastPreview'
import { BackLink } from '@repo/ui'

const VOTE_LABELS: Record<number, string> = { '-2': '--', '-1': '-', '0': '0', '1': '+', '2': '++' }

const VOTE_COLORS: Record<number, { selected: string; unselected: string }> = {
  '-2': { selected: 'bg-red-600 text-white', unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600' },
  '-1': { selected: 'bg-orange-500 text-white', unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600' },
  '0':  { selected: 'bg-gray-500 text-white', unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600' },
  '1':  { selected: 'bg-lime-600 text-white', unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600' },
  '2':  { selected: 'bg-green-700 text-white', unselected: 'bg-gray-700 text-gray-300 hover:bg-gray-600' },
}

type SearchResult =
  | { kind: 'movie'; id: number; title: string; releaseYear?: number | null }
  | { kind: 'tv'; id: number; title: string; releaseYear?: number | null }

function VoteButtons({ candidateId, eventId, currentVote, onVote }: {
  candidateId: number
  eventId: number
  currentVote: number | undefined
  onVote: (vote: number) => void
}) {
  const values = [-2, -1, 0, 1, 2]
  return (
    <div className="flex gap-1">
      {values.map(v => {
        const colors = VOTE_COLORS[v]
        return (
          <button
            key={v}
            onClick={() => onVote(v)}
            className={`flex-1 min-h-[40px] text-xs rounded-lg transition-colors ${
              currentVote === v ? colors.selected : colors.unselected
            }`}
          >
            {VOTE_LABELS[v]}
          </button>
        )
      })}
    </div>
  )
}

type Invitee = { type: 'user'; userId: number } | { type: 'group'; groupId: number }

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<WatchEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Nominate UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [pickedCandidate, setPickedCandidate] = useState<{ movieId?: number; seriesId?: number; itemType: 'movie' | 'tv'; title: string; releaseYear?: number | null } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selection UI state
  const [selectionCandidateId, setSelectionCandidateId] = useState('')
  const [episodeMode] = useState<'latest' | 'specific'>('latest')

  // Expand candidate state
  const [expandedCandidateId, setExpandedCandidateId] = useState<number | null>(null)
  const [loadingCandidateId, setLoadingCandidateId] = useState<number | null>(null)
  const [detailCache, setDetailCache] = useState<Record<number, (Movie & CastPreviewData) | (TvSeries & CastPreviewData)>>({})
  const [showFullCastId, setShowFullCastId] = useState<number | null>(null)

  // Remove candidate confirmation state
  const [confirmingRemove, setConfirmingRemove] = useState<number | null>(null)

  // Remove invitee confirmation state
  const [confirmingRemoveInvitee, setConfirmingRemoveInvitee] = useState<number | null>(null)

  // Delete event confirmation state
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Inline title editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Inline date editing state
  const [editingDate, setEditingDate] = useState(false)
  const [dateDraft, setDateDraft] = useState('')

  // Invite management UI state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedInvitees, setSelectedInvitees] = useState<Invitee[]>([])
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  const eventId = parseInt(id ?? '0', 10)

  async function load() {
    try {
      const d = await api.events.get(eventId)
      setDetail(d)
    } catch {
      setError('Failed to load event')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventId])

  // Debounced parallel search for movies and TV series
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const [movies, tvSeries] = await Promise.all([
        api.movies.list({ q: searchQuery }).catch(() => [] as Movie[]),
        api.tv.list({ q: searchQuery }).catch(() => [] as TvSeries[]),
      ])
      const nominatedMovieIds = new Set(detail?.candidates.map(c => c.movieId).filter((id): id is number => id !== null))
      const nominatedSeriesIds = new Set(detail?.candidates.map(c => c.seriesId).filter((id): id is number => id !== null))
      const results: SearchResult[] = [
        ...movies.map(m => ({ kind: 'movie' as const, id: m.id, title: m.title, releaseYear: m.releaseYear })),
        ...tvSeries.map(s => ({ kind: 'tv' as const, id: s.id, title: s.title, releaseYear: s.releaseYear })),
      ].filter(r => r.kind === 'movie' ? !nominatedMovieIds.has(r.id) : !nominatedSeriesIds.has(r.id))
      setSearchResults(results)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  async function handleRsvp(inviteeUserId: number, attendance: 'yes' | 'no' | 'maybe') {
    await api.events.rsvp(eventId, attendance, inviteeUserId)
    load()
  }

  async function handleAddCandidate(e: React.FormEvent) {
    e.preventDefault()
    if (!pickedCandidate) return
    try {
      await api.events.addCandidate(eventId, {
        movieId: pickedCandidate.movieId,
        seriesId: pickedCandidate.seriesId,
      })
      setPickedCandidate(null)
      setSearchQuery('')
      setSearchResults([])
      load()
    } catch {}
  }

  async function handleVote(candidateId: number, vote: number) {
    await api.events.vote(eventId, candidateId, vote)
    load()
  }

  async function handleCandidateToggle(c: WatchEventCandidate) {
    if (expandedCandidateId === c.id) {
      setExpandedCandidateId(null)
      setShowFullCastId(null)
      return
    }
    setExpandedCandidateId(c.id)
    setShowFullCastId(null)
    if (detailCache[c.id]) return
    setLoadingCandidateId(c.id)
    try {
      const detail = c.itemType === 'movie'
        ? await api.movies.get(c.movieId!)
        : await api.tv.get(c.seriesId!)
      setDetailCache(prev => ({ ...prev, [c.id]: detail }))
    } finally {
      setLoadingCandidateId(null)
    }
  }

  async function handleSetSelection(e: React.FormEvent) {
    e.preventDefault()
    const candidateId = parseInt(selectionCandidateId, 10)
    if (!candidateId) return
    await api.events.setSelection(eventId, {
      candidateId,
      episodeMode: detail?.candidates.find(c => c.id === candidateId)?.itemType === 'tv' ? episodeMode : null,
    })
    load()
  }

  async function handleComplete() {
    try {
      await api.events.complete(eventId)
      load()
    } catch {}
  }

  async function handleAddInvitees(e: React.FormEvent) {
    e.preventDefault()
    if (selectedInvitees.length === 0) return
    setInviteSubmitting(true)
    try {
      await api.events.addInvitees(eventId, selectedInvitees)
      setSelectedInvitees([])
      setInviteOpen(false)
      load()
    } catch {
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleRemoveCandidate(candidateId: number) {
    await api.events.removeCandidate(eventId, candidateId)
    setConfirmingRemove(null)
    load()
  }

  async function handleRemoveInvitee(inviteeId: number) {
    await api.events.removeInvitee(eventId, inviteeId)
    if (inviteeId === userId) {
      navigate('/events')
    } else {
      load()
    }
  }

  async function handleDeleteEvent() {
    await api.events.delete(eventId)
    navigate('/events')
  }

  async function handleSaveTitle(e: React.FormEvent) {
    e.preventDefault()
    if (!titleDraft.trim()) return
    await api.events.patch(eventId, { title: titleDraft.trim() })
    setEditingTitle(false)
    load()
  }

  async function handleSaveDate(e: React.FormEvent) {
    e.preventDefault()
    if (!dateDraft) return
    await api.events.patch(eventId, { scheduledDate: dateDraft })
    setEditingDate(false)
    load()
  }

  async function handleClearSelection() {
    await api.events.clearSelection(eventId)
    load()
  }

  async function handleReopen() {
    await api.events.reopen(eventId)
    load()
  }

  if (loading) return <LoadingSpinner className="h-64" />
  if (error || !detail) return <div className="px-4 py-6 text-red-400">{error ?? 'Not found'}</div>

  const { event, invites, candidates, selection } = detail
  const isHost = event.createdByUserId === userId
  const myInvite = invites.find(i => i.userId === userId)
  const isParticipant = !!myInvite

  function getScore(c: WatchEventCandidate): number {
    return c.votes.reduce((sum, v) => sum + v.vote, 0)
  }

  function myVoteFor(c: WatchEventCandidate): number | undefined {
    return c.votes.find(v => v.userId === userId)?.vote
  }

  const sortedCandidates = [...candidates].sort((a, b) => getScore(b) - getScore(a))

  const selectedCandidate = selection
    ? candidates.find(c => c.id === selection.candidateId)
    : null
  const selectedTitleBase = selectedCandidate?.movieTitle ?? selectedCandidate?.seriesTitle
  const selectedTitleYear = selectedCandidate?.movieReleaseYear ?? selectedCandidate?.seriesReleaseYear
  const selectedTitle = selectedTitleBase ? `${selectedTitleBase}${selectedTitleYear ? ` (${selectedTitleYear})` : ''}` : undefined

  return (
    <div className="px-4 py-6 space-y-4 pb-8">
      <BackLink to="/events" label="Events" />

      {/* Header card */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <form onSubmit={handleSaveTitle} className="flex gap-2">
                <input
                  type="text"
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  autoFocus
                />
                <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors">Save</button>
                <button type="button" onClick={() => setEditingTitle(false)} className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">Cancel</button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => { setTitleDraft(event.title); setEditingTitle(true) }}
                className="text-xl font-bold text-left hover:text-violet-300 transition-colors w-full truncate"
              >
                {event.title}
              </button>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {event.completedAt && <span className="text-xs text-green-400">Completed</span>}
          </div>
        </div>

        {editingDate ? (
          <form onSubmit={handleSaveDate} className="flex gap-2 mt-1">
            <input
              type="date"
              value={dateDraft}
              onChange={e => setDateDraft(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoFocus
            />
            <button type="submit" className="text-xs px-2 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors">Save</button>
            <button type="button" onClick={() => setEditingDate(false)} className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">Cancel</button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => { setDateDraft(event.scheduledDate); setEditingDate(true) }}
            className="text-sm text-gray-400 hover:text-violet-300 transition-colors mt-1"
          >
            {new Date(event.scheduledDate).toLocaleDateString()}
          </button>
        )}

        {/* Reopen */}
        {isParticipant && event.completedAt && (
          <div className="mt-2">
            <button
              onClick={handleReopen}
              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              Reopen Event
            </button>
          </div>
        )}
      </div>

      {/* Candidates card */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Suggestions</h2>

        {sortedCandidates.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">No suggestions yet.</p>
        )}

        <ul className="space-y-3 mb-4">
          {sortedCandidates.map(c => (
            <li key={c.id} className="bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleCandidateToggle(c)}
                    className="text-sm font-medium text-left w-full flex items-center gap-1.5"
                    aria-expanded={expandedCandidateId === c.id}
                  >
                    <span className="flex-1 min-w-0 truncate">
                      {c.movieTitle ?? c.seriesTitle}{(c.movieReleaseYear ?? c.seriesReleaseYear) ? ` (${c.movieReleaseYear ?? c.seriesReleaseYear})` : ''}
                    </span>
                    <Badge color={c.itemType === 'movie' ? 'violet' : 'indigo'} className="text-xs shrink-0">
                      {c.itemType === 'movie' ? 'Movie' : 'TV'}
                    </Badge>
                  </button>
                  {expandedCandidateId === c.id && (
                    <div className="mt-1.5">
                      {loadingCandidateId === c.id ? (
                        <p className="text-xs text-gray-500">Loading…</p>
                      ) : (() => {
                        const detail = detailCache[c.id]
                        if (!detail) return null
                        return (
                          <div className="space-y-1">
                            {detail.description && <p className="text-xs text-gray-300">{detail.description}</p>}
                            {detail.streaming && <p className="text-xs text-gray-500">{detail.streaming}</p>}
                            {'runtimeMinutes' in detail && detail.runtimeMinutes != null && (
                              <p className="text-xs text-gray-500">{detail.runtimeMinutes} min</p>
                            )}
                            {'episodeRuntimeMinutes' in detail && detail.episodeRuntimeMinutes != null && (
                              <p className="text-xs text-gray-500">~{detail.episodeRuntimeMinutes} min/ep</p>
                            )}
                            {'seasonCount' in detail && detail.seasonCount != null && (
                              <p className="text-xs text-gray-500">
                                {detail.seasonCount} season{detail.seasonCount !== 1 ? 's' : ''}
                              </p>
                            )}
                            <CastPreview
                              director={detail.director}
                              cast={detail.cast}
                              showFullCast={showFullCastId === c.id}
                              onToggleFullCast={() => setShowFullCastId(prev => prev === c.id ? null : c.id)}
                            />
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-violet-400">
                    {getScore(c) > 0 ? '+' : ''}{getScore(c)}
                  </span>
                  {myInvite && !event.completedAt && (
                    confirmingRemove === c.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRemoveCandidate(c.id)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingRemove(null)}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingRemove(c.id)}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-400 hover:bg-red-800 hover:text-white transition-colors"
                        aria-label={`Remove ${c.movieTitle ?? c.seriesTitle}`}
                      >
                        ✕
                      </button>
                    )
                  )}
                </div>
              </div>
              {myInvite && !event.completedAt && (
                <VoteButtons
                  candidateId={c.id}
                  eventId={eventId}
                  currentVote={myVoteFor(c)}
                  onVote={v => handleVote(c.id, v)}
                />
              )}
              {selection?.candidateId === c.id && (
                <p className="text-xs text-green-400 mt-1">✓ {selectedTitle ? `Selected: ${selectedTitle}` : 'Selected'}</p>
              )}
            </li>
          ))}
        </ul>

        {myInvite && !event.completedAt && (
          <form onSubmit={handleAddCandidate} className="space-y-2">
            {pickedCandidate ? (
              <div className="flex items-center gap-2 bg-gray-700/50 rounded-xl px-3 py-2.5">
                <Badge color={pickedCandidate.itemType === 'movie' ? 'violet' : 'indigo'} className="text-xs shrink-0">
                  {pickedCandidate.itemType === 'movie' ? 'Movie' : 'TV'}
                </Badge>
                <span className="text-sm flex-1 truncate">{pickedCandidate.title}{pickedCandidate.releaseYear ? ` (${pickedCandidate.releaseYear})` : ''}</span>
                <button
                  type="button"
                  onClick={() => setPickedCandidate(null)}
                  className="text-gray-400 hover:text-white text-xs shrink-0"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search movies or TV shows…"
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                {searchResults.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map(r => (
                      <li key={`${r.kind}-${r.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setPickedCandidate({
                              movieId: r.kind === 'movie' ? r.id : undefined,
                              seriesId: r.kind === 'tv' ? r.id : undefined,
                              itemType: r.kind,
                              title: r.title,
                              releaseYear: r.releaseYear,
                            })
                            setSearchQuery('')
                            setSearchResults([])
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-700 transition-colors"
                        >
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${r.kind === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-blue-900 text-blue-300'}`}>
                            {r.kind === 'movie' ? 'Movie' : 'TV'}
                          </span>
                          <span className="truncate">{r.title}{r.releaseYear ? ` (${r.releaseYear})` : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Button type="submit" color="violet" className="w-full" disabled={!pickedCandidate}>
              Add
            </Button>
          </form>
        )}
      </div>

      {/* Attendance card */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">People</h2>
        <ul className="space-y-3">
          {invites.map(inv => (
            <li key={inv.userId} className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm truncate">{inv.displayName}</span>
              <div className="flex gap-2 shrink-0">
                {confirmingRemoveInvitee !== inv.userId && (['yes', 'no', 'maybe'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => isParticipant ? handleRsvp(inv.userId, a) : undefined}
                    disabled={!isParticipant}
                    className={`text-sm px-4 py-2 rounded-lg capitalize transition-colors ${
                      inv.attendance === a
                        ? a === 'yes' ? 'bg-green-700 text-white' : a === 'no' ? 'bg-red-700 text-white' : 'bg-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-400 disabled:opacity-50'
                    } ${isParticipant ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  >
                    {a}
                  </button>
                ))}
                {(isHost || isParticipant) && inv.userId !== event.createdByUserId && !event.completedAt && (
                  confirmingRemoveInvitee === inv.userId ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { handleRemoveInvitee(inv.userId); setConfirmingRemoveInvitee(null) }}
                        className="text-sm px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingRemoveInvitee(null)}
                        className="text-sm px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingRemoveInvitee(inv.userId)}
                      className="text-xs px-2 py-1 rounded-lg bg-gray-700 text-gray-400 hover:bg-red-800 hover:text-white transition-colors cursor-pointer"
                      aria-label={`Remove ${inv.displayName}`}
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>

        {/* Invite More section */}
        {(isHost || isParticipant) && !event.completedAt && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <button
              type="button"
              onClick={() => setInviteOpen(o => !o)}
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              {inviteOpen ? 'Cancel' : '+ Invite More'}
            </button>
            {inviteOpen && (
              <form onSubmit={handleAddInvitees} className="mt-3 space-y-3">
                <InviteePicker
                  selected={selectedInvitees}
                  onChange={setSelectedInvitees}
                  excludeUserIds={invites.map(i => i.userId)}
                />
                <Button
                  type="submit"
                  color="violet"
                  className="w-full"
                  loading={inviteSubmitting}
                  disabled={selectedInvitees.length === 0}
                >
                  Add Invitees
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Selection (host) */}
      {isHost && !event.completedAt && (
        <div className="bg-gray-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Confirm Selection</h2>
          {selection ? (
            <div className="bg-gray-700/50 rounded-xl p-3 mb-3">
              <p className="text-sm">Selected: {selectedTitle ?? `Suggestion #${selection.candidateId}`}</p>
              {selection.episodeMode && (
                <p className="text-xs text-gray-400">Mode: {selection.episodeMode}</p>
              )}
            </div>
          ) : null}
          <form onSubmit={handleSetSelection} className="space-y-3">
            <select
              value={selectionCandidateId}
              onChange={e => setSelectionCandidateId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            >
              <option value="">Select winner…</option>
              {sortedCandidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.movieTitle ?? c.seriesTitle}{(c.movieReleaseYear ?? c.seriesReleaseYear) ? ` (${c.movieReleaseYear ?? c.seriesReleaseYear})` : ''} [{c.itemType === 'movie' ? 'Movie' : 'TV'}] (score: {getScore(c)})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              {selection && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="flex-1 min-h-[44px] text-sm rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
              <Button type="submit" color="violet" className={selection ? 'flex-1' : 'w-full'} disabled={!selectionCandidateId}>
                Confirm
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Complete button */}
      {isHost && selection && !event.completedAt && (
        <Button color="indigo" className="w-full" onClick={handleComplete}>
          Mark Event Complete
        </Button>
      )}

      {/* Delete event */}
      {isParticipant && (
        <div>
          {confirmingDelete ? (
            <div className="flex gap-2">
              <button
                onClick={handleDeleteEvent}
                className="flex-1 min-h-[44px] text-sm rounded-xl bg-red-700 text-white hover:bg-red-600 transition-colors"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 min-h-[44px] text-sm rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="w-full min-h-[44px] text-sm rounded-xl bg-red-700 text-white hover:bg-red-600 transition-colors"
            >
              Delete Event
            </button>
          )}
        </div>
      )}
    </div>
  )
}
