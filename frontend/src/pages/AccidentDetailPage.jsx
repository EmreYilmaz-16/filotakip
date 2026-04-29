import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Pencil, Trash2, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getAccident, updateAccident, deleteAccident, getVehicles, getDrivers } from '../services/api'
import { PageLoader } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const ACCIDENT_TYPE_MAP = {
  rear_end: 'Arkadan Çarpma', side_impact: 'Yandan Çarpma', head_on: 'Kafa Kafaya',
  rollover: 'Devrilme', parking: 'Park Kazası', animal: 'Hayvan Çarpması', other: 'Diğer',
}
const FAULT_MAP = {
  our_fault: 'Bizim Kusurumuz', third_party_fault: 'Karşı Taraf Kusuru', shared: 'Ortak Kusur', unknown: 'Bilinmiyor',
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

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-400 sm:w-44 shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  )
}

export default function AccidentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [editModal, setEditModal] = useState(false)

  const { data: accident, isLoading } = useQuery({
    queryKey: ['accident', id],
    queryFn: () => getAccident(id),
  })
  const { data: vehicles } = useQuery({ queryKey: ['vehicles-all'], queryFn: () => getVehicles({ limit: 200 }) })
  const { data: drivers } = useQuery({ queryKey: ['drivers-all'], queryFn: () => getDrivers({ limit: 200 }) })

  const { register, handleSubmit, reset } = useForm()

  const openEdit = () => {
    const a = accident
    reset({
      vehicle_id: a.vehicle_id,
      driver_id: a.driver_id || '',
      accident_date: a.accident_date ? a.accident_date.split('T')[0] : '',
      accident_time: a.accident_time || '',
      location: a.location || '',
      accident_type: a.accident_type || 'other',
      fault: a.fault || 'unknown',
      description: a.description || '',
      police_report_no: a.police_report_no || '',
      weather_condition: a.weather_condition || '',
      road_condition: a.road_condition || '',
      third_party_name: a.third_party_name || '',
      third_party_plate: a.third_party_plate || '',
      third_party_insurance: a.third_party_insurance || '',
      third_party_phone: a.third_party_phone || '',
      witness_info: a.witness_info || '',
      damage_description: a.damage_description || '',
      damage_areas_check: DAMAGE_AREAS.reduce((acc, area, i) => {
        acc[i] = a.damage_areas?.includes(area) || false
        return acc
      }, {}),
      estimated_cost: a.estimated_cost || '',
      repair_cost: a.repair_cost || '',
      repair_date: a.repair_date ? a.repair_date.split('T')[0] : '',
      repair_shop: a.repair_shop || '',
      insurance_company: a.insurance_company || '',
      insurance_claim_no: a.insurance_claim_no || '',
      claim_status: a.claim_status || 'not_filed',
      claim_amount: a.claim_amount || '',
      status: a.status || 'open',
      notes: a.notes || '',
    })
    setEditModal(true)
  }

  const onEditSubmit = (data) => {
    const n = (v) => (v === '' || v === undefined) ? null : v
    const areas = DAMAGE_AREAS.filter((_, i) => data.damage_areas_check?.[i])
    const payload = { ...data, damage_areas: areas }
    delete payload.damage_areas_check
    updateAccident(id, payload)
      .then(() => {
        toast.success('Kaza kaydı güncellendi.')
        setEditModal(false)
        qc.invalidateQueries({ queryKey: ['accident', id] })
        qc.invalidateQueries({ queryKey: ['accidents'] })
        qc.invalidateQueries({ queryKey: ['accident-stats'] })
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
  }

  const handleDelete = () => {
    if (window.confirm('Bu kaza kaydını silmek istediğinizden emin misiniz?')) {
      deleteAccident(id)
        .then(() => { toast.success('Kaza kaydı silindi.'); navigate('/accidents') })
        .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
    }
  }

  if (isLoading) return <PageLoader />
  if (!accident) return <div className="text-center py-20 text-slate-400">Kaza kaydı bulunamadı.</div>

  const vehicleList = vehicles?.data || vehicles || []
  const driverList = drivers?.data || drivers || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/accidents')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Kaza Listesi
        </button>
        {canEdit && (
          <div className="flex gap-2">
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
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-xl">
              <ShieldAlert size={24} className="text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-800">
                  {accident.accident_date ? format(new Date(accident.accident_date), 'dd MMMM yyyy', { locale: tr }) : '—'} Kaza Kaydı
                </h1>
                <span className={`badge ${STATUS_MAP[accident.status]?.cls}`}>{STATUS_MAP[accident.status]?.label}</span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                <Link to={`/vehicles/${accident.vehicle_id}`} className="text-blue-600 hover:underline font-medium">{accident.plate_no}</Link>
                {' '}{accident.brand} {accident.model}
                {accident.driver_name && <> &bull; Sürücü: {accident.driver_name}</>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kaza Bilgileri */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Kaza Bilgileri</h2>
          <InfoRow label="Kaza Türü" value={ACCIDENT_TYPE_MAP[accident.accident_type]} />
          <InfoRow label="Kusur Durumu" value={FAULT_MAP[accident.fault]} />
          <InfoRow label="Kaza Yeri" value={accident.location} />
          <InfoRow label="Kaza Saati" value={accident.accident_time} />
          <InfoRow label="Hava Durumu" value={{ clear: 'Açık', rainy: 'Yağmurlu', foggy: 'Sisli', snowy: 'Karlı', icy: 'Buzlu' }[accident.weather_condition]} />
          <InfoRow label="Yol Durumu" value={{ dry: 'Kuru', wet: 'Islak', icy: 'Buzlu', under_construction: 'Yapım Aşamasında' }[accident.road_condition]} />
          <InfoRow label="Polis Tutanak No" value={accident.police_report_no} />
          {accident.description && (
            <div className="pt-2">
              <p className="text-sm text-slate-400 mb-1">Açıklama</p>
              <p className="text-sm text-slate-700">{accident.description}</p>
            </div>
          )}
        </div>

        {/* Hasar Bilgileri */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Hasar & Onarım</h2>
          {accident.damage_areas?.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-slate-400 mb-1">Hasar Bölgeleri</p>
              <div className="flex flex-wrap gap-1">
                {accident.damage_areas.map(area => (
                  <span key={area} className="badge bg-red-50 text-red-700">{area}</span>
                ))}
              </div>
            </div>
          )}
          <InfoRow label="Hasar Açıklaması" value={accident.damage_description} />
          <InfoRow label="Tahmini Maliyet" value={accident.estimated_cost ? `₺${parseFloat(accident.estimated_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : null} />
          <InfoRow label="Gerçek Maliyet" value={accident.repair_cost ? `₺${parseFloat(accident.repair_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : null} />
          <InfoRow label="Onarım Tarihi" value={accident.repair_date ? format(new Date(accident.repair_date), 'dd MMMM yyyy', { locale: tr }) : null} />
          <InfoRow label="Onarım Servisi" value={accident.repair_shop} />
        </div>

        {/* Karşı Taraf */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Karşı Taraf Bilgileri</h2>
          <InfoRow label="Ad Soyad" value={accident.third_party_name} />
          <InfoRow label="Plaka" value={accident.third_party_plate} />
          <InfoRow label="Sigorta Şirketi" value={accident.third_party_insurance} />
          <InfoRow label="Telefon" value={accident.third_party_phone} />
          <InfoRow label="Tanık" value={accident.witness_info} />
          {!accident.third_party_name && !accident.third_party_plate && (
            <p className="text-sm text-slate-400 py-4 text-center">Karşı taraf bilgisi girilmemiş.</p>
          )}
        </div>

        {/* Sigorta */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Sigorta & Tazminat</h2>
          <div className="mb-3">
            <span className={`badge ${CLAIM_STATUS_MAP[accident.claim_status]?.cls}`}>
              {CLAIM_STATUS_MAP[accident.claim_status]?.label}
            </span>
          </div>
          <InfoRow label="Sigorta Şirketi" value={accident.insurance_company} />
          <InfoRow label="Dosya No" value={accident.insurance_claim_no} />
          <InfoRow label="Tazminat Tutarı" value={accident.claim_amount ? `₺${parseFloat(accident.claim_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : null} />
          {accident.notes && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <p className="text-sm text-slate-400 mb-1">Notlar</p>
              <p className="text-sm text-slate-700">{accident.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Düzenle Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Kaza Kaydını Düzenle" size="xl">
        <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-5">
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
                <input {...register('location')} className="input" />
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
                  <option value="clear">Açık</option><option value="rainy">Yağmurlu</option>
                  <option value="foggy">Sisli</option><option value="snowy">Karlı</option><option value="icy">Buzlu</option>
                </select>
              </div>
              <div>
                <label className="label">Yol Durumu</label>
                <select {...register('road_condition')} className="input">
                  <option value="">Seçin</option>
                  <option value="dry">Kuru</option><option value="wet">Islak</option>
                  <option value="icy">Buzlu</option><option value="under_construction">Yapım Aşamasında</option>
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

          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Hasar Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Hasar Bölgesi</label>
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
                <label className="label">Tahmini Maliyet (₺)</label>
                <input {...register('estimated_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Gerçek Maliyet (₺)</label>
                <input {...register('repair_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
              </div>
              <div>
                <label className="label">Onarım Tarihi</label>
                <input {...register('repair_date')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Onarım Servisi</label>
                <input {...register('repair_shop')} className="input" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Karşı Taraf</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Ad Soyad</label><input {...register('third_party_name')} className="input" /></div>
              <div><label className="label">Plaka</label><input {...register('third_party_plate')} className="input" /></div>
              <div><label className="label">Sigorta</label><input {...register('third_party_insurance')} className="input" /></div>
              <div><label className="label">Telefon</label><input {...register('third_party_phone')} className="input" /></div>
              <div className="col-span-2"><label className="label">Tanık</label><input {...register('witness_info')} className="input" /></div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-3 pb-1 border-b">Sigorta & Tazminat</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Sigorta Şirketi</label><input {...register('insurance_company')} className="input" /></div>
              <div><label className="label">Dosya No</label><input {...register('insurance_claim_no')} className="input" /></div>
              <div>
                <label className="label">Dosya Durumu</label>
                <select {...register('claim_status')} className="input">
                  {Object.entries(CLAIM_STATUS_MAP).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                </select>
              </div>
              <div><label className="label">Tazminat (₺)</label><input {...register('claim_amount', { valueAsNumber: true })} type="number" step="0.01" className="input" /></div>
            </div>
          </div>

          <div><label className="label">Notlar</label><textarea {...register('notes')} className="input" rows={2} /></div>

          <button type="submit" className="btn-primary w-full justify-center">Güncelle</button>
        </form>
      </Modal>
    </div>
  )
}
