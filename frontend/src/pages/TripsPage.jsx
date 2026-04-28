import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Navigation, CheckCircle, Trash2, BarChart2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { getTrips, getTripStats, createTrip, returnTrip, deleteTrip, getVehicles, getDrivers, getAssignments } from '../services/api'
import { PageLoader, EmptyState, ConfirmDialog, StatCard } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const today = format(new Date(), 'yyyy-MM-dd')
const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd')

export default function TripsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canDelete = ['admin', 'manager'].includes(user?.role)

  const [newModal, setNewModal] = useState(false)
  const [returnModal, setReturnModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(monthEnd)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['trips', vehicleFilter, driverFilter, statusFilter, startDate, endDate, page],
    queryFn: () => getTrips({
      vehicle_id: vehicleFilter || undefined,
      driver_id: driverFilter || undefined,
      status: statusFilter || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page,
      limit: 50,
    }),
  })

  const { data: stats } = useQuery({
    queryKey: ['trip-stats', vehicleFilter, driverFilter, startDate, endDate],
    queryFn: () => getTripStats({
      vehicle_id: vehicleFilter || undefined,
      driver_id: driverFilter || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
  })

  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => getVehicles() })
  const { data: drivers } = useQuery({ queryKey: ['drivers'], queryFn: () => getDrivers() })
  const { data: activeAssignments } = useQuery({
    queryKey: ['assignments-active'],
    queryFn: () => getAssignments({ status: 'active' }),
  })

  const { register: regN, handleSubmit: handleN, reset: resetN, watch: watchN, setValue: setValueN } = useForm({
    defaultValues: { date: today, departure_time: format(new Date(), 'HH:mm') }
  })
  const { register: regR, handleSubmit: handleR } = useForm({
    defaultValues: { return_time: format(new Date(), 'HH:mm') }
  })

  // Araç seçilince zimmetli sürücüyü otomatik doldur
  const selectedVehicleIdN = watchN('vehicle_id')
  useEffect(() => {
    if (!selectedVehicleIdN || !activeAssignments) return
    const assignment = activeAssignments.find(a => a.vehicle_id === parseInt(selectedVehicleIdN))
    if (assignment) setValueN('driver_id', assignment.driver_id)
    else setValueN('driver_id', '')
  }, [selectedVehicleIdN, activeAssignments])

  const createMutation = useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['trip-stats'] })
      setNewModal(false); resetN()
      toast.success('Sefer kaydı açıldı.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const returnMutation = useMutation({
    mutationFn: ({ id, data }) => returnTrip(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['trip-stats'] })
      setReturnModal(null)
      toast.success('Dönüş kaydı tamamlandı.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTrip,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['trip-stats'] })
      setDeleteId(null)
      toast.success('Kayıt silindi.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const totalKm = parseInt(stats?.total_km || 0)
  const avgKm = parseFloat(stats?.avg_km_per_trip || 0).toFixed(1)
  const totalTrips = parseInt(stats?.total_trips || 0)
  const openTrips = data?.data?.filter(t => t.status === 'open').length || 0

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sefer Defteri</h1>
          <p className="text-sm text-slate-500">Günlük araç kullanım ve KM takibi</p>
        </div>
        <button className="btn-primary" onClick={() => setNewModal(true)}>
          <Plus size={16} /> Sefer Başlat
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Toplam Sefer" value={totalTrips} icon={Navigation} color="blue" />
        <StatCard title="Toplam KM" value={`${totalKm.toLocaleString('tr-TR')} km`} icon={BarChart2} color="green" />
        <StatCard title="Ortalama KM/Sefer" value={`${avgKm} km`} icon={BarChart2} color="purple" />
        <StatCard title="Açık Sefer" value={openTrips} icon={Navigation} color="amber" />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="input w-auto"
        />
        <span className="text-slate-400 text-sm">—</span>
        <input
          type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
          className="input w-auto"
        />
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Araçlar</option>
          {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
        </select>
        <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Sürücüler</option>
          {drivers?.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Durumlar</option>
          <option value="open">Seferde</option>
          <option value="completed">Tamamlandı</option>
        </select>
      </div>

      {/* Tablo */}
      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Araç</th>
                <th>Sürücü</th>
                <th>Görev / Amaç</th>
                <th>Çıkış KM</th>
                <th>Çıkış Saati</th>
                <th>Dönüş KM</th>
                <th>Dönüş Saati</th>
                <th className="text-center">Toplam KM</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!data?.data?.length ? (
                <tr><td colSpan={11}><EmptyState icon={Navigation} title="Sefer kaydı bulunamadı" description="Sefer başlat butonuna basarak yeni kayıt oluşturun." /></td></tr>
              ) : data.data.map(t => (
                <tr key={t.id} className={t.status === 'open' ? 'bg-amber-50/40' : ''}>
                  <td className="font-medium">{format(new Date(t.date), 'dd.MM.yyyy')}</td>
                  <td>
                    <span className="font-medium">{t.plate_no}</span>
                    <span className="text-slate-400 text-xs ml-1">{t.brand}</span>
                  </td>
                  <td>{t.driver_name || <span className="text-slate-300">—</span>}</td>
                  <td className="max-w-[160px] truncate text-slate-600">{t.purpose || <span className="text-slate-300">—</span>}</td>
                  <td className="font-mono">{t.departure_km?.toLocaleString('tr-TR')}</td>
                  <td>{t.departure_time?.slice(0, 5) || '—'}</td>
                  <td className="font-mono">{t.return_km ? t.return_km.toLocaleString('tr-TR') : <span className="text-slate-300">—</span>}</td>
                  <td>{t.return_time?.slice(0, 5) || '—'}</td>
                  <td className="text-center">
                    {t.total_km != null ? (
                      <span className="font-semibold text-green-700">{parseInt(t.total_km).toLocaleString('tr-TR')} km</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td>
                    {t.status === 'open'
                      ? <span className="badge bg-amber-100 text-amber-700">Seferde</span>
                      : <span className="badge bg-green-100 text-green-700">Tamamlandı</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {t.status === 'open' && (
                        <button
                          onClick={() => setReturnModal(t)}
                          className="btn-success text-xs py-1 px-2"
                          title="Dönüş kaydı gir"
                        >
                          <CheckCircle size={13} /> Dön
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sayfalama */}
      {data?.total > 50 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">Önceki</button>
          <span className="btn text-slate-600 text-sm">{page} / {Math.ceil(data.total / 50)}</span>
          <button disabled={page * 50 >= data.total} onClick={() => setPage(p => p + 1)} className="btn-secondary">Sonraki</button>
        </div>
      )}

      {/* Günlük KM Özeti */}
      {stats?.daily?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Günlük KM Özeti (Son 30 gün)</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Tarih</th><th>Toplam KM</th></tr>
              </thead>
              <tbody>
                {stats.daily.map(d => (
                  <tr key={d.date}>
                    <td>{format(new Date(d.date), 'dd.MM.yyyy EEEE', { locale: undefined })}</td>
                    <td className="font-semibold text-green-700">{parseInt(d.daily_km).toLocaleString('tr-TR')} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sefer Başlat Modal */}
      <Modal isOpen={newModal} onClose={() => { setNewModal(false); resetN() }} title="Sefer Başlat" size="lg">
        <form onSubmit={handleN(createMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Araç *</label>
              <select {...regN('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {vehicles?.data?.filter(v => v.status === 'active').map(v => (
                  <option key={v.id} value={v.id}>{v.plate_no} - {v.brand} {v.model}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sürücü</label>
              <select {...regN('driver_id', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {drivers?.filter(d => d.status === 'active').map(d => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tarih *</label>
              <input {...regN('date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">Çıkış Saati</label>
              <input {...regN('departure_time')} type="time" className="input" />
            </div>
            <div className="col-span-2">
              <label className="label">Çıkış KM *</label>
              <input
                {...regN('departure_km', { required: 'Çıkış KM zorunlu', valueAsNumber: true, min: { value: 0, message: 'Geçersiz KM' } })}
                type="number"
                className="input text-lg font-mono"
                placeholder="Araç kilometre sayacını girin"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Görev / Amaç</label>
              <input {...regN('purpose')} className="input" placeholder="Örn: Müşteri ziyareti, Malzeme taşıma..." />
            </div>
            <div className="col-span-2">
              <label className="label">Notlar</label>
              <textarea {...regN('notes')} className="input" rows={2} />
            </div>
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
            {createMutation.isPending ? 'Kaydediliyor...' : 'Seferi Başlat'}
          </button>
        </form>
      </Modal>

      {/* Dönüş Kaydı Modal */}
      <Modal isOpen={!!returnModal} onClose={() => setReturnModal(null)} title="Dönüş Kaydı Gir">
        {returnModal && (
          <form onSubmit={handleR((d) => returnMutation.mutate({ id: returnModal.id, data: d }))} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
              <p><span className="text-slate-500">Araç:</span> <strong>{returnModal.plate_no} {returnModal.brand}</strong></p>
              <p><span className="text-slate-500">Sürücü:</span> <strong>{returnModal.driver_name || '—'}</strong></p>
              <p><span className="text-slate-500">Çıkış KM:</span> <strong className="font-mono">{returnModal.departure_km?.toLocaleString('tr-TR')}</strong></p>
              {returnModal.purpose && <p><span className="text-slate-500">Görev:</span> {returnModal.purpose}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Dönüş KM *</label>
                <input
                  {...regR('return_km', {
                    required: 'Dönüş KM zorunlu',
                    valueAsNumber: true,
                    min: { value: returnModal.departure_km, message: `En az ${returnModal.departure_km} olmalı` }
                  })}
                  type="number"
                  className="input text-lg font-mono"
                  placeholder="Araç kilometre sayacını girin"
                />
              </div>
              <div>
                <label className="label">Dönüş Saati</label>
                <input {...regR('return_time')} type="time" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Notlar</label>
              <textarea {...regR('notes')} className="input" rows={2} />
            </div>
            <button type="submit" disabled={returnMutation.isPending} className="btn-success w-full justify-center">
              {returnMutation.isPending ? 'Kaydediliyor...' : 'Dönüşü Tamamla'}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Sefer Kaydını Sil"
        message="Bu sefer kaydını silmek istediğinize emin misiniz?"
      />
    </div>
  )
}
