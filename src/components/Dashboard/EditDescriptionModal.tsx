import React, { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

interface EditDescriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (description: string) => void
  projectName: string
  currentDescription: string
  loading?: boolean
}

export function EditDescriptionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  projectName, 
  currentDescription, 
  loading = false 
}: EditDescriptionModalProps) {
  const [description, setDescription] = useState(currentDescription)

  useEffect(() => {
    setDescription(currentDescription)
  }, [currentDescription])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(description.trim())
  }

  const handleClose = () => {
    setDescription(currentDescription) // 重置为原值
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-secondary-900">编辑项目描述</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-secondary-600">
            项目：<span className="font-medium text-secondary-900">{projectName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              项目描述
            </label>
            <textarea
              className="input w-full resize-none"
              placeholder="请输入项目描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}