import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getFaults, createFault, getVehicles, getDrivers, getAssignments } from '../services/api'
import { PageLoader, EmptyState } from '../components/ui/Common'
import { StatusBadge, SeverityBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

export default function FaultsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')

  const { data: faults, isLoading } = useQuery({
    queryKey: ['faults', statusFilter, severityFilter, vehicleFilter],
    queryFn: () => getFaults({
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
      vehicle_id: vehicleFilter || undefined,
    }),
  })
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => getVehicles() })
  const { data: drivers } = useQuery({ queryKey: ['drivers'], queryFn: () => getDrivers() })
  const { data: activeAssignments } = useQuery({
    queryKey: ['assignments-active'],
    queryFn: () => getAssignments({ status: 'active' }),
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { severity: 'medium', reported_date: format(new Date(), 'yyyy-MM-dd') }
  })

  // Araç seçilince zimmetli sürücüyü otomatik doldur
  const selectedVehicleId = watch('vehicle_id')
  useEffect(() => {
    if (!selectedVehicleId || !activeAssignments) return
    const assignment = activeAssignments.find(a => a.vehicle_id === parseInt(selectedVehicleId))
    if (assignment) setValue('reported_by_driver_id', assignment.driver_id)
    else setValue('reported_by_driver_id', '')
  }, [selectedVehicleId, activeAssignments])

  const createMutation = useMutation({
    mutationFn: createFault,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faults'] }); setModalOpen(false); reset(); toast.success('Arıza kaydı oluşturuldu.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Arıza Takibi</h1>
          <p className="text-sm text-slate-500">{faults?.length || 0} arıza kaydı</p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Arıza Bildir
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Araçlar</option>
          {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Durumlar</option>
          <option value="open">Açık</option>
          <option value="in_progress">İşlemde</option>
          <option value="resolved">Çözüldü</option>
          <option value="cancelled">İptal</option>
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Önem Seviyeleri</option>
          <option value="critical">Kritik</option>
          <option value="high">Yüksek</option>
          <option value="medium">Orta</option>
          <option value="low">Düşük</option>
        </select>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Araç</th>
                <th>Başlık</th>
                <th>Kategori</th>
                <th>Önem</th>
                <th>Bildiren</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!faults?.length ? (
                <tr><td colSpan={8}><EmptyState icon={AlertTriangle} title="Arıza kaydı bulunamadı" /></td></tr>
              ) : faults.map(f => (
                <tr key={f.id}>
                  <td>{format(new Date(f.reported_date), 'dd.MM.yyyy')}</td>
                  <td className="font-medium">{f.plate_no} <span className="text-slate-400 font-normal">{f.brand}</span></td>
                  <td className="max-w-xs truncate">{f.title}</td>
                  <td className="capitalize">{f.category || '—'}</td>
                  <td><SeverityBadge severity={f.severity} /></td>
                  <td>{f.reported_by_name || '—'}</td>
                  <td><StatusBadge status={f.status} /></td>
                  <td>
                    <Link to={`/faults/${f.id}`} className="btn-secondary text-xs py-1">Detay</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Arıza Bildir Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); reset() }} title="Arıza Bildir" size="lg">
        <form onSubmit={handleSubmit(createMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Araç *</label>
              <select {...register('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Bildiren Sürücü</label>
              <select {...register('reported_by_driver_id', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                {drivers?.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Başlık *</label>
              <input {...register('title', { required: true })} className="input" />
            </div>
            <div>
              <label className="label">Kategori</label>
              <select {...register('category')} className="input">
                <option value="">Seçin</option>
                <option value="engine">Motor</option>
                <option value="transmission">Şanzıman</option>
                <option value="electrical">Elektrik</option>
                <option value="brakes">Frenler</option>
                <option value="suspension">Süspansiyon</option>
                <option value="tires">Lastikler</option>
                <option value="bodywork">Kaporta</option>
                <option value="ac">Klima</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="label">Önem Seviyesi</label>
              <select {...register('severity')} className="input">
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
            <div>
              <label className="label">Bildirim Tarihi</label>
              <input {...register('reported_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">KM (Arıza Anı)</label>
              <input {...register('km_at_fault', { valueAsNumber: true })} type="number" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Açıklama *</label>
            <textarea {...register('description', { required: true })} className="input" rows={3} />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
            {createMutation.isPending ? 'Kaydediliyor...' : 'Arıza Bildir'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
