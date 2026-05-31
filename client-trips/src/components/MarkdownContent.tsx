import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const components: Components = {
  p: ({ children }) => <p className="text-gray-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-gray-200 italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside text-gray-200 space-y-1 mb-2 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside text-gray-200 space-y-1 mb-2 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="bg-gray-800 text-gray-200 rounded px-1 py-0.5 text-sm font-mono">{children}</code>
  ),
}

interface MarkdownContentProps {
  children: string | null | undefined
}

export default function MarkdownContent({ children }: MarkdownContentProps) {
  if (!children) return null
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}
