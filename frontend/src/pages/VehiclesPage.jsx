import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Truck, Edit, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, getVehicleTypes } from '../services/api'
import { PageLoader, EmptyState, ConfirmDialog } from '../components/ui/Common'
import { StatusBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const FUEL_TYPES = ['benzin', 'dizel', 'lpg', 'elektrik', 'hibrit']
const STATUSES = ['active', 'maintenance', 'faulty', 'retired', 'sold']
const STATUS_LABELS = { active: 'Aktif', maintenance: 'Bakımda', faulty: 'Arızalı', retired: 'Hurdaya Ayrıldı', sold: 'Satıldı' }

function VehicleForm({ vehicle, onSubmit, isPending }) {
  const { data: types } = useQuery({ queryKey: ['vehicle-types'], queryFn: getVehicleTypes })
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: vehicle || {} })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Plaka *</label>
          <input {...register('plate_no', { required: 'Zorunlu' })} className="input uppercase" placeholder="34ABC123" />
          {errors.plate_no && <p className="text-red-500 text-xs mt-1">{errors.plate_no.message}</p>}
        </div>
        <div>
          <label className="label">Yıl *</label>
          <input {...register('year', { required: 'Zorunlu', valueAsNumber: true })} type="number" className="input" placeholder="2020" />
          {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
        </div>
        <div>
          <label className="label">Marka *</label>
          <input {...register('brand', { required: 'Zorunlu' })} className="input" placeholder="Ford" />
        </div>
        <div>
          <label className="label">Model *</label>
          <input {...register('model', { required: 'Zorunlu' })} className="input" placeholder="Transit" />
        </div>
        <div>
          <label className="label">Renk</label>
          <input {...register('color')} className="input" placeholder="Beyaz" />
        </div>
        <div>
          <label className="label">Araç Tipi</label>
          <select {...register('vehicle_type_id', { valueAsNumber: true })} className="input">
            <option value="">Seçin</option>
            {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Yakıt Tipi</label>
          <select {...register('fuel_type')} className="input">
            {FUEL_TYPES.map(f => <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Durum</label>
          <select {...register('status')} className="input">
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Güncel KM</label>
          <input {...register('current_km', { valueAsNumber: true })} type="number" className="input" placeholder="0" />
        </div>
        <div>
          <label className="label">Alış Tarihi</label>
          <input {...register('purchase_date')} type="date" className="input" />
        </div>
        <div>
          <label className="label">Alış Fiyatı (₺)</label>
          <input {...register('purchase_price', { valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="label">Şasi No (VIN)</label>
          <input {...register('vin_no')} className="input" placeholder="17 haneli" maxLength={17} />
        </div>
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

export default function VehiclesPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = ['admin', 'manager'].includes(user?.role)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', search, statusFilter],
    queryFn: () => getVehicles({ search: search || undefined, status: statusFilter || undefined }),
  })

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setModalOpen(false); toast.success('Araç eklendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateVehicle(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setEditVehicle(null); toast.success('Araç güncellendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); setDeleteId(null); toast.success('Araç silindi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Araçlar</h1>
          <p className="text-sm text-slate-500">{data?.total || 0} araç kayıtlı</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Araç Ekle
          </button>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Plaka, marka veya model ara..."
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-44">
          <option value="">Tüm Durumlar</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Liste */}
      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Plaka</th>
                <th>Araç</th>
                <th>Yakıt</th>
                <th>KM</th>
                <th>Durum</th>
                <th>Zimmetli Sürücü</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!data?.data?.length ? (
                <tr><td colSpan={7}><EmptyState icon={Truck} title="Araç bulunamadı" /></td></tr>
              ) : data.data.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link to={`/vehicles/${v.id}`} className="font-semibold text-blue-600 hover:underline">
                      {v.plate_no}
                    </Link>
                  </td>
                  <td>{v.brand} {v.model} <span className="text-slate-400">({v.year})</span></td>
                  <td className="capitalize">{v.fuel_type}</td>
                  <td>{v.current_km?.toLocaleString('tr-TR')} km</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>{v.current_driver || <span className="text-slate-400">—</span>}</td>
                  <td>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditVehicle(v)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => setDeleteId(v.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ekle Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Yeni Araç Ekle" size="lg">
        <VehicleForm onSubmit={createMutation.mutate} isPending={createMutation.isPending} />
      </Modal>

      {/* Düzenle Modal */}
      <Modal isOpen={!!editVehicle} onClose={() => setEditVehicle(null)} title="Araç Düzenle" size="lg">
        {editVehicle && (
          <VehicleForm
            vehicle={editVehicle}
            onSubmit={(data) => updateMutation.mutate({ id: editVehicle.id, data })}
            isPending={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Sil Onay */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Araç Sil"
        message="Bu aracı silmek istediğinize emin misiniz? Tüm ilgili kayıtlar da silinecek."
      />
    </div>
  )
}
