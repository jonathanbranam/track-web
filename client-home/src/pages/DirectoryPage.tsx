import { useAuth } from '@repo/auth'

interface AppEntry {
  name: string
  description: string
  url: string
  adminOnly?: boolean
  comingSoon?: boolean
}

const APPS: AppEntry[] = [
  { name: 'Time', description: 'Time tracking — start/stop tasks with tags, review daily logs', url: 'https://time.branam.us' },
  { name: 'Watch', description: 'Movie and TV tracking — watchlists, ratings, watch events with friends', url: 'https://watch.branam.us' },
  { name: 'Trips', description: 'Family trip log — days, packing lists, and notes', url: 'https://trips.branam.us' },
  { name: 'Games', description: 'Casual games and leaderboards', url: 'https://games.branam.us' },
  { name: 'Me', description: 'Your account, people, and groups', url: 'https://me.branam.us' },
  { name: 'Talks', description: 'Presentations and talk content', url: 'https://talks.branam.us' },
  { name: 'Food', description: 'Food tracking', url: 'https://food.branam.us', comingSoon: true },
  { name: 'Admin', description: 'Admin console — deploys, backups, and user management', url: 'https://admin.branam.us', adminOnly: true },
  { name: 'Proto', description: 'Prototype workspace', url: 'https://proto.branam.us', adminOnly: true },
]

export default function DirectoryPage() {
  const { userId } = useAuth()
  const isAdmin = userId === 1

  const visible = APPS.filter(app => !app.adminOnly || isAdmin)

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visible.map(app => (
          app.comingSoon ? (
            <div
              key={app.name}
              className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 opacity-50 cursor-default"
            >
              <div className="font-semibold text-gray-400">{app.name}</div>
              <div className="mt-1 text-sm text-gray-500">{app.description}</div>
              <div className="mt-2 text-xs text-gray-600 font-medium uppercase tracking-wide">Coming soon</div>
            </div>
          ) : (
            <a
              key={app.name}
              href={app.url}
              className="rounded-xl border border-gray-700 bg-gray-800 p-4 hover:bg-gray-700 hover:border-gray-500 transition-colors"
            >
              <div className="font-semibold text-white">{app.name}</div>
              <div className="mt-1 text-sm text-gray-400">{app.description}</div>
            </a>
          )
        ))}
      </div>
    </div>
  )
}
