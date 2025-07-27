import React, { useState, useEffect } from 'react'
import { X, FileText, Trash2, AlertTriangle, Upload } from 'lucide-react'
import { Project } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { FileUpload } from './FileUpload'
import { useAuth } from '@/contexts/AuthContext'

interface Document {
  id: string
  title: string
  created_at: string
}

interface ProjectDetailPanelProps {
  isOpen: boolean
  onClose: () => void
  project: Project
}

export function ProjectDetailPanel({ isOpen, onClose, project }: ProjectDetailPanelProps) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [docToDelete, setDocToDelete] = useState<Document | null>(null)
  const [showFileUpload, setShowFileUpload] = useState(false)

  useEffect(() => {
    if (isOpen && project) {
      loadProjectDocuments()
    }
  }, [isOpen, project])

  const loadProjectDocuments = async () => {
    try {
      setLoading(true)
      console.log('📄 加载项目文档:', project.id)
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ 加载文档失败:', error)
        throw error
      }

      console.log('✅ 文档加载成功:', data)
      setDocuments(data || [])
    } catch (error) {
      console.error('❌ 加载项目文档失败:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = (doc: Document) => {
    setDocToDelete(doc)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteDocument = async () => {
    if (!docToDelete) return

    try {
      setDeletingDocId(docToDelete.id)
      console.log('🗑️ 删除文档:', docToDelete.id, docToDelete.title)
      
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docToDelete.id)

      if (error) {
        console.error('❌ 删除文档失败:', error)
        throw error
      }

      console.log('✅ 文档删除成功!')
      
      // 重新加载文档列表
      await loadProjectDocuments()
      
    } catch (error) {
      console.error('❌ 删除文档失败:', error)
      alert('删除文档失败，请重试')
    } finally {
      setDeletingDocId(null)
      setShowDeleteConfirm(false)
      setDocToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDocToDelete(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div>
            <h2 className="text-xl font-semibold text-secondary-900">{project.name}</h2>
            <p className="text-sm text-secondary-500 mt-1">项目文档管理</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        {/* 项目描述 */}
        {project.description && (
          <div className="px-6 py-4 bg-secondary-50 border-b border-secondary-200">
            <p className="text-sm text-secondary-700">{project.description}</p>
          </div>
        )}

        {/* 文档列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-secondary-900">项目文档</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-secondary-500">{documents.length} 个文档</span>
              <button
                onClick={() => setShowFileUpload(true)}
                className="btn-primary btn-sm flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                上传文档
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <p className="text-secondary-500">此项目暂无文档</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <FileText className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-secondary-900 line-clamp-1">
                        {doc.title}
                      </h4>
                      <p className="text-sm text-secondary-500">
                        {new Date(doc.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    disabled={deletingDocId === doc.id}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors group disabled:opacity-50"
                    title="删除文档"
                  >
                    {deletingDocId === doc.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    ) : (
                      <X className="h-4 w-4 text-secondary-400 group-hover:text-red-500" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {showDeleteConfirm && docToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900">确认删除</h3>
            </div>
            
            <p className="text-secondary-700 mb-6">
              确定要删除文档 "<span className="font-medium">{docToDelete.title}</span>" 吗？
              <br />
              <span className="text-red-600 text-sm">此操作无法撤销。</span>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteDocument}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件上传弹窗 */}
      {showFileUpload && user && (
        <FileUpload
          projectId={project.id}
          userId={user.id}
          onUploadSuccess={loadProjectDocuments}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  )
}