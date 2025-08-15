import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  children: string
  language?: string
  theme?: 'dark' | 'light'
  showLineNumbers?: boolean
  className?: string
}

export function CodeBlock({ 
  children, 
  language = 'text', 
  theme = 'light',
  showLineNumbers = true,
  className = ''
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 清理代码内容，移除多余的换行
  const cleanCode = children.trim()

  return (
    <div className={`relative group rounded-lg overflow-hidden border ${className}`}>
      {/* 代码块头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm">
        <span className="text-gray-600 font-medium">
          {language === 'text' ? '代码' : language.toUpperCase()}
        </span>
        <CopyToClipboard text={cleanCode} onCopy={handleCopy}>
          <button
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
        </CopyToClipboard>
      </div>

      {/* 代码内容 */}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: theme === 'dark' ? '#1e1e1e' : '#fafafa',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          codeTagProps={{
            style: {
              fontFamily: 'Consolas, Monaco, "Courier New", monospace'
            }
          }}
        >
          {cleanCode}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

// 内联代码组件
export function InlineCode({ children, className = '' }: { children: string, className?: string }) {
  return (
    <code className={`px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono ${className}`}>
      {children}
    </code>
  )
} 