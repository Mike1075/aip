import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (projectName: string, description?: string) => void
  loading?: boolean
}

export function CreateProjectModal({ isOpen, onClose, onConfirm, loading = false }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (projectName.trim()) {
      onConfirm(projectName.trim(), description.trim() || undefined)
    }
  }

  const handleClose = () => {
    setProjectName('')
    setDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-secondary-900">创建新项目</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              项目名称
            </label>
            <input
              type="text"
              required
              className="input w-full"
              placeholder="请输入项目名称"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              项目描述 <span className="text-secondary-500 font-normal">(可选)</span>
            </label>
            <textarea
              className="input w-full resize-none"
              placeholder="请输入项目描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
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
              disabled={!projectName.trim() || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  创建
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}