export interface Talk {
  /** URL slug, used in the /talks/:slug route */
  slug: string
  /** Full talk title */
  title: string
  /** Short description shown on the landing-page card */
  description: string
}

export const TALKS: Talk[] = [
  {
    slug: 'developing-with-ai',
    title: 'Developing with AI and My Story of Learning to Be an Engineer and Using AI Coding Agents',
    description:
      'A personal story of learning to be an engineer and how AI coding agents have changed the way I build software.',
  },
]

export function getTalk(slug: string | undefined): Talk | undefined {
  return TALKS.find((t) => t.slug === slug)
}
