import devPorts from '../dev-ports.json'

export { devPorts }

export function getAppUrl(slug: string, prodUrl: string): string {
  if (!import.meta.env.DEV) return prodUrl

  const { hostname, protocol } = window.location
  const port = (devPorts as Record<string, number>)[slug]
  if (port === undefined) return prodUrl

  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  if (hostname === 'localhost' || isIPv4) {
    return `${protocol}//${hostname}:${port}`
  }

  const duckdnsMatch = hostname.match(/-branam-us\.duckdns\.org$/)
  if (duckdnsMatch) {
    return `${protocol}//${slug}${duckdnsMatch[0]}`
  }

  return prodUrl
}
