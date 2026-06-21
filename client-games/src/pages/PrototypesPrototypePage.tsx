import { Suspense } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { getPrototype } from '../games/prototypes/registry'

export default function PrototypesPrototypePage() {
  const { protoSlug } = useParams<{ protoSlug: string }>()
  const proto = protoSlug ? getPrototype(protoSlug) : undefined

  if (!proto) {
    return <Navigate to="/game/prototypes" replace />
  }

  const ProtoComponent = proto.mount

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <Link to="/game/prototypes" className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Prototypes
        </Link>
        <span className="text-sm font-semibold">{proto.name}</span>
        <span className="w-12" />
      </div>
      <div className="flex-1 min-h-0">
        <Suspense
          fallback={<div className="flex items-center justify-center h-full text-gray-400">Loading&hellip;</div>}
        >
          <ProtoComponent />
        </Suspense>
      </div>
    </div>
  )
}
