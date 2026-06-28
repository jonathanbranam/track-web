import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const defaultComponents: Components = {
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
  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mt-6 mb-3 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-white mt-6 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold text-gray-100 mt-3 mb-1">{children}</h4>,
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3 last:mb-0">
      <table className="w-full text-sm text-left border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-gray-600">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-gray-700 last:border-0">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 font-semibold text-white whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 text-gray-200 align-top">{children}</td>,
}

interface MarkdownContentProps {
  children: string | null | undefined
  /** Component overrides merged over the defaults (e.g. anchored headings). */
  components?: Components
}

export default function MarkdownContent({ children, components }: MarkdownContentProps) {
  if (!children) return null
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...defaultComponents, ...components }}>
      {children}
    </ReactMarkdown>
  )
}
