import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Fuel, Wrench, AlertTriangle, FileText, MapPin, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  getVehicle, getFuelRecords, getMaintenanceRecords, getFaults,
  getDocuments, getAssignments, createFuelRecord, createDocument,
  createMaintenanceRecord, getMaintenanceTypes
} from '../services/api'
import { PageLoader, StatCard } from '../components/ui/Common'
import { StatusBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '../store/authStore'

const TABS = ['Genel', 'Yakıt', 'Bakım', 'Arızalar', 'Belgeler', 'Zimmet']

function FuelForm({ vehicleId, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') }
  })
  const mutation = useMutation({
    mutationFn: createFuelRecord,
    onSuccess: () => { toast.success('Yakıt kaydı eklendi.'); onSuccess() },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, vehicle_id: vehicleId }))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tarih *</label>
          <input {...register('date', { required: true })} type="date" className="input" />
        </div>
        <div>
          <label className="label">KM *</label>
          <input {...register('km_at_fuel', { required: true, valueAsNumber: true })} type="number" className="input" />
        </div>
        <div>
          <label className="label">Litre *</label>
          <input {...register('liters', { required: true, valueAsNumber: true })} type="number" step="0.01" className="input" />
        </div>
        <div>
          <label className="label">Birim Fiyat *</label>
          <input {...register('unit_price', { required: true, valueAsNumber: true })} type="number" step="0.001" className="input" />
        </div>
        <div>
          <label className="label">Toplam Tutar *</label>
          <input {...register('total_cost', { required: true, valueAsNumber: true })} type="number" step="0.01" className="input" />
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
          <label className="label">İstasyon</label>
          <input {...register('station_name')} className="input" />
        </div>
        <div>
          <label className="label">Fiş No</label>
          <input {...register('receipt_no')} className="input" />
        </div>
      </div>
      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full justify-center">
        {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}

function MaintenanceRecordForm({ vehicleId, onSuccess }) {
  const { data: types } = useQuery({ queryKey: ['maintenance-types'], queryFn: getMaintenanceTypes })
  const { register, handleSubmit } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') } })
  const mutation = useMutation({
    mutationFn: createMaintenanceRecord,
    onSuccess: () => { toast.success('Bakım kaydı eklendi.'); onSuccess() },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate({ ...d, vehicle_id: vehicleId }))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Tarih *</label>
          <input {...register('date', { required: true })} type="date" className="input" />
        </div>
        <div>
          <label className="label">KM *</label>
          <input {...register('km_at_maintenance', { required: true, valueAsNumber: true })} type="number" className="input" />
        </div>
        <div className="col-span-2">
          <label className="label">Bakım Tipi</label>
          <select {...register('maintenance_type_id', { valueAsNumber: true })} className="input">
            <option value="">Seçin</option>
            {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Açıklama</label>
          <textarea {...register('description')} className="input" rows={2} />
        </div>
        <div>
          <label className="label">Servis Adı</label>
          <input {...register('service_name')} className="input" />
        </div>
        <div>
          <label className="label">Fatura No</label>
          <input {...register('invoice_no')} className="input" />
        </div>
        <div>
          <label className="label">İşçilik (₺)</label>
          <input {...register('labor_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" defaultValue={0} />
        </div>
        <div>
          <label className="label">Parça (₺)</label>
          <input {...register('parts_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" defaultValue={0} />
        </div>
        <div>
          <label className="label">Toplam (₺)</label>
          <input {...register('total_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" defaultValue={0} />
        </div>
        <div>
          <label className="label">Sonraki Bakım KM</label>
          <input {...register('next_maintenance_km', { valueAsNumber: true })} type="number" className="input" />
        </div>
      </div>
      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full justify-center">
        {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}

export default function VehicleDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('Genel')
  const [fuelModal, setFuelModal] = useState(false)
  const [maintenanceModal, setMaintenanceModal] = useState(false)
  const qc = useQueryClient()

  const { data: vehicle, isLoading } = useQuery({ queryKey: ['vehicle', id], queryFn: () => getVehicle(id) })
  const { data: fuelRecords } = useQuery({ queryKey: ['fuel', id], queryFn: () => getFuelRecords({ vehicle_id: id }) })
  const { data: maintenanceRecords } = useQuery({ queryKey: ['maintenance', id], queryFn: () => getMaintenanceRecords({ vehicle_id: id }) })
  const { data: faults } = useQuery({ queryKey: ['faults', id], queryFn: () => getFaults({ vehicle_id: id }) })
  const { data: documents } = useQuery({ queryKey: ['documents', id], queryFn: () => getDocuments(id) })
  const { data: assignments } = useQuery({ queryKey: ['assignments', id], queryFn: () => getAssignments({ vehicle_id: id }) })

  if (isLoading) return <PageLoader />
  if (!vehicle) return <div className="card">Araç bulunamadı.</div>

  const totalFuelCost = fuelRecords?.data?.reduce((a, r) => a + parseFloat(r.total_cost || 0), 0) || 0
  const totalMaintenanceCost = maintenanceRecords?.data?.reduce((a, r) => a + parseFloat(r.total_cost || 0), 0) || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/vehicles" className="text-slate-500 hover:text-slate-700">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{vehicle.plate_no}</h1>
          <p className="text-sm text-slate-500">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Güncel KM" value={`${vehicle.current_km?.toLocaleString('tr-TR')} km`} icon={MapPin} color="blue" />
        <StatCard title="Toplam Yakıt Masrafı" value={`₺${totalFuelCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`} icon={Fuel} color="green" />
        <StatCard title="Toplam Bakım Masrafı" value={`₺${totalMaintenanceCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`} icon={Wrench} color="amber" />
        <StatCard title="Arıza Sayısı" value={faults?.total || 0} icon={AlertTriangle} color="red" />
      </div>

      {/* Sekmeler */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Genel */}
      {activeTab === 'Genel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <h3 className="font-semibold text-slate-700">Araç Bilgileri</h3>
            {[
              ['Plaka', vehicle.plate_no],
              ['Marka / Model', `${vehicle.brand} ${vehicle.model}`],
              ['Yıl', vehicle.year],
              ['Renk', vehicle.color || '—'],
              ['Yakıt Tipi', vehicle.fuel_type],
              ['Araç Tipi', vehicle.vehicle_type_name || '—'],
              ['Şasi No', vehicle.vin_no || '—'],
              ['Motor No', vehicle.engine_no || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-700 capitalize">{v}</span>
              </div>
            ))}
          </div>
          <div className="card space-y-3">
            <h3 className="font-semibold text-slate-700">Satın Alma</h3>
            {[
              ['Alış Tarihi', vehicle.purchase_date ? format(new Date(vehicle.purchase_date), 'dd MMM yyyy', { locale: tr }) : '—'],
              ['Alış Fiyatı', vehicle.purchase_price ? `₺${parseFloat(vehicle.purchase_price).toLocaleString('tr-TR')}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
            {vehicle.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Notlar</p>
                <p className="text-sm text-slate-700">{vehicle.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yakıt */}
      {activeTab === 'Yakıt' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setFuelModal(true)}>
              <Plus size={16} /> Yakıt Kaydı Ekle
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Tarih</th><th>KM</th><th>Litre</th><th>Birim Fiyat</th><th>Toplam</th><th>İstasyon</th></tr></thead>
              <tbody>
                {!fuelRecords?.data?.length ? (
                  <tr><td colSpan={6}><div className="py-8 text-center text-slate-400 text-sm">Yakıt kaydı yok</div></td></tr>
                ) : fuelRecords.data.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.date), 'dd.MM.yyyy')}</td>
                    <td>{parseInt(r.km_at_fuel).toLocaleString('tr-TR')} km</td>
                    <td>{parseFloat(r.liters).toFixed(2)} L</td>
                    <td>₺{parseFloat(r.unit_price).toFixed(3)}</td>
                    <td className="font-medium">₺{parseFloat(r.total_cost).toFixed(2)}</td>
                    <td>{r.station_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal isOpen={fuelModal} onClose={() => setFuelModal(false)} title="Yakıt Kaydı Ekle">
            <FuelForm vehicleId={parseInt(id)} onSuccess={() => { setFuelModal(false); qc.invalidateQueries({ queryKey: ['fuel', id] }) }} />
          </Modal>
        </div>
      )}

      {/* Bakım */}
      {activeTab === 'Bakım' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setMaintenanceModal(true)}>
              <Plus size={16} /> Bakım Kaydı Ekle
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Tarih</th><th>KM</th><th>Bakım Tipi</th><th>Servis</th><th>Toplam</th></tr></thead>
              <tbody>
                {!maintenanceRecords?.data?.length ? (
                  <tr><td colSpan={5}><div className="py-8 text-center text-slate-400 text-sm">Bakım kaydı yok</div></td></tr>
                ) : maintenanceRecords.data.map(r => (
                  <tr key={r.id}>
                    <td>{format(new Date(r.date), 'dd.MM.yyyy')}</td>
                    <td>{parseInt(r.km_at_maintenance).toLocaleString('tr-TR')} km</td>
                    <td>{r.maintenance_type_name || r.description?.slice(0, 30)}</td>
                    <td>{r.service_name || '—'}</td>
                    <td className="font-medium">₺{parseFloat(r.total_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Modal isOpen={maintenanceModal} onClose={() => setMaintenanceModal(false)} title="Bakım Kaydı Ekle" size="lg">
            <MaintenanceRecordForm vehicleId={parseInt(id)} onSuccess={() => { setMaintenanceModal(false); qc.invalidateQueries({ queryKey: ['maintenance', id] }) }} />
          </Modal>
        </div>
      )}

      {/* Arızalar */}
      {activeTab === 'Arızalar' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Tarih</th><th>Başlık</th><th>Tür</th><th>Önem</th><th>Durum</th></tr></thead>
            <tbody>
              {!faults?.data?.length ? (
                <tr><td colSpan={5}><div className="py-8 text-center text-slate-400 text-sm">Arıza kaydı yok</div></td></tr>
              ) : faults.data.map(f => (
                <tr key={f.id}>
                  <td>{format(new Date(f.reported_date), 'dd.MM.yyyy')}</td>
                  <td><Link to={`/faults/${f.id}`} className="text-blue-600 hover:underline">{f.title}</Link></td>
                  <td className="capitalize">{f.fault_type || '—'}</td>
                  <td>{f.severity}</td>
                  <td><StatusBadge status={f.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Belgeler */}
      {activeTab === 'Belgeler' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Belge Adı</th><th>Tür</th><th>Düzenleme</th><th>Bitiş</th><th>Sigorta Şirketi</th></tr></thead>
            <tbody>
              {!documents?.length ? (
                <tr><td colSpan={5}><div className="py-8 text-center text-slate-400 text-sm">Belge bulunamadı</div></td></tr>
              ) : documents.map(d => {
                const daysLeft = d.expiry_date ? Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000) : null
                return (
                  <tr key={d.id}>
                    <td>{d.document_name}</td>
                    <td className="capitalize">{d.document_type}</td>
                    <td>{d.issue_date ? format(new Date(d.issue_date), 'dd.MM.yyyy') : '—'}</td>
                    <td>
                      {d.expiry_date ? (
                        <span className={daysLeft < 0 ? 'text-red-600 font-medium' : daysLeft < 30 ? 'text-amber-600 font-medium' : ''}>
                          {format(new Date(d.expiry_date), 'dd.MM.yyyy')}
                          {daysLeft !== null && ` (${daysLeft < 0 ? `${Math.abs(daysLeft)} gün geçti` : `${daysLeft} gün`})`}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{d.insurance_company || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zimmet */}
      {activeTab === 'Zimmet' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Sürücü</th><th>Zimmet Tarihi</th><th>İade Tarihi</th><th>KM (Zimmet)</th><th>KM (İade)</th><th>Durum</th></tr></thead>
            <tbody>
              {!assignments?.length ? (
                <tr><td colSpan={6}><div className="py-8 text-center text-slate-400 text-sm">Zimmet kaydı yok</div></td></tr>
              ) : assignments.map(a => (
                <tr key={a.id}>
                  <td>{a.driver_name}</td>
                  <td>{format(new Date(a.assigned_date), 'dd.MM.yyyy')}</td>
                  <td>{a.return_date ? format(new Date(a.return_date), 'dd.MM.yyyy') : <span className="text-amber-600 font-medium">Devam ediyor</span>}</td>
                  <td>{a.km_at_assignment?.toLocaleString('tr-TR') || '—'}</td>
                  <td>{a.km_at_return?.toLocaleString('tr-TR') || '—'}</td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
