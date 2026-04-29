import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Pencil, Trash2, Plus, Circle } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getTire, updateTire, deleteTire, addTireHistory, getVehicles } from '../services/api'
import { PageLoader } from '../components/ui/Common'
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
const ACTION_MAP = {
  installed: { label: 'Takıldı', cls: 'bg-green-100 text-green-700' },
  removed: { label: 'Söküldü', cls: 'bg-amber-100 text-amber-700' },
  rotated: { label: 'Rotasyon', cls: 'bg-blue-100 text-blue-700' },
  inspected: { label: 'İncelendi', cls: 'bg-slate-100 text-slate-600' },
  repaired: { label: 'Onarıldı', cls: 'bg-purple-100 text-purple-700' },
  scrapped: { label: 'Hurdaya Ayrıldı', cls: 'bg-red-100 text-red-600' },
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-400 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  )
}

function TreadBadge({ depth }) {
  if (depth == null) return <span className="text-slate-400">—</span>
  const d = parseFloat(depth)
  const cls = d < 1.6 ? 'text-red-600 font-bold' : d < 3 ? 'text-amber-500 font-semibold' : 'text-green-600 font-semibold'
  const warn = d < 1.6 ? ' ⚠ Yasal sınır altı!' : d < 3 ? ' ⚠ Yakında değişim' : ''
  return <span className={`text-sm ${cls}`}>{d} mm{warn}</span>
}

export default function TireDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [editModal, setEditModal] = useState(false)
  const [histModal, setHistModal] = useState(false)

  const { data: tire, isLoading } = useQuery({
    queryKey: ['tire', id],
    queryFn: () => getTire(id),
  })
  const { data: vehiclesData } = useQuery({ queryKey: ['vehicles-all'], queryFn: () => getVehicles({ limit: 200 }) })

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit } = useForm()
  const { register: regHist, handleSubmit: handleHistSubmit, reset: resetHist, watch: watchHistAction } = useForm({ defaultValues: { action: 'inspected' } })
  const histAction = watchHistAction('action')

  const openEdit = () => {
    resetEdit({
      brand: tire.brand,
      model: tire.model || '',
      size: tire.size || '',
      serial_no: tire.serial_no || '',
      type: tire.type || 'all_season',
      status: tire.status || 'storage',
      position: tire.position || 'storage',
      vehicle_id: tire.vehicle_id || '',
      purchase_date: tire.purchase_date ? tire.purchase_date.split('T')[0] : '',
      purchase_price: tire.purchase_price || '',
      installed_date: tire.installed_date ? tire.installed_date.split('T')[0] : '',
      installed_km: tire.installed_km || '',
      current_km: tire.current_km || '',
      tread_depth: tire.tread_depth || '',
      pressure: tire.pressure || '',
      notes: tire.notes || '',
    })
    setEditModal(true)
  }

  const onEdit = (data) => {
    updateTire(id, data)
      .then(() => {
        toast.success('Lastik güncellendi.')
        setEditModal(false)
        qc.invalidateQueries({ queryKey: ['tire', id] })
        qc.invalidateQueries({ queryKey: ['tires'] })
        qc.invalidateQueries({ queryKey: ['tire-stats'] })
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
  }

  const onAddHistory = (data) => {
    addTireHistory(id, data)
      .then(() => {
        toast.success('İşlem kaydedildi.')
        setHistModal(false)
        resetHist()
        qc.invalidateQueries({ queryKey: ['tire', id] })
        qc.invalidateQueries({ queryKey: ['tires'] })
        qc.invalidateQueries({ queryKey: ['tire-stats'] })
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
  }

  const handleDelete = () => {
    if (window.confirm('Bu lastik kaydını silmek istediğinizden emin misiniz?')) {
      deleteTire(id)
        .then(() => { toast.success('Lastik silindi.'); navigate('/tires') })
        .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
    }
  }

  if (isLoading) return <PageLoader />
  if (!tire) return <div className="text-center py-20 text-slate-400">Lastik bulunamadı.</div>

  const vehicles = vehiclesData?.data || vehiclesData || []
  const history = tire.history || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tires')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Lastik Listesi
        </button>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => { resetHist({ action: 'inspected' }); setHistModal(true) }} className="btn-secondary flex items-center gap-2">
              <Plus size={14} /> İşlem Ekle
            </button>
            <button onClick={openEdit} className="btn-secondary flex items-center gap-2">
              <Pencil size={14} /> Düzenle
            </button>
            <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
              <Trash2 size={14} /> Sil
            </button>
          </div>
        )}
      </div>

      {/* Başlık */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-3 rounded-xl">
            <Circle size={24} className="text-slate-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">{tire.brand} {tire.model || ''}</h1>
              {tire.size && <span className="badge bg-slate-100 text-slate-600">{tire.size}</span>}
              <span className={`badge ${STATUS_MAP[tire.status]?.cls}`}>{STATUS_MAP[tire.status]?.label}</span>
              <span className="badge bg-blue-50 text-blue-700">{TYPE_MAP[tire.type]}</span>
            </div>
            <div className="flex gap-4 mt-1 text-sm text-slate-500">
              {tire.plate_no && (
                <span>
                  Araç: <Link to={`/vehicles/${tire.vehicle_id}`} className="text-blue-600 hover:underline font-medium">{tire.plate_no}</Link>
                  {' '}{tire.vehicle_brand} {tire.vehicle_model}
                </span>
              )}
              {tire.position && tire.position !== 'storage' && (
                <span>Pozisyon: <strong>{POSITION_MAP[tire.position]}</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lastik Bilgileri */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Lastik Bilgileri</h2>
          <InfoRow label="Seri No" value={tire.serial_no} />
          <InfoRow label="Ebat" value={tire.size} />
          <InfoRow label="Tip" value={TYPE_MAP[tire.type]} />
          <InfoRow label="Alış Tarihi" value={tire.purchase_date ? format(new Date(tire.purchase_date), 'dd MMMM yyyy', { locale: tr }) : null} />
          <InfoRow label="Alış Fiyatı" value={tire.purchase_price ? `₺${parseFloat(tire.purchase_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : null} />
        </div>

        {/* Mevcut Durum */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Mevcut Durum</h2>
          <div className="py-2 border-b border-slate-100">
            <span className="text-sm text-slate-400 block mb-1">Diş Derinliği</span>
            <TreadBadge depth={tire.tread_depth} />
          </div>
          <InfoRow label="Basınç" value={tire.pressure ? `${tire.pressure} bar` : null} />
          <InfoRow label="Mevcut KM" value={tire.current_km ? `${parseInt(tire.current_km).toLocaleString('tr-TR')} km` : null} />
          <InfoRow label="Montaj Tarihi" value={tire.installed_date ? format(new Date(tire.installed_date), 'dd MMMM yyyy', { locale: tr }) : null} />
          <InfoRow label="Montaj KM" value={tire.installed_km ? `${parseInt(tire.installed_km).toLocaleString('tr-TR')} km` : null} />
          {tire.installed_km && tire.current_km && (
            <div className="py-2 border-b border-slate-100">
              <span className="text-sm text-slate-400">Kat Edilen KM</span>
              <span className="text-sm text-slate-700 font-medium ml-4">{(parseInt(tire.current_km) - parseInt(tire.installed_km)).toLocaleString('tr-TR')} km</span>
            </div>
          )}
          {tire.notes && (
            <div className="pt-2 mt-1">
              <p className="text-sm text-slate-400 mb-1">Notlar</p>
              <p className="text-sm text-slate-700">{tire.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Geçmiş */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">İşlem Geçmişi</h2>
          {canEdit && (
            <button onClick={() => { resetHist({ action: 'inspected' }); setHistModal(true) }} className="btn-secondary text-sm flex items-center gap-1">
              <Plus size={13} /> İşlem Ekle
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Henüz işlem geçmişi yok.</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className={`badge mt-0.5 shrink-0 ${ACTION_MAP[h.action]?.cls}`}>{ACTION_MAP[h.action]?.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-slate-700">
                      {h.action_date ? format(new Date(h.action_date), 'dd MMMM yyyy', { locale: tr }) : '—'}
                    </span>
                    {h.plate_no && <span className="text-xs text-slate-500">Araç: {h.plate_no}</span>}
                    {(h.from_position || h.to_position) && (
                      <span className="text-xs text-slate-500">
                        {h.from_position && POSITION_MAP[h.from_position]} {h.from_position && h.to_position && '→'} {h.to_position && POSITION_MAP[h.to_position]}
                      </span>
                    )}
                    {h.km_at_action && <span className="text-xs text-slate-500">{parseInt(h.km_at_action).toLocaleString('tr-TR')} km</span>}
                    {h.tread_depth && <span className="text-xs text-slate-500">Diş: {h.tread_depth} mm</span>}
                    {h.pressure && <span className="text-xs text-slate-500">{h.pressure} bar</span>}
                  </div>
                  {h.notes && <p className="text-xs text-slate-400 mt-0.5">{h.notes}</p>}
                  {h.performed_by_name && <p className="text-xs text-slate-400">İşlemi yapan: {h.performed_by_name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Düzenle Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Lastik Bilgilerini Düzenle" size="xl">
        <form onSubmit={handleEdit(onEdit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Marka *</label><input {...regEdit('brand', { required: true })} className="input" /></div>
            <div><label className="label">Model</label><input {...regEdit('model')} className="input" /></div>
            <div><label className="label">Ebat</label><input {...regEdit('size')} className="input" placeholder="205/65 R16" /></div>
            <div><label className="label">Seri No</label><input {...regEdit('serial_no')} className="input" /></div>
            <div>
              <label className="label">Tip</label>
              <select {...regEdit('type')} className="input">
                <option value="all_season">4 Mevsim</option>
                <option value="summer">Yaz</option>
                <option value="winter">Kış</option>
              </select>
            </div>
            <div>
              <label className="label">Durum</label>
              <select {...regEdit('status')} className="input">
                <option value="storage">Depoda</option>
                <option value="active">Araçta</option>
                <option value="scrapped">Hurda</option>
              </select>
            </div>
            <div>
              <label className="label">Araç</label>
              <select {...regEdit('vehicle_id')} className="input">
                <option value="">—</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.brand} {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Pozisyon</label>
              <select {...regEdit('position')} className="input">
                <option value="storage">Depoda</option>
                <option value="front_left">Ön Sol</option>
                <option value="front_right">Ön Sağ</option>
                <option value="rear_left">Arka Sol</option>
                <option value="rear_right">Arka Sağ</option>
                <option value="spare">Yedek</option>
              </select>
            </div>
            <div><label className="label">Alış Tarihi</label><input {...regEdit('purchase_date')} type="date" className="input" /></div>
            <div><label className="label">Alış Fiyatı (₺)</label><input {...regEdit('purchase_price', { valueAsNumber: true })} type="number" step="0.01" className="input" /></div>
            <div><label className="label">Montaj Tarihi</label><input {...regEdit('installed_date')} type="date" className="input" /></div>
            <div><label className="label">Montaj KM</label><input {...regEdit('installed_km', { valueAsNumber: true })} type="number" className="input" /></div>
            <div><label className="label">Mevcut KM</label><input {...regEdit('current_km', { valueAsNumber: true })} type="number" className="input" /></div>
            <div><label className="label">Diş Derinliği (mm)</label><input {...regEdit('tread_depth', { valueAsNumber: true })} type="number" step="0.1" className="input" /></div>
            <div><label className="label">Basınç (bar)</label><input {...regEdit('pressure', { valueAsNumber: true })} type="number" step="0.1" className="input" /></div>
            <div className="col-span-2"><label className="label">Notlar</label><textarea {...regEdit('notes')} className="input" rows={2} /></div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center">Güncelle</button>
        </form>
      </Modal>

      {/* İşlem Ekle Modal */}
      <Modal isOpen={histModal} onClose={() => { setHistModal(false); resetHist() }} title="Lastik İşlemi Ekle" size="lg">
        <form onSubmit={handleHistSubmit(onAddHistory)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">İşlem Türü *</label>
              <select {...regHist('action', { required: true })} className="input">
                <option value="inspected">İnceleme / Ölçüm</option>
                <option value="installed">Araça Takıldı</option>
                <option value="removed">Araçtan Söküldü</option>
                <option value="rotated">Rotasyon Yapıldı</option>
                <option value="repaired">Onarım Yapıldı</option>
                <option value="scrapped">Hurdaya Ayrıldı</option>
              </select>
            </div>
            <div>
              <label className="label">Tarih *</label>
              <input {...regHist('action_date', { required: true })} type="date" className="input" />
            </div>

            {(histAction === 'installed' || histAction === 'rotated') && (
              <div>
                <label className="label">Araç</label>
                <select {...regHist('vehicle_id')} className="input">
                  <option value="">Seçin</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.brand} {v.model}</option>)}
                </select>
              </div>
            )}
            {histAction === 'rotated' && (
              <div>
                <label className="label">Önceki Pozisyon</label>
                <select {...regHist('from_position')} className="input">
                  <option value="">—</option>
                  {Object.entries(POSITION_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            {(histAction === 'installed' || histAction === 'rotated') && (
              <div>
                <label className="label">Yeni Pozisyon</label>
                <select {...regHist('to_position')} className="input">
                  <option value="">—</option>
                  {Object.entries(POSITION_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">KM</label>
              <input {...regHist('km_at_action', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Diş Derinliği (mm)</label>
              <input {...regHist('tread_depth', { valueAsNumber: true })} type="number" step="0.1" className="input" />
            </div>
            <div>
              <label className="label">Basınç (bar)</label>
              <input {...regHist('pressure', { valueAsNumber: true })} type="number" step="0.1" className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Notlar</label>
              <textarea {...regHist('notes')} className="input" rows={2} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center">Kaydet</button>
        </form>
      </Modal>
    </div>
  )
}
