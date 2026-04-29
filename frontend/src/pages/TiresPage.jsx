import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Eye, Circle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTires, getTireStats, createTire, deleteTire, getVehicles } from '../services/api'
import { PageLoader, StatCard } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const TYPE_MAP = { summer: 'Yaz', winter: 'Kış', all_season: '4 Mevsim' }
const POSITION_MAP = {
  front_left: 'Ön Sol', front_right: 'Ön Sağ',
  rear_left: 'Arka Sol', rear_right: 'Arka Sağ',
  spare: 'Yedek', storage: 'Depoda',
}
const STATUS_MAP = {
  active: { label: 'Araçta', cls: 'bg-green-100 text-green-700' },
  storage: { label: 'Depoda', cls: 'bg-slate-100 text-slate-600' },
  scrapped: { label: 'Hurda', cls: 'bg-red-100 text-red-600' },
}

function TreadBadge({ depth }) {
  if (depth == null) return <span className="text-slate-400 text-xs">—</span>
  const d = parseFloat(depth)
  const cls = d < 1.6 ? 'text-red-600 font-bold' : d < 3 ? 'text-amber-500 font-semibold' : 'text-green-600'
  return <span className={`text-sm ${cls}`}>{d} mm</span>
}

export default function TiresPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [addModal, setAddModal] = useState(false)

  const { data: statsData } = useQuery({ queryKey: ['tire-stats'], queryFn: getTireStats })
  const { data, isLoading } = useQuery({
    queryKey: ['tires', statusFilter, typeFilter],
    queryFn: () => getTires({ status: statusFilter || undefined, type: typeFilter || undefined, limit: 100 }),
  })
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => getVehicles({ limit: 200 }),
  })

  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { status: 'storage', type: 'all_season', position: 'storage' } })
  const watchStatus = watch('status')

  const onAdd = (data) => {
    createTire(data)
      .then(() => {
        toast.success('Lastik eklendi.')
        setAddModal(false)
        reset()
        qc.invalidateQueries({ queryKey: ['tires'] })
        qc.invalidateQueries({ queryKey: ['tire-stats'] })
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
  }

  const handleDelete = (id, brand, model) => {
    if (window.confirm(`"${brand} ${model || ''}" lastikini silmek istediğinizden emin misiniz?`)) {
      deleteTire(id)
        .then(() => {
          toast.success('Lastik silindi.')
          qc.invalidateQueries({ queryKey: ['tires'] })
          qc.invalidateQueries({ queryKey: ['tire-stats'] })
        })
        .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
    }
  }

  const tires = data?.data || []
  const vehicles = vehiclesData?.data || vehiclesData || []
  const stats = statsData || {}

  const filterBtns = [
    { label: 'Tümü', value: '' },
    { label: 'Araçta', value: 'active' },
    { label: 'Depoda', value: 'storage' },
    { label: 'Hurda', value: 'scrapped' },
  ]
  const typeBtns = [
    { label: 'Tüm Tipler', value: '' },
    { label: 'Yaz', value: 'summer' },
    { label: 'Kış', value: 'winter' },
    { label: '4 Mevsim', value: 'all_season' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Lastik Yönetimi</h1>
          <p className="text-sm text-slate-500">Araç lastiklerini takip edin</p>
        </div>
        {canEdit && (
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Lastik Ekle
          </button>
        )}
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatCard title="Toplam Lastik" value={stats.total || 0} subtitle="Hurda hariç" icon={Circle} color="slate" />
        <StatCard title="Araçta" value={stats.active || 0} subtitle="Takılı lastikler" icon={Circle} color="green" />
        <StatCard title="Depoda" value={stats.in_storage || 0} subtitle="Stok" icon={Circle} color="blue" />
        <StatCard title="Hurda" value={stats.scrapped || 0} subtitle="Kullanım dışı" icon={Circle} color="red" />
        <StatCard title="Düşük Diş" value={stats.low_tread || 0} subtitle="< 3mm uyarı" icon={Circle} color={stats.low_tread > 0 ? 'amber' : 'slate'} />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {filterBtns.map(b => (
            <button
              key={b.value}
              onClick={() => setStatusFilter(b.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === b.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >{b.label}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {typeBtns.map(b => (
            <button
              key={b.value}
              onClick={() => setTypeFilter(b.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === b.value ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >{b.label}</button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div className="card p-0 overflow-x-auto">
        {isLoading ? <PageLoader /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Marka / Model</th>
                <th className="th">Ebat</th>
                <th className="th">Tip</th>
                <th className="th">Araç</th>
                <th className="th">Pozisyon</th>
                <th className="th">Diş Derinliği</th>
                <th className="th">Basınç</th>
                <th className="th">Durum</th>
                <th className="th">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {tires.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Lastik kaydı bulunamadı.</td></tr>
              ) : tires.map(t => (
                <tr key={t.id} className="table-row-hover">
                  <td className="td font-semibold text-slate-800">
                    {t.brand} {t.model || ''}
                    {t.serial_no && <span className="block text-xs text-slate-400 font-normal">S/N: {t.serial_no}</span>}
                  </td>
                  <td className="td text-sm text-slate-600">{t.size || '—'}</td>
                  <td className="td">
                    <span className="badge bg-slate-100 text-slate-700">{TYPE_MAP[t.type]}</span>
                  </td>
                  <td className="td text-sm">
                    {t.plate_no
                      ? <Link to={`/vehicles/${t.vehicle_id}`} className="text-blue-600 hover:underline">{t.plate_no}</Link>
                      : <span className="text-slate-400">—</span>}
                    {t.vehicle_brand && <span className="block text-xs text-slate-400">{t.vehicle_brand} {t.vehicle_model}</span>}
                  </td>
                  <td className="td text-sm text-slate-600">{POSITION_MAP[t.position] || '—'}</td>
                  <td className="td"><TreadBadge depth={t.tread_depth} /></td>
                  <td className="td text-sm text-slate-600">{t.pressure ? `${t.pressure} bar` : '—'}</td>
                  <td className="td">
                    <span className={`badge ${STATUS_MAP[t.status]?.cls}`}>{STATUS_MAP[t.status]?.label}</span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Link to={`/tires/${t.id}`} className="icon-btn" title="Detay"><Eye size={15} /></Link>
                      {canEdit && (
                        <button onClick={() => handleDelete(t.id, t.brand, t.model)} className="icon-btn text-red-500 hover:text-red-700" title="Sil">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lastik Ekle Modal */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); reset() }} title="Yeni Lastik Ekle" size="xl">
        <form onSubmit={handleSubmit(onAdd)} className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Lastik Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Marka *</label>
                <input {...register('brand', { required: true })} className="input" placeholder="Bridgestone, Michelin..." />
              </div>
              <div>
                <label className="label">Model</label>
                <input {...register('model')} className="input" placeholder="Turanza, Pilot Sport..." />
              </div>
              <div>
                <label className="label">Ebat</label>
                <input {...register('size')} className="input" placeholder="205/65 R16" />
              </div>
              <div>
                <label className="label">Seri No</label>
                <input {...register('serial_no')} className="input" />
              </div>
              <div>
                <label className="label">Lastik Tipi</label>
                <select {...register('type')} className="input">
                  <option value="all_season">4 Mevsim</option>
                  <option value="summer">Yaz</option>
                  <option value="winter">Kış</option>
                </select>
              </div>
              <div>
                <label className="label">Alış Tarihi</label>
                <input {...register('purchase_date')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Alış Fiyatı (₺)</label>
                <input {...register('purchase_price', { valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Durum & Yerleşim</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Durum</label>
                <select {...register('status')} className="input">
                  <option value="storage">Depoda</option>
                  <option value="active">Araçta (Takılı)</option>
                  <option value="scrapped">Hurda</option>
                </select>
              </div>
              {watchStatus === 'active' && (
                <>
                  <div>
                    <label className="label">Araç</label>
                    <select {...register('vehicle_id')} className="input">
                      <option value="">Seçin</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.brand} {v.model}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Pozisyon</label>
                    <select {...register('position')} className="input">
                      <option value="front_left">Ön Sol</option>
                      <option value="front_right">Ön Sağ</option>
                      <option value="rear_left">Arka Sol</option>
                      <option value="rear_right">Arka Sağ</option>
                      <option value="spare">Yedek</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Montaj Tarihi</label>
                    <input {...register('installed_date')} type="date" className="input" />
                  </div>
                  <div>
                    <label className="label">Montaj KM</label>
                    <input {...register('installed_km', { valueAsNumber: true })} type="number" className="input" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Mevcut Durum Ölçümleri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Diş Derinliği (mm)</label>
                <input {...register('tread_depth', { valueAsNumber: true })} type="number" step="0.1" className="input" placeholder="ör: 7.5" />
              </div>
              <div>
                <label className="label">Basınç (bar)</label>
                <input {...register('pressure', { valueAsNumber: true })} type="number" step="0.1" className="input" placeholder="ör: 2.4" />
              </div>
              <div className="col-span-2">
                <label className="label">Notlar</label>
                <textarea {...register('notes')} className="input" rows={2} />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center">Lastik Ekle</button>
        </form>
      </Modal>
    </div>
  )
}
