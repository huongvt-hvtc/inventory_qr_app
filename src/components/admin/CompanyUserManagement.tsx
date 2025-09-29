'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Plus,
  Settings,
  Trash2,
  Edit3,
  UserPlus,
  Crown,
  Shield,
  AlertCircle,
  Clock,
  Check,
  X,
  Eye,
  ChevronDown,
  ChevronRight,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  name: string;
  license_id: string;
  created_at: string;
  created_by: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

interface CompanyPermission {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  created_at: string;
  user?: User;
  company?: Company;
}

export default function CompanyUserManagement() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<CompanyPermission[]>([]);
  const [loading, setLoading] = useState(false);

  // Company management state
  const [newCompanyName, setNewCompanyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');

  // User permission state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: true });

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load permissions with user and company details
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('company_permissions')
        .select(`
          *,
          user:profiles(*),
          company:companies(*)
        `)
        .order('created_at', { ascending: true });

      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create new company
  const createCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error('Vui lòng nhập tên công ty');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          name: newCompanyName.trim(),
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Đã tạo công ty "${newCompanyName}"`);
      setNewCompanyName('');
      await loadData();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Không thể tạo công ty');
    } finally {
      setCreating(false);
    }
  };

  // Start editing company
  const startEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditName(company.name);
  };

  // Save company edit
  const saveCompanyEdit = async () => {
    if (!editingCompany || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ name: editName.trim() })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Đã cập nhật tên công ty');
      setEditingCompany(null);
      setEditName('');
      await loadData();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Không thể cập nhật tên công ty');
    }
  };

  // Delete company
  const deleteCompany = async (company: Company) => {
    if (confirm(`Bạn có chắc muốn xóa công ty "${company.name}"? Tất cả dữ liệu liên quan sẽ bị mất.`)) {
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', company.id);

        if (error) throw error;

        toast.success(`Đã xóa công ty "${company.name}"`);
        await loadData();
      } catch (error: any) {
        console.error('Error deleting company:', error);
        toast.error(error.message || 'Không thể xóa công ty');
      }
    }
  };

  // Add user to company
  const addUserToCompany = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    if (!selectedCompany) {
      toast.error('Vui lòng chọn công ty');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      toast.error('Email không hợp lệ');
      return;
    }

    // Check if user already has permission for this company
    const existingPermission = permissions.find(
      p => p.company_id === selectedCompany.id &&
           p.user?.email?.toLowerCase() === newUserEmail.toLowerCase()
    );

    if (existingPermission) {
      toast.error('User này đã có quyền truy cập công ty này');
      return;
    }

    setAddingUser(true);
    try {
      // First, ensure user exists in profiles
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', newUserEmail.toLowerCase())
        .single();

      let userId = existingUser?.id;

      if (!existingUser) {
        // Create user profile if doesn't exist
        const { data: newUser, error: userError } = await supabase
          .from('profiles')
          .insert({
            email: newUserEmail.toLowerCase(),
            name: newUserEmail.split('@')[0]
          })
          .select()
          .single();

        if (userError) throw userError;
        userId = newUser.id;
      }

      // Add permission
      const { error: permissionError } = await supabase
        .from('company_permissions')
        .insert({
          user_id: userId,
          company_id: selectedCompany.id,
          role: 'member'
        });

      if (permissionError) throw permissionError;

      toast.success(`Đã thêm ${newUserEmail} vào công ty ${selectedCompany.name}`);
      setNewUserEmail('');
      await loadData();

    } catch (error: any) {
      console.error('Error adding user to company:', error);
      toast.error(error.message || 'Không thể thêm user vào công ty');
    } finally {
      setAddingUser(false);
    }
  };

  // Remove user from company
  const removeUserFromCompany = async (permission: CompanyPermission) => {
    if (confirm(`Bạn có chắc muốn xóa quyền truy cập của ${permission.user?.email} khỏi công ty ${permission.company?.name}?`)) {
      try {
        const { error } = await supabase
          .from('company_permissions')
          .delete()
          .eq('id', permission.id);

        if (error) throw error;

        toast.success('Đã xóa quyền truy cập');
        await loadData();
      } catch (error: any) {
        console.error('Error removing permission:', error);
        toast.error(error.message || 'Không thể xóa quyền truy cập');
      }
    }
  };

  // Toggle company expansion
  const toggleCompanyExpansion = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  // Get permissions for a company
  const getCompanyPermissions = (companyId: string) => {
    return permissions.filter(p => p.company_id === companyId);
  };

  return (
    <div className="p-3 md:p-4 lg:p-6 pt-2 md:pt-3">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Quản lý Công ty & Phân quyền</h1>
        <p className="text-sm md:text-base text-gray-600">Tạo công ty và phân quyền user truy cập</p>
      </div>

      {/* Action Bar */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={loadData}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <Settings className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          {companies.length} công ty • {users.length} users • {permissions.length} quyền
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Company Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Quản lý Công ty
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-normal">
                {companies.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Create Company */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Tạo công ty mới</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Nhập tên công ty..."
                    onKeyPress={(e) => e.key === 'Enter' && createCompany()}
                    className="flex-1 text-sm"
                  />
                  <Button
                    onClick={createCompany}
                    disabled={creating || !newCompanyName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {creating ? (
                      <Clock className="h-3 w-3 mr-1 animate-pulse" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    Tạo
                  </Button>
                </div>
              </div>

              {/* Companies List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Danh sách công ty ({companies.length})
                </div>

                {companies.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Chưa có công ty nào</p>
                  </div>
                ) : (
                  companies.map((company) => {
                    const companyPermissions = getCompanyPermissions(company.id);
                    const isExpanded = expandedCompanies.has(company.id);

                    return (
                      <div key={company.id} className="border rounded-lg bg-gray-50">
                        <div className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCompanyExpansion(company.id)}
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>

                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-blue-600" />
                            </div>

                            <div className="flex-1">
                              {editingCompany?.id === company.id ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && saveCompanyEdit()}
                                    className="flex-1 text-sm h-7"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={saveCompanyEdit}
                                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingCompany(null)}
                                    className="h-7 px-2"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {company.name}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {companyPermissions.length} users
                                  </div>
                                </>
                              )}
                            </div>

                            {editingCompany?.id !== company.id && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditCompany(company)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 w-7 p-0"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCompany(company)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Company Users - Expanded */}
                          {isExpanded && (
                            <div className="mt-3 pl-10 space-y-2">
                              {companyPermissions.length === 0 ? (
                                <div className="text-xs text-gray-500 py-2">
                                  Chưa có user nào được phân quyền
                                </div>
                              ) : (
                                companyPermissions.map((permission) => (
                                  <div key={permission.id} className="flex items-center justify-between bg-white rounded p-2 border">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                        <Users className="h-3 w-3 text-green-600" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-medium text-gray-900">
                                          {permission.user?.email}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {permission.role}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeUserFromCompany(permission)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Permission Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Phân quyền User
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-normal">
                {permissions.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add User to Company */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Thêm user vào công ty</span>
                </div>

                <div className="space-y-2">
                  <select
                    value={selectedCompany?.id || ''}
                    onChange={(e) => {
                      const company = companies.find(c => c.id === e.target.value);
                      setSelectedCompany(company || null);
                    }}
                    className="w-full text-sm h-8 px-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Chọn công ty...</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <Input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Nhập email user..."
                      type="email"
                      onKeyPress={(e) => e.key === 'Enter' && addUserToCompany()}
                      className="flex-1 text-sm"
                    />
                    <Button
                      onClick={addUserToCompany}
                      disabled={addingUser || !newUserEmail.trim() || !selectedCompany}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      {addingUser ? (
                        <Clock className="h-3 w-3 mr-1 animate-pulse" />
                      ) : (
                        <Plus className="h-3 w-3 mr-1" />
                      )}
                      Thêm
                    </Button>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Danh sách phân quyền ({permissions.length})
                </div>

                {permissions.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Chưa có phân quyền nào</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-green-600" />
                          </div>

                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">
                              {permission.user?.email}
                            </div>
                            <div className="text-xs text-gray-600">
                              {permission.company?.name} • {permission.role}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUserFromCompany(permission)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Info */}
      <Card className="mt-4 lg:mt-6">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>📋 Hướng dẫn sử dụng:</strong></p>
            <p>• Tạo công ty trước, sau đó phân quyền user vào từng công ty</p>
            <p>• User chỉ có thể truy cập các công ty được phân quyền</p>
            <p>• Một user có thể được phân quyền vào nhiều công ty</p>
            <p>• Click mũi tên bên cạnh tên công ty để xem danh sách user</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}