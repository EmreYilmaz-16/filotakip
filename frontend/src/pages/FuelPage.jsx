import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Fuel, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getFuelRecords, createFuelRecord, deleteFuelRecord, getVehicles, getDrivers, getAssignments } from '../services/api'
import { PageLoader, EmptyState, ConfirmDialog } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

export default function FuelPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-all', vehicleFilter, page],
    queryFn: () => getFuelRecords({ vehicle_id: vehicleFilter || undefined, page, limit: 30 }),
  })
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => getVehicles() })
  const { data: drivers } = useQuery({ queryKey: ['drivers'], queryFn: () => getDrivers() })
  const { data: activeAssignments } = useQuery({
    queryKey: ['assignments-active'],
    queryFn: () => getAssignments({ status: 'active' }),
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), is_full_tank: true }
  })

  // Otomatik toplam hesapla
  const liters = watch('liters')
  const unitPrice = watch('unit_price')
  const selectedVehicleId = watch('vehicle_id')

  useEffect(() => {
    const l = parseFloat(liters)
    const u = parseFloat(unitPrice)
    if (!isNaN(l) && !isNaN(u) && l > 0 && u > 0) {
      setValue('total_cost', parseFloat((l * u).toFixed(2)))
    }
  }, [liters, unitPrice])

  // Araç seçilince zimmetli sürücüyü otomatik doldur
  useEffect(() => {
    if (!selectedVehicleId || !activeAssignments) return
    const assignment = activeAssignments.find(a => a.vehicle_id === parseInt(selectedVehicleId))
    if (assignment) setValue('driver_id', assignment.driver_id)
    else setValue('driver_id', '')
  }, [selectedVehicleId, activeAssignments])

  const createMutation = useMutation({
    mutationFn: createFuelRecord,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fuel-all'] }); setModalOpen(false); reset(); toast.success('Yakıt kaydı eklendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteFuelRecord,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fuel-all'] }); setDeleteId(null); toast.success('Kayıt silindi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const totalCost = data?.data?.reduce((a, r) => a + parseFloat(r.total_cost || 0), 0) || 0
  const totalLiters = data?.data?.reduce((a, r) => a + parseFloat(r.liters || 0), 0) || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Yakıt Takibi</h1>
          <p className="text-sm text-slate-500">Tüm yakıt alım kayıtları</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Yakıt Kaydı Ekle
        </button>
      </div>

      {/* Filtre ve Özet */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input sm:w-56">
          <option value="">Tüm Araçlar</option>
          {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand} {v.model}</option>)}
        </select>
        <div className="flex gap-4 text-sm ml-auto">
          <span className="text-slate-500">Toplam: <strong className="text-slate-800">₺{totalCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</strong></span>
          <span className="text-slate-500">Toplam Litre: <strong className="text-slate-800">{totalLiters.toFixed(2)} L</strong></span>
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Araç</th>
                <th>Sürücü</th>
                <th>KM</th>
                <th>Yakıt Tipi</th>
                <th>Litre</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
                <th>İstasyon</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!data?.data?.length ? (
                <tr><td colSpan={10}><EmptyState icon={Fuel} title="Yakıt kaydı bulunamadı" /></td></tr>
              ) : data.data.map(r => (
                <tr key={r.id}>
                  <td>{format(new Date(r.date), 'dd.MM.yyyy')}</td>
                  <td className="font-medium">{r.plate_no}</td>
                  <td>{r.driver_name || '—'}</td>
                  <td>{parseInt(r.km_at_fuel).toLocaleString('tr-TR')}</td>
                  <td className="capitalize">{r.fuel_type}</td>
                  <td>{parseFloat(r.liters).toFixed(2)} L</td>
                  <td>₺{parseFloat(r.unit_price).toFixed(3)}</td>
                  <td className="font-medium">₺{parseFloat(r.total_cost).toFixed(2)}</td>
                  <td>{r.station_name || '—'}</td>
                  <td>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sayfalama */}
      {data?.total > 30 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">Önceki</button>
          <span className="btn text-slate-600 text-sm">{page} / {Math.ceil(data.total / 30)}</span>
          <button disabled={page * 30 >= data.total} onClick={() => setPage(p => p + 1)} className="btn-secondary">Sonraki</button>
        </div>
      )}

      {/* Ekle Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Yakıt Kaydı Ekle" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Araç *</label>
              <select {...register('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sürücü</label>
              <select {...register('driver_id', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {drivers?.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tarih *</label>
              <input {...register('date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">KM *</label>
              <input {...register('km_at_fuel', { required: true, valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Yakıt Tipi</label>
              <select {...register('fuel_type')} className="input">
                <option value="dizel">Dizel</option>
                <option value="benzin">Benzin</option>
                <option value="lpg">LPG</option>
              </select>
            </div>
            <div>
              <label className="label">Litre *</label>
              <input
                {...register('liters', { required: true, valueAsNumber: true })}
                type="number" step="0.01" className="input" placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Birim Fiyat (₺/L) *</label>
              <input
                {...register('unit_price', { required: true, valueAsNumber: true })}
                type="number" step="0.001" className="input" placeholder="0.000"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Toplam Tutar (₺)</label>
              <div className="relative">
                <input
                  {...register('total_cost', { required: true, valueAsNumber: true })}
                  type="number" step="0.01"
                  className="input bg-blue-50 font-semibold text-blue-800 cursor-default"
                  readOnly
                  placeholder="Litre × Birim Fiyat otomatik hesaplanır"
                />
                {liters > 0 && unitPrice > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500">
                    {parseFloat(liters).toFixed(2)} L × ₺{parseFloat(unitPrice).toFixed(3)}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="label">İstasyon</label>
              <input {...register('station_name')} className="input" />
            </div>
            <div>
              <label className="label">Fiş No</label>
              <input {...register('receipt_no')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Notlar</label>
            <textarea {...register('notes')} className="input" rows={2} />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
            {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Yakıt Kaydı Sil"
        message="Bu yakıt kaydını silmek istediğinize emin misiniz?"
      />
    </div>
  )
}
