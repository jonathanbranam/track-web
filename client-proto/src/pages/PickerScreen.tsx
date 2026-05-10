import { Link } from 'react-router-dom'
import registry from '../registry'

export default function PickerScreen() {
  return (
    <div
      className="bg-gray-900 min-h-screen text-white flex flex-col"
      style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}
    >
      <div className="px-4 py-6">
        <h1 className="text-xl font-semibold text-gray-300 mb-6">Prototypes</h1>
        {registry.length === 0 ? (
          <p className="text-gray-500 text-center mt-16">No prototypes registered.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {registry.map((proto) => (
              <Link
                key={proto.name}
                to={`/proto/${proto.name}/`}
                className="block w-full bg-gray-800 active:bg-gray-700 rounded-xl px-5 py-4 text-white text-lg font-medium"
              >
                {proto.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
