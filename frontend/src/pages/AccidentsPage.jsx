import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { ShieldAlert, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  getAccidents, getAccidentStats, createAccident, deleteAccident,
} from '../services/api'
import { getVehicles } from '../services/api'
import { getDrivers } from '../services/api'
import { PageLoader, StatCard, EmptyState } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const ACCIDENT_TYPE_MAP = {
  rear_end: 'Arkadan Çarpma', side_impact: 'Yandan Çarpma', head_on: 'Kafa Kafaya',
  rollover: 'Devrilme', parking: 'Park Kazası', animal: 'Hayvan Çarpması', other: 'Diğer',
}
const FAULT_MAP = {
  our_fault: 'Bizim Kusurumuz', third_party_fault: 'Karşı Taraf', shared: 'Ortak Kusur', unknown: 'Bilinmiyor',
}
const STATUS_MAP = {
  open: { label: 'Açık', cls: 'bg-red-100 text-red-700' },
  in_repair: { label: 'Onarımda', cls: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Kapatıldı', cls: 'bg-green-100 text-green-700' },
}
const CLAIM_STATUS_MAP = {
  not_filed: { label: 'Dosya Açılmadı', cls: 'bg-slate-100 text-slate-600' },
  pending: { label: 'Beklemede', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Onaylandı', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Reddedildi', cls: 'bg-red-100 text-red-700' },
  settled: { label: 'Tazminat Ödendi', cls: 'bg-blue-100 text-blue-700' },
}

const DAMAGE_AREAS = ['Ön', 'Arka', 'Sağ', 'Sol', 'Tavan', 'Alt', 'Motor', 'Cam']

export default function AccidentsPage() {
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const qc = useQueryClient()

  const [addModal, setAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data: stats } = useQuery({ queryKey: ['accident-stats'], queryFn: getAccidentStats })
  const { data: accidents, isLoading } = useQuery({
    queryKey: ['accidents', statusFilter],
    queryFn: () => getAccidents({ status: statusFilter || undefined, limit: 100 }),
  })
  const { data: vehicles } = useQuery({ queryKey: ['vehicles-all'], queryFn: () => getVehicles({ limit: 200 }) })
  const { data: drivers } = useQuery({ queryKey: ['drivers-all'], queryFn: () => getDrivers({ limit: 200 }) })

  const { register, handleSubmit, reset, watch, setValue } = useForm()
  const selectedDamageAreas = watch('damage_areas_check') || {}

  const onSubmit = (data) => {
    const areas = DAMAGE_AREAS.filter((_, i) => data.damage_areas_check?.[i])
    const payload = { ...data, damage_areas: areas }
    delete payload.damage_areas_check
    createAccident(payload)
      .then(() => {
        toast.success('Kaza kaydı oluşturuldu.')
        setAddModal(false)
        reset()
        qc.invalidateQueries({ queryKey: ['accidents'] })
        qc.invalidateQueries({ queryKey: ['accident-stats'] })
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
  }

  const handleDelete = (id) => {
    if (window.confirm('Bu kaza kaydını silmek istediğinizden emin misiniz?')) {
      deleteAccident(id)
        .then(() => {
          toast.success('Kaza kaydı silindi.')
          qc.invalidateQueries({ queryKey: ['accidents'] })
          qc.invalidateQueries({ queryKey: ['accident-stats'] })
        })
        .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
    }
  }

  const vehicleList = vehicles?.data || vehicles || []
  const driverList = drivers?.data || drivers || []
  const accidentList = accidents?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kaza / Hasar Kayıtları</h1>
          <p className="text-sm text-slate-500">Araç kaza ve hasar takibi</p>
        </div>
        {canEdit && (
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Kaza Kaydı Ekle
          </button>
        )}
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Toplam Kaza" value={stats?.total || 0} icon={ShieldAlert} color="slate" />
        <StatCard title="Açık Dosyalar" value={stats?.open || 0} icon={ShieldAlert} color={stats?.open > 0 ? 'red' : 'slate'} />
        <StatCard title="Bu Ay" value={stats?.this_month || 0} icon={ShieldAlert} color="amber" />
        <StatCard
          title="Bu Yıl Onarım"
          value={`₺${(stats?.annual_cost || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
          icon={ShieldAlert}
          color="red"
        />
      </div>

      {/* Filtre */}
      <div className="flex gap-2">
        {['', 'open', 'in_repair', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            {s === '' ? 'Tümü' : STATUS_MAP[s]?.label}
          </button>
        ))}
      </div>

      {/* Tablo */}
      {isLoading ? <PageLoader /> : accidentList.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShieldAlert} title="Kaza kaydı bulunamadı" description="Henüz kaza kaydı eklenmemiş." />
        </div>
      ) : (
        <div className="card overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Araç</th>
                <th>Sürücü</th>
                <th>Tür</th>
                <th>Kusur</th>
                <th>Sigorta</th>
                <th>Durum</th>
                <th>Onarım Maliyeti</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accidentList.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-sm">
                    {a.accident_date ? format(new Date(a.accident_date), 'dd MMM yyyy', { locale: tr }) : '—'}
                  </td>
                  <td>
                    <Link to={`/vehicles/${a.vehicle_id}`} className="font-medium text-blue-600 hover:underline">
                      {a.plate_no}
                    </Link>
                    <p className="text-xs text-slate-400">{a.brand} {a.model}</p>
                  </td>
                  <td className="text-sm">{a.driver_name || '—'}</td>
                  <td className="text-sm">{ACCIDENT_TYPE_MAP[a.accident_type] || a.accident_type}</td>
                  <td>
                    <span className={`badge ${
                      a.fault === 'our_fault' ? 'bg-red-100 text-red-700' :
                      a.fault === 'third_party_fault' ? 'bg-green-100 text-green-700' :
                      a.fault === 'shared' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {FAULT_MAP[a.fault] || a.fault}
                    </span>
                  </td>
                  <td>
                    {a.claim_status && (
                      <span className={`badge ${CLAIM_STATUS_MAP[a.claim_status]?.cls}`}>
                        {CLAIM_STATUS_MAP[a.claim_status]?.label}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_MAP[a.status]?.cls}`}>
                      {STATUS_MAP[a.status]?.label}
                    </span>
                  </td>
                  <td className="text-sm font-medium">
                    {a.repair_cost ? `₺${parseFloat(a.repair_cost).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Link to={`/accidents/${a.id}`} className="p-1 text-slate-500 hover:text-blue-600 rounded" title="Detay">
                        <Eye size={15} />
                      </Link>
                      {canEdit && (
                        <button onClick={() => handleDelete(a.id)} className="p-1 text-red-400 hover:text-red-600 rounded" title="Sil">
                          <Trash2 size={15} />
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

      {/* Kaza Ekle Modal */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); reset() }} title="Kaza Kaydı Ekle" size="xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Temel Bilgiler */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Temel Bilgiler</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Araç *</label>
                <select {...register('vehicle_id', { required: true })} className="input">
                  <option value="">Seçin</option>
                  {vehicleList.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand} {v.model}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sürücü</label>
                <select {...register('driver_id')} className="input">
                  <option value="">Seçin</option>
                  {driverList.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Kaza Tarihi *</label>
                <input {...register('accident_date', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="label">Kaza Saati</label>
                <input {...register('accident_time')} type="time" className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Kaza Yeri</label>
                <input {...register('location')} className="input" placeholder="Adres veya açıklama" />
              </div>
              <div>
                <label className="label">Kaza Türü</label>
                <select {...register('accident_type')} className="input">
                  {Object.entries(ACCIDENT_TYPE_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Kusur Durumu</label>
                <select {...register('fault')} className="input">
                  {Object.entries(FAULT_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Hava Durumu</label>
                <select {...register('weather_condition')} className="input">
                  <option value="">Seçin</option>
                  <option value="clear">Açık</option>
                  <option value="rainy">Yağmurlu</option>
                  <option value="foggy">Sisli</option>
                  <option value="snowy">Karlı</option>
                  <option value="icy">Buzlu</option>
                </select>
              </div>
              <div>
                <label className="label">Yol Durumu</label>
                <select {...register('road_condition')} className="input">
                  <option value="">Seçin</option>
                  <option value="dry">Kuru</option>
                  <option value="wet">Islak</option>
                  <option value="icy">Buzlu</option>
                  <option value="under_construction">Yapım Aşamasında</option>
                </select>
              </div>
              <div>
                <label className="label">Polis Tutanak No</label>
                <input {...register('police_report_no')} className="input" />
              </div>
              <div>
                <label className="label">Durum</label>
                <select {...register('status')} className="input">
                  <option value="open">Açık</option>
                  <option value="in_repair">Onarımda</option>
                  <option value="closed">Kapatıldı</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Olay Açıklaması</label>
                <textarea {...register('description')} className="input" rows={2} />
              </div>
            </div>
          </div>

          {/* Hasar */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Hasar Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Hasar Bölgesi (birden fazla seçilebilir)</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAMAGE_AREAS.map((area, i) => (
                    <label key={area} className="flex items-center gap-1 cursor-pointer">
                      <input {...register(`damage_areas_check.${i}`)} type="checkbox" className="rounded border-slate-300" />
                      <span className="text-sm text-slate-700">{area}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="label">Hasar Açıklaması</label>
                <textarea {...register('damage_description')} className="input" rows={2} />
              </div>
              <div>
                <label className="label">Tahmini Onarım Maliyeti (₺)</label>
                <input {...register('estimated_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Gerçekleşen Onarım Maliyeti (₺)</label>
                <input {...register('repair_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Onarım Tarihi</label>
                <input {...register('repair_date')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Onarım Yapan Servis</label>
                <input {...register('repair_shop')} className="input" />
              </div>
            </div>
          </div>

          {/* Karşı Taraf */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Karşı Taraf Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Ad Soyad</label>
                <input {...register('third_party_name')} className="input" />
              </div>
              <div>
                <label className="label">Plaka</label>
                <input {...register('third_party_plate')} className="input" />
              </div>
              <div>
                <label className="label">Sigorta Şirketi</label>
                <input {...register('third_party_insurance')} className="input" />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input {...register('third_party_phone')} className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Tanık Bilgisi</label>
                <input {...register('witness_info')} className="input" />
              </div>
            </div>
          </div>

          {/* Sigorta */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Sigorta & Tazminat</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sigorta Şirketi</label>
                <input {...register('insurance_company')} className="input" />
              </div>
              <div>
                <label className="label">Dosya / Poliçe No</label>
                <input {...register('insurance_claim_no')} className="input" />
              </div>
              <div>
                <label className="label">Dosya Durumu</label>
                <select {...register('claim_status')} className="input">
                  {Object.entries(CLAIM_STATUS_MAP).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tazminat Tutarı (₺)</label>
                <input {...register('claim_amount', { valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notlar</label>
            <textarea {...register('notes')} className="input" rows={2} />
          </div>

          <button type="submit" className="btn-primary w-full justify-center">Kaydet</button>
        </form>
      </Modal>
    </div>
  )
}
