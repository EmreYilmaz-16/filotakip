import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench, CheckCircle, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  getMaintenanceSchedules, createMaintenanceSchedule, updateMaintenanceSchedule, deleteMaintenanceSchedule,
  getMaintenanceRecords, createMaintenanceRecord,
  getMaintenanceTypes, getVehicles
} from '../services/api'
import { PageLoader, EmptyState } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const TABS = ['Periyodik Planlar', 'Bakım Geçmişi']

export default function MaintenancePage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = ['admin', 'manager'].includes(user?.role)
  const [tab, setTab] = useState('Periyodik Planlar')
  const [scheduleModal, setScheduleModal] = useState(false)
  const [recordModal, setRecordModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editSchedule, setEditSchedule] = useState(null)
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const { data: schedules, isLoading: loadingS } = useQuery({
    queryKey: ['maintenance-schedules', vehicleFilter, overdueOnly],
    queryFn: () => getMaintenanceSchedules({ vehicle_id: vehicleFilter || undefined, overdue: overdueOnly ? 'true' : undefined }),
  })
  const { data: records, isLoading: loadingR } = useQuery({
    queryKey: ['maintenance-records-all', vehicleFilter],
    queryFn: () => getMaintenanceRecords({ vehicle_id: vehicleFilter || undefined }),
    enabled: tab === 'Bakım Geçmişi',
  })
  const { data: types } = useQuery({ queryKey: ['maintenance-types'], queryFn: getMaintenanceTypes })
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => getVehicles() })

  const { register: regS, handleSubmit: handleS, reset: resetS, watch: watchS, setValue: setValueS } = useForm()
  const { register: regE, handleSubmit: handleE, reset: resetE, watch: watchE, setValue: setValueE } = useForm()
  const { register: regR, handleSubmit: handleR, reset: resetR } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') }
  })

  const scheduleMutation = useMutation({
    mutationFn: createMaintenanceSchedule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-schedules'] }); setScheduleModal(false); resetS(); toast.success('Plan oluşturuldu.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, data }) => updateMaintenanceSchedule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-schedules'] }); setEditModal(false); resetE(); toast.success('Plan güncellendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const deleteScheduleMutation = useMutation({
    mutationFn: deleteMaintenanceSchedule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-schedules'] }); toast.success('Plan silindi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const recordMutation = useMutation({
    mutationFn: createMaintenanceRecord,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance-records-all'] }); qc.invalidateQueries({ queryKey: ['maintenance-schedules'] }); setRecordModal(false); resetR(); toast.success('Bakım kaydı eklendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  // Auto-calc: Ekle formu
  const sIntervalKm = watchS('interval_km')
  const sLastDoneKm = watchS('last_done_km')
  const sIntervalDays = watchS('interval_days')
  const sLastDoneDate = watchS('last_done_date')
  useEffect(() => {
    if (sIntervalKm && sLastDoneKm) setValueS('next_due_km', parseInt(sLastDoneKm) + parseInt(sIntervalKm))
  }, [sIntervalKm, sLastDoneKm])
  useEffect(() => {
    if (sIntervalDays && sLastDoneDate) {
      const d = new Date(sLastDoneDate)
      d.setDate(d.getDate() + parseInt(sIntervalDays))
      setValueS('next_due_date', d.toISOString().split('T')[0])
    }
  }, [sIntervalDays, sLastDoneDate])

  // Auto-calc: Düzenle formu
  const eIntervalKm = watchE('interval_km')
  const eLastDoneKm = watchE('last_done_km')
  const eIntervalDays = watchE('interval_days')
  const eLastDoneDate = watchE('last_done_date')
  useEffect(() => {
    if (eIntervalKm && eLastDoneKm) setValueE('next_due_km', parseInt(eLastDoneKm) + parseInt(eIntervalKm))
  }, [eIntervalKm, eLastDoneKm])
  useEffect(() => {
    if (eIntervalDays && eLastDoneDate) {
      const d = new Date(eLastDoneDate)
      d.setDate(d.getDate() + parseInt(eIntervalDays))
      setValueE('next_due_date', d.toISOString().split('T')[0])
    }
  }, [eIntervalDays, eLastDoneDate])

  const handleEditSchedule = (s) => {
    setEditSchedule(s)
    resetE({
      vehicle_id: s.vehicle_id,
      maintenance_type_id: s.maintenance_type_id || '',
      custom_name: s.custom_name || '',
      interval_km: s.interval_km || '',
      interval_days: s.interval_days || '',
      last_done_km: s.last_done_km || '',
      last_done_date: s.last_done_date ? s.last_done_date.split('T')[0] : '',
      next_due_km: s.next_due_km || '',
      next_due_date: s.next_due_date ? s.next_due_date.split('T')[0] : '',
      notes: s.notes || '',
    })
    setEditModal(true)
  }

  const handleDeleteSchedule = (id) => {
    if (window.confirm('Bu bakım planını silmek istediğinizden emin misiniz?')) {
      deleteScheduleMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bakım Takibi</h1>
          <p className="text-sm text-slate-500">Periyodik bakım planları ve geçmişi</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setScheduleModal(true)}>
              <Plus size={16} /> Plan Ekle
            </button>
            <button className="btn-primary" onClick={() => setRecordModal(true)}>
              <Plus size={16} /> Bakım Kaydı
            </button>
          </div>
        )}
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input sm:w-56">
          <option value="">Tüm Araçlar</option>
          {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
        </select>
        {tab === 'Periyodik Planlar' && (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="w-4 h-4 rounded" />
            Sadece gecikmiş / yaklaşanlar
          </label>
        )}
      </div>

      {/* Tab */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${t === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Periyodik Planlar */}
      {tab === 'Periyodik Planlar' && (
        loadingS ? <PageLoader /> : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Araç</th><th>Bakım Tipi</th><th>Son Yapıldı</th><th>Sonraki KM</th><th>Sonraki Tarih</th><th>Durum</th>{canEdit && <th></th>}</tr>
              </thead>
              <tbody>
                {!schedules?.length ? (
                  <tr><td colSpan={6}><EmptyState icon={Wrench} title="Bakım planı bulunamadı" /></td></tr>
                ) : schedules.map(s => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.plate_no} <span className="text-slate-400 font-normal">{s.brand}</span></td>
                    <td>{s.maintenance_type_name || s.custom_name || '—'}</td>
                    <td>
                      {s.last_done_date ? format(new Date(s.last_done_date), 'dd.MM.yyyy') : '—'}
                      {s.last_done_km ? ` / ${parseInt(s.last_done_km).toLocaleString()} km` : ''}
                    </td>
                    <td>{s.next_due_km ? `${parseInt(s.next_due_km).toLocaleString()} km` : '—'}</td>
                    <td>{s.next_due_date ? format(new Date(s.next_due_date), 'dd.MM.yyyy') : '—'}</td>
                    <td>
                      {s.is_overdue
                        ? <span className="badge bg-red-100 text-red-700">Gecikmiş</span>
                        : s.is_upcoming
                          ? <span className="badge bg-amber-100 text-amber-700">Yaklaşıyor</span>
                          : <span className="badge bg-green-100 text-green-700">Normal</span>
                      }
                    </td>
                    {canEdit && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => handleEditSchedule(s)} className="p-1 text-blue-600 hover:text-blue-800 rounded" title="Düzenle"><Pencil size={15} /></button>
                          <button onClick={() => handleDeleteSchedule(s.id)} className="p-1 text-red-500 hover:text-red-700 rounded" title="Sil"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Bakım Geçmişi */}
      {tab === 'Bakım Geçmişi' && (
        loadingR ? <PageLoader /> : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Tarih</th><th>Araç</th><th>Bakım Tipi</th><th>KM</th><th>Servis</th><th>İşçilik</th><th>Parça</th><th>Toplam</th></tr>
              </thead>
              <tbody>
                {!records?.data?.length ? (
                  <tr><td colSpan={8}><EmptyState icon={Wrench} title="Bakım kaydı bulunamadı" /></td></tr>
                ) : records.data.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.date), 'dd.MM.yyyy')}</td>
                    <td className="font-medium">{r.plate_no}</td>
                    <td>{r.maintenance_type_name || r.description?.slice(0, 30) || '—'}</td>
                    <td>{parseInt(r.km_at_maintenance).toLocaleString()} km</td>
                    <td>{r.service_name || '—'}</td>
                    <td>₺{parseFloat(r.labor_cost || 0).toFixed(2)}</td>
                    <td>₺{parseFloat(r.parts_cost || 0).toFixed(2)}</td>
                    <td className="font-medium">₺{parseFloat(r.total_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Plan Ekle Modal */}
      <Modal isOpen={scheduleModal} onClose={() => setScheduleModal(false)} title="Periyodik Bakım Planı Ekle" size="lg">
        <form onSubmit={handleS(scheduleMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Araç *</label>
              <select {...regS('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bakım Tipi</label>
              <select {...regS('maintenance_type_id', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Özel İsim</label>
              <input {...regS('custom_name')} className="input" placeholder="Bakım tipini seçmediyseniz" />
            </div>
            <div>
              <label className="label">Aralık (KM)</label>
              <input {...regS('interval_km', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Aralık (Gün)</label>
              <input {...regS('interval_days', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Son Yapıldı (KM)</label>
              <input {...regS('last_done_km', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Son Yapıldı (Tarih)</label>
              <input {...regS('last_done_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Sonraki Bakım (KM) <span className="text-slate-400 font-normal text-xs">otomatik hesaplanır</span></label>
              <input {...regS('next_due_km', { valueAsNumber: true })} type="number" className="input bg-blue-50 text-blue-800 font-semibold" placeholder="Aralık KM + Son KM" />
            </div>
            <div>
              <label className="label">Sonraki Bakım (Tarih) <span className="text-slate-400 font-normal text-xs">otomatik hesaplanır</span></label>
              <input {...regS('next_due_date')} type="date" className="input bg-blue-50 text-blue-800 font-semibold" />
            </div>
          </div>
          <button type="submit" disabled={scheduleMutation.isPending} className="btn-primary w-full justify-center">
            {scheduleMutation.isPending ? 'Kaydediliyor...' : 'Plan Oluştur'}
          </button>
        </form>
      </Modal>

      {/* Plan Düzenle Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Bakım Planını Düzenle" size="lg">
        <form onSubmit={handleE((data) => updateScheduleMutation.mutate({ id: editSchedule?.id, data }))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Araç *</label>
              <select {...regE('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bakım Tipi</label>
              <select {...regE('maintenance_type_id', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Özel İsim</label>
              <input {...regE('custom_name')} className="input" placeholder="Bakım tipini seçmediyseniz" />
            </div>
            <div>
              <label className="label">Aralık (KM)</label>
              <input {...regE('interval_km', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Aralık (Gün)</label>
              <input {...regE('interval_days', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Son Yapıldı (KM)</label>
              <input {...regE('last_done_km', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Son Yapıldı (Tarih)</label>
              <input {...regE('last_done_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Sonraki Bakım (KM) <span className="text-slate-400 font-normal text-xs">otomatik hesaplanır</span></label>
              <input {...regE('next_due_km', { valueAsNumber: true })} type="number" className="input bg-blue-50 text-blue-800 font-semibold" />
            </div>
            <div>
              <label className="label">Sonraki Bakım (Tarih) <span className="text-slate-400 font-normal text-xs">otomatik hesaplanır</span></label>
              <input {...regE('next_due_date')} type="date" className="input bg-blue-50 text-blue-800 font-semibold" />
            </div>
          </div>
          <button type="submit" disabled={updateScheduleMutation.isPending} className="btn-primary w-full justify-center">
            {updateScheduleMutation.isPending ? 'Kaydediliyor...' : 'Güncelle'}
          </button>
        </form>
      </Modal>

      {/* Bakım Kaydı Ekle Modal */}
      <Modal isOpen={recordModal} onClose={() => setRecordModal(false)} title="Bakım Kaydı Ekle" size="lg">
        <form onSubmit={handleR(recordMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Araç *</label>
              <select {...regR('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bakım Tipi</label>
              <select {...regR('maintenance_type_id', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tarih *</label>
              <input {...regR('date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">KM *</label>
              <input {...regR('km_at_maintenance', { required: true, valueAsNumber: true })} type="number" className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Açıklama</label>
              <textarea {...regR('description')} className="input" rows={2} />
            </div>
            <div>
              <label className="label">Servis</label>
              <input {...regR('service_name')} className="input" />
            </div>
            <div>
              <label className="label">Fatura No</label>
              <input {...regR('invoice_no')} className="input" />
            </div>
            <div>
              <label className="label">İşçilik (₺)</label>
              <input {...regR('labor_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" defaultValue={0} />
            </div>
            <div>
              <label className="label">Parça (₺)</label>
              <input {...regR('parts_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" defaultValue={0} />
            </div>
            <div>
              <label className="label">Toplam (₺)</label>
              <input {...regR('total_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" defaultValue={0} />
            </div>
            <div>
              <label className="label">Sonraki Bakım KM</label>
              <input {...regR('next_maintenance_km', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Sonraki Bakım Tarihi</label>
              <input {...regR('next_maintenance_date')} type="date" className="input" />
            </div>
          </div>
          <button type="submit" disabled={recordMutation.isPending} className="btn-primary w-full justify-center">
            {recordMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
