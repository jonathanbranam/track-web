import { useParams, Navigate } from 'react-router-dom'
import registry from '../registry'

export default function ProtoShell() {
  const { name } = useParams<{ name: string }>()
  const entry = registry.find((p) => p.name === name)

  if (!entry) return <Navigate to="/" replace />

  const { Component } = entry
  return <Component />
}
