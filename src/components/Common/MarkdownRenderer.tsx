import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// 代码块组件（简化版，不依赖外部库）
function CodeBlock({ children, language }: { children: string, language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200 my-4">
      {/* 代码块头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm">
        <span className="text-gray-600 font-medium">
          {language ? language.toUpperCase() : '代码'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="复制代码"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-600">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>

      {/* 代码内容 */}
      <pre className="p-4 bg-gray-50 overflow-x-auto">
        <code className="text-sm font-mono text-gray-800 whitespace-pre">
          {children.trim()}
        </code>
      </pre>
    </div>
  )
}

// 内联代码组件
function InlineCode({ children }: { children: string }) {
  return (
    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
      {children}
    </code>
  )
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 自定义代码块渲染
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : undefined
            const inline = !className?.includes('language-')

            if (!inline && className?.includes('language-')) {
              return (
                <CodeBlock language={language}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              )
            }

            return (
              <InlineCode>
                {String(children)}
              </InlineCode>
            )
          },
          // 自定义表格样式
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return (
              <thead className="bg-gray-50">
                {children}
              </thead>
            )
          },
          th({ children }) {
            return (
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 border-b border-gray-200">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                {children}
              </td>
            )
          },
          // 自定义引用块样式
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-gray-700 italic">
                {children}
              </blockquote>
            )
          },
          // 自定义链接样式
          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
              </a>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
} 