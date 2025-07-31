import React, { useState, useRef, useEffect } from 'react'
import { Edit2, Check, X } from 'lucide-react'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  canEdit?: boolean
  className?: string
  placeholder?: string
  maxLength?: number
}

export function InlineEdit({ 
  value, 
  onSave, 
  canEdit = true, 
  className = '', 
  placeholder = '点击编辑',
  maxLength = 100
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    if (!canEdit) return
    setEditValue(value)
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editValue.trim() === '') {
      alert('名称不能为空')
      return
    }
    
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onSave(editValue.trim())
      setIsEditing(false)
    } catch (error: any) {
      alert(`保存失败：${error.message || '请重试'}`)
      setEditValue(value) // 恢复原值
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleSave}
          className={`bg-white border border-primary-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${className}`}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isLoading}
        />
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
          title="保存"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
          title="取消"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div 
      className={`group flex items-center gap-2 ${canEdit ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleStartEdit}
    >
      <span className={canEdit ? 'group-hover:text-primary-600 transition-colors' : ''}>
        {value}
      </span>
      {canEdit && (
        <Edit2 className="h-4 w-4 text-secondary-400 group-hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-all" />
      )}
    </div>
  )
}