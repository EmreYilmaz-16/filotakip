import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Edit } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getUsers, createUser, updateUser } from '../services/api'
import { PageLoader, EmptyState } from '../components/ui/Common'
import { StatusBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Yönetici' },
  { value: 'driver', label: 'Sürücü' },
]

function UserForm({ user: existingUser, onSubmit, isPending }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: existingUser ? { ...existingUser } : { role: 'driver', is_active: true }
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Ad *</label>
          <input {...register('first_name', { required: 'Zorunlu' })} className="input" />
          {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
        </div>
        <div>
          <label className="label">Soyad *</label>
          <input {...register('last_name', { required: 'Zorunlu' })} className="input" />
        </div>
        <div>
          <label className="label">Kullanıcı Adı *</label>
          <input {...register('username', { required: 'Zorunlu' })} className="input" />
        </div>
        <div>
          <label className="label">E-posta</label>
          <input {...register('email')} type="email" className="input" />
        </div>
        {!existingUser && (
          <div>
            <label className="label">Şifre *</label>
            <input {...register('password', { required: 'Zorunlu', minLength: { value: 6, message: 'En az 6 karakter' } })} type="password" className="input" />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
        )}
        <div>
          <label className="label">Rol *</label>
          <select {...register('role', { required: true })} className="input">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Telefon</label>
          <input {...register('phone')} className="input" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input {...register('is_active')} type="checkbox" id="is_active" className="w-4 h-4 rounded" />
          <label htmlFor="is_active" className="text-sm text-slate-600">Aktif</label>
        </div>
      </div>
      {existingUser && (
        <div>
          <label className="label">Yeni Şifre (değiştirmek için doldurun)</label>
          <input {...register('password')} type="password" className="input" />
        </div>
      )}
      <button type="submit" disabled={isPending} className="btn-primary w-full justify-center">
        {isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [modalOpen, setModalOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModalOpen(false); toast.success('Kullanıcı oluşturuldu.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditUser(null); toast.success('Kullanıcı güncellendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const roleLabel = (role) => ROLES.find(r => r.value === role)?.label || role

  if (currentUser?.role !== 'admin') {
    return <div className="text-center py-20 text-slate-400">Bu sayfaya erişim yetkiniz yok.</div>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kullanıcılar</h1>
          <p className="text-sm text-slate-500">{users?.length || 0} kullanıcı kayıtlı</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Kullanıcı Ekle
        </button>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Kullanıcı Adı</th>
                <th>E-posta</th>
                <th>Telefon</th>
                <th>Rol</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!users?.length ? (
                <tr><td colSpan={7}><EmptyState icon={Users} title="Kullanıcı bulunamadı" /></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.first_name} {u.last_name}</td>
                  <td className="text-slate-500">{u.username}</td>
                  <td>{u.email || '—'}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                      {u.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => setEditUser(u)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                      <Edit size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Kullanıcı Ekle" size="lg">
        <UserForm onSubmit={createMutation.mutate} isPending={createMutation.isPending} />
      </Modal>
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Kullanıcı Düzenle" size="lg">
        {editUser && <UserForm user={editUser} onSubmit={(data) => updateMutation.mutate({ id: editUser.id, data })} isPending={updateMutation.isPending} />}
      </Modal>
    </div>
  )
}
