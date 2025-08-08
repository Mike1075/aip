import React, { useState, useEffect } from 'react'
import { Building2, Check } from 'lucide-react'
import { Organization, organizationAPI } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OrganizationSelectorProps {
  selectedOrganizations: string[]
  onOrganizationsChange: (organizationIds: string[]) => void
  currentOrganization?: Organization
}

export function OrganizationSelector({ 
  selectedOrganizations, 
  onOrganizationsChange,
  currentOrganization 
}: OrganizationSelectorProps) {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganizations()
  }, [user])

  const loadOrganizations = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // 获取用户所属的组织
      const userOrganizations = await organizationAPI.getUserOrganizations(user.id)
      
      // 如果有当前组织上下文，确保它在列表中
      let allOrganizations = userOrganizations
      if (currentOrganization && !userOrganizations.find(org => org.id === currentOrganization.id)) {
        allOrganizations = [currentOrganization, ...userOrganizations]
      }
      
      setOrganizations(allOrganizations)
    } catch (error) {
      console.error('加载组织列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleOrganization = (organizationId: string) => {
    if (selectedOrganizations.includes(organizationId)) {
      onOrganizationsChange(selectedOrganizations.filter(id => id !== organizationId))
    } else {
      onOrganizationsChange([...selectedOrganizations, organizationId])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-4">
        <Building2 className="h-8 w-8 text-secondary-300 mx-auto mb-2" />
        <p className="text-sm text-secondary-500">暂无可选择的组织</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-secondary-700 mb-3">
        选择组织智慧库 ({selectedOrganizations.length} 个已选择)
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {organizations.map((org) => (
          <div
            key={org.id}
            onClick={() => toggleOrganization(org.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              selectedOrganizations.includes(org.id)
                ? 'bg-primary-50 border-primary-200 text-primary-900'
                : 'bg-white border-secondary-200 hover:border-secondary-300 text-secondary-700'
            }`}
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
              selectedOrganizations.includes(org.id)
                ? 'bg-primary-500 border-primary-500'
                : 'border-secondary-300'
            }`}>
              {selectedOrganizations.includes(org.id) && (
                <Check className="h-3 w-3 text-white" />
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-4 w-4 text-secondary-500" />
              <div>
                <p className="font-medium text-sm">{org.name}</p>
                {org.description && (
                  <p className="text-xs text-secondary-500 line-clamp-1">
                    {org.description}
                  </p>
                )}
              </div>
            </div>
            
            {org.id === currentOrganization?.id && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                当前组织
              </span>
            )}
          </div>
        ))}
      </div>
      
      {selectedOrganizations.length > 0 && (
        <div className="mt-3 p-2 bg-secondary-50 rounded-lg">
          <p className="text-xs text-secondary-600">
            已选择 {selectedOrganizations.length} 个组织的智慧库，AI将基于这些组织的知识为您提供回答
          </p>
        </div>
      )}
    </div>
  )
}