import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, Edit, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getDrivers, createDriver, updateDriver, deleteDriver } from '../services/api'
import { PageLoader, EmptyState, ConfirmDialog } from '../components/ui/Common'
import { StatusBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

function DriverForm({ driver, onSubmit, isPending }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: driver || {} })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <label className="label">TC Kimlik No</label>
          <input {...register('tc_no')} className="input" maxLength={11} />
        </div>
        <div>
          <label className="label">Telefon *</label>
          <input {...register('phone', { required: 'Zorunlu' })} className="input" />
        </div>
        <div>
          <label className="label">E-posta</label>
          <input {...register('email')} type="email" className="input" />
        </div>
        <div>
          <label className="label">Doğum Tarihi</label>
          <input {...register('birth_date')} type="date" className="input" />
        </div>
        <div>
          <label className="label">Ehliyet No</label>
          <input {...register('license_no')} className="input" />
        </div>
        <div>
          <label className="label">Ehliyet Sınıfı</label>
          <select {...register('license_class')} className="input">
            <option value="">Seçin</option>
            {['A', 'A1', 'A2', 'B', 'B1', 'C', 'C1', 'D', 'D1', 'E', 'BE', 'CE', 'DE'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ehliyet Son Kullanma</label>
          <input {...register('license_expiry')} type="date" className="input" />
        </div>
        <div>
          <label className="label">Durum</label>
          <select {...register('status')} className="input">
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="suspended">Askıya Alındı</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Adres</label>
        <textarea {...register('address')} className="input" rows={2} />
      </div>
      <div>
        <label className="label">Notlar</label>
        <textarea {...register('notes')} className="input" rows={2} />
      </div>
      <button type="submit" disabled={isPending} className="btn-primary w-full justify-center">
        {isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}

export default function DriversPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = ['admin', 'manager'].includes(user?.role)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editDriver, setEditDriver] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['drivers', search],
    queryFn: () => getDrivers({ search: search || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); setModalOpen(false); toast.success('Sürücü eklendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateDriver(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); setEditDriver(null); toast.success('Sürücü güncellendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drivers'] }); setDeleteId(null); toast.success('Sürücü silindi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sürücüler</h1>
          <p className="text-sm text-slate-500">{drivers?.length || 0} sürücü kayıtlı</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Sürücü Ekle
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Ad, soyad veya ehliyet no ara..." />
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>Telefon</th>
                <th>Ehliyet Sınıfı</th>
                <th>Ehliyet S.K.T.</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!drivers?.length ? (
                <tr><td colSpan={6}><EmptyState icon={Users} title="Sürücü bulunamadı" /></td></tr>
              ) : drivers.map(d => {
                const licenseExpiry = d.license_expiry ? new Date(d.license_expiry) : null
                const licenseExpired = licenseExpiry && licenseExpiry < new Date()
                const licenseSoon = licenseExpiry && !licenseExpired && Math.ceil((licenseExpiry - new Date()) / 86400000) < 60
                return (
                  <tr key={d.id}>
                    <td className="font-medium">{d.first_name} {d.last_name}</td>
                    <td>{d.phone}</td>
                    <td>{d.license_class || '—'}</td>
                    <td>
                      {licenseExpiry ? (
                        <span className={licenseExpired ? 'text-red-600 font-medium' : licenseSoon ? 'text-amber-600 font-medium' : ''}>
                          {format(licenseExpiry, 'dd.MM.yyyy')}
                        </span>
                      ) : '—'}
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditDriver(d)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><Edit size={15} /></button>
                          <button onClick={() => setDeleteId(d.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Sürücü Ekle" size="lg">
        <DriverForm onSubmit={createMutation.mutate} isPending={createMutation.isPending} />
      </Modal>
      <Modal isOpen={!!editDriver} onClose={() => setEditDriver(null)} title="Sürücü Düzenle" size="lg">
        {editDriver && <DriverForm driver={editDriver} onSubmit={(data) => updateMutation.mutate({ id: editDriver.id, data })} isPending={updateMutation.isPending} />}
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onCancel={() => setDeleteId(null)} onConfirm={() => deleteMutation.mutate(deleteId)} title="Sürücü Sil" message="Bu sürücüyü silmek istediğinize emin misiniz?" />
    </div>
  )
}
