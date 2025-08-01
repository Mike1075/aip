import React, { useState, useCallback, useEffect } from 'react'
import { Upload, File, X, CheckCircle, AlertCircle, Clock, FileText, Trash2 } from 'lucide-react'
import { uploadDocumentToN8n, getProjectDocuments, ProjectDocument, deleteDocumentsByTitle } from '../../lib/n8n'
import { organizationAPI } from '../../lib/supabase'

interface FileUploadProps {
  projectId: string
  userId: string
  onUploadSuccess: () => void
  onClose: () => void
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  title: string  // 添加自定义标题
}

export function FileUpload({ projectId, userId, onUploadSuccess, onClose }: FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [existingDocuments, setExistingDocuments] = useState<ProjectDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [userRole, setUserRole] = useState<'manager' | 'developer' | 'tester' | 'designer' | null>(null)
  const [deletingTitle, setDeletingTitle] = useState<string | null>(null)

  // 加载项目历史文档和用户角色
  useEffect(() => {
    loadExistingDocuments()
    loadUserRole()
  }, [projectId, userId])

  const loadUserRole = async () => {
    try {
      const role = await organizationAPI.getUserProjectRole(projectId, userId)
      setUserRole(role)
    } catch (error) {
      console.error('获取用户角色失败:', error)
    }
  }

  const loadExistingDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const documents = await getProjectDocuments(projectId)
      
      // 对文档按title去重，保留最新的版本
      const uniqueDocuments = documents.reduce((acc: ProjectDocument[], current) => {
        const existingDoc = acc.find(doc => doc.title === current.title)
        if (!existingDoc) {
          acc.push(current)
        } else {
          // 如果已存在相同title，保留创建时间更晚的
          if (new Date(current.created_at) > new Date(existingDoc.created_at)) {
            const index = acc.findIndex(doc => doc.title === current.title)
            acc[index] = current
          }
        }
        return acc
      }, [])
      
      setExistingDocuments(uniqueDocuments)
    } catch (error) {
      console.error('加载历史文档失败:', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const acceptedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️'
    if (file.type === 'application/pdf') return '📄'
    if (file.type.includes('word')) return '📝'
    if (file.type === 'text/plain') return '📰'
    return '📁'
  }

  const validateFile = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      return '不支持的文件类型。请上传PDF、图片、Word文档或文本文件。'
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB
      return '文件大小不能超过50MB'
    }
    return null
  }

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: UploadFile[] = []
    
    Array.from(files).forEach(file => {
      const error = validateFile(file)
      newFiles.push({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: error ? 'error' : 'pending',
        progress: 0,
        error,
        title: file.name  // 默认使用文件名作为标题
      })
    })
    
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id && f.progress < 90
            ? { ...f, progress: f.progress + 10 }
            : f
        ))
      }, 300)

      // 调用n8n文件处理工作流
      const result = await uploadDocumentToN8n(
        uploadFile.file,
        projectId,
        uploadFile.title,  // 使用自定义标题
        userId
      )

      clearInterval(progressInterval)

      if (result.success) {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'success', progress: 100 }
            : f
        ))
        // 重新加载历史文档列表
        loadExistingDocuments()
      } else {
        throw new Error(result.error || '上传失败')
      }

    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: 'error', 
              progress: 0,
              error: error instanceof Error ? error.message : '上传失败'
            }
          : f
      ))
    }
  }

  const startUpload = () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending')
    pendingFiles.forEach(uploadFile)
  }

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const updateFileTitle = (id: string, newTitle: string) => {
    // 防止用户输入"项目智慧库"
    if (newTitle.trim() === '项目智慧库') {
      alert('不能使用"项目智慧库"作为文档名称，这是系统保留名称。')
      return
    }
    
    setUploadFiles(prev => prev.map(f => 
      f.id === id ? { ...f, title: newTitle } : f
    ))
  }

  // 删除文档功能
  const handleDeleteDocument = async (title: string, createdBy: string) => {
    // 检查权限：创建者可以删除自己的文档，项目经理可以删除所有文档
    const canDelete = userRole === 'manager' || createdBy === userId
    
    if (!canDelete) {
      alert('您没有权限删除此文档')
      return
    }

    // 防止删除项目智慧库
    if (title === '项目智慧库') {
      alert('项目智慧库不能被删除')
      return
    }

    if (!confirm(`确定要删除所有名为"${title}"的文档吗？此操作不可撤销。`)) {
      return
    }

    try {
      setDeletingTitle(title)
      
      // 如果不是项目经理，需要额外的权限检查
      if (userRole !== 'manager') {
        // 获取所有同名文档，检查是否都是当前用户创建的
        const allDocs = await getProjectDocuments(projectId)
        const sameTitleDocs = allDocs.filter(doc => doc.title === title)
        const hasOthersDoc = sameTitleDocs.some(doc => doc.user_id !== userId)
        
        if (hasOthersDoc) {
          alert('您只能删除自己创建的文档，但存在其他用户创建的同名文档')
          setDeletingTitle(null)
          return
        }
      }
      
      await deleteDocumentsByTitle(projectId, title)
      
      // 重新加载文档列表
      await loadExistingDocuments()
      
      alert('文档删除成功')
    } catch (error) {
      console.error('删除文档失败:', error)
      alert('删除文档失败: ' + (error instanceof Error ? error.message : '未知错误'))
    } finally {
      setDeletingTitle(null)
    }
  }

  // 检查用户是否可以删除文档
  const canDeleteDocument = (title: string, createdBy: string) => {
    if (title === '项目智慧库') return false
    return userRole === 'manager' || createdBy === userId
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const allCompleted = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'success' || f.status === 'error')
  const hasSuccess = uploadFiles.some(f => f.status === 'success')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">上传文档</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-secondary-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 历史文档列表 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              项目历史文档
            </h3>
            
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                <span className="ml-2 text-secondary-600">加载中...</span>
              </div>
            ) : existingDocuments.length === 0 ? (
              <div className="text-center py-8 text-secondary-500">
                <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-2" />
                <p>此项目暂无文档</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {existingDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors"
                  >
                    <span className="text-lg">{getFileIcon({ type: doc.metadata?.file_type || 'text/plain' } as File)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-secondary-900 truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-secondary-500">
                        {doc.metadata?.filename && (
                          <>
                            <span>{doc.metadata.filename}</span>
                            <span>•</span>
                          </>
                        )}
                        {doc.metadata?.file_size && (
                          <>
                            <span>{(doc.metadata.file_size / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                          </>
                        )}
                        <Clock className="h-3 w-3" />
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* 删除按钮 - 只有有权限的用户才能看到 */}
                    {canDeleteDocument(doc.title, doc.user_id) && (
                      <button
                        onClick={() => handleDeleteDocument(doc.title, doc.user_id)}
                        disabled={deletingTitle === doc.title}
                        className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={userRole === 'manager' ? '删除文档' : '删除我的文档'}
                      >
                        {deletingTitle === doc.title ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="border-t border-secondary-200 mb-6"></div>

          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${
              isDragging 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-secondary-300 hover:border-primary-400'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <Upload className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              拖拽文件到此处或点击选择
            </h3>
            <p className="text-sm text-secondary-500 mb-4">
              支持 PDF、图片、Word文档、文本文件 (最大50MB)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt"
              onChange={onFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="btn-primary cursor-pointer inline-flex items-center gap-2"
            >
              <File className="h-4 w-4" />
              选择文件
            </label>
          </div>

          {/* 文件列表 */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-secondary-900">
                文件列表 ({uploadFiles.length})
              </h3>
              
              {uploadFiles.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center gap-3 p-4 border border-secondary-200 rounded-lg"
                >
                  <span className="text-2xl">{getFileIcon(uploadFile.file)}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <p className="text-xs text-secondary-500 mb-1">文件名: {uploadFile.file.name}</p>
                      <input
                        type="text"
                        value={uploadFile.title}
                        onChange={(e) => updateFileTitle(uploadFile.id, e.target.value)}
                        placeholder="输入文档标题..."
                        disabled={uploadFile.status === 'uploading' || uploadFile.status === 'success'}
                        className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:border-primary-500 disabled:bg-secondary-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="text-sm text-secondary-500">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {/* 进度条 */}
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-secondary-500 mb-1">
                          <span>上传中...</span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                        <div className="w-full bg-secondary-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${uploadFile.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* 错误信息 */}
                    {uploadFile.status === 'error' && (
                      <p className="text-sm text-red-600 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>

                  {/* 状态图标 */}
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'success' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    
                    <button
                      onClick={() => removeFile(uploadFile.id)}
                      className="p-1 hover:bg-red-50 rounded text-secondary-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex gap-3 p-6 border-t border-secondary-200">
          <button onClick={onClose} className="btn-secondary flex-1">
            {allCompleted ? '完成' : '取消'}
          </button>
          
          {!allCompleted && (
            <button
              onClick={startUpload}
              disabled={uploadFiles.filter(f => f.status === 'pending').length === 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              开始上传 ({uploadFiles.filter(f => f.status === 'pending').length})
            </button>
          )}
          
          {allCompleted && hasSuccess && (
            <button
              onClick={() => {
                onUploadSuccess()
                onClose()
              }}
              className="btn-primary flex-1"
            >
              刷新文档列表
            </button>
          )}
        </div>
      </div>
    </div>
  )
}