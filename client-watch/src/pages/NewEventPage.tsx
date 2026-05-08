import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextInput, SegmentedControl } from '@repo/ui'
import { api } from '../api'

const typeOptions = [
  { value: 'movie' as const, label: 'Movie' },
  { value: 'tv' as const, label: 'TV' },
]

export function NewEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'movie' | 'tv'>('movie')
  const [scheduledDate, setScheduledDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledDate) return

    setSubmitting(true)
    setError(null)
    try {
      const event = await api.events.create({
        title: title.trim(),
        type,
        scheduledDate,
        invitees: [],
      })
      navigate(`/events/${event.id}`)
    } catch {
      setError('Failed to create event')
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Back-button header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => navigate('/events')}
          className="text-gray-400 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-semibold">New Watch Event</h1>
      </div>

      <div className="px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <TextInput
            label="Title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Movie night…"
            required
            color="violet"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <SegmentedControl
              options={typeOptions}
              value={type}
              onChange={setType}
              activeClass="bg-violet-600 text-white"
            />
          </div>

          <TextInput
            label="Date"
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            required
            color="violet"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button
            type="submit"
            color="violet"
            className="w-full"
            loading={submitting}
            disabled={!title.trim() || !scheduledDate}
          >
            Create Event
          </Button>
        </form>
      </div>
    </div>
  )
}
