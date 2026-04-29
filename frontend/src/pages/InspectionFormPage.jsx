import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { createInspection, getVehicles, getDrivers } from '../services/api'

// ──────────────────────────────────────────────────────────────────
// Standart DVIR kontrol listesi (kategoriler ve maddeler)
// ──────────────────────────────────────────────────────────────────
export const DEFAULT_CHECKLIST = [
  {
    category: 'Motor & Sıvılar',
    items: [
      'Motor yağı seviyesi',
      'Soğutma sıvısı seviyesi',
      'Fren hidrolik yağı',
      'Direksiyon hidrolik yağı',
      'Cam silecek suyu',
      'Akü durumu',
    ],
  },
  {
    category: 'Frenler & Direksiyon',
    items: [
      'Ön frenler',
      'Arka frenler',
      'El freni',
      'Direksiyon boşluğu',
      'Fren sesi / titremesi yok',
    ],
  },
  {
    category: 'Lastikler & Tekerlekler',
    items: [
      'Ön sol lastik',
      'Ön sağ lastik',
      'Arka sol lastik',
      'Arka sağ lastik',
      'Stepne / yedek lastik',
      'Somun sıkılığı',
    ],
  },
  {
    category: 'Işıklar & Elektrik',
    items: [
      'Kısa far',
      'Uzun far',
      'Sis lambası',
      'Stop lambaları',
      'Sinyal lambaları (sağ/sol)',
      'Geri vites lambası',
      'İç aydınlatma',
      'Gösterge paneli',
    ],
  },
  {
    category: 'Camlar & Aynalar',
    items: [
      'Ön cam (çatlak/kırık yok)',
      'Arka cam',
      'Sol dış dikiz aynası',
      'Sağ dış dikiz aynası',
      'İç dikiz aynası',
      'Silecekler',
      'Silecek lastikleri',
    ],
  },
  {
    category: 'Kabin İçi',
    items: [
      'Sürücü emniyet kemeri',
      'Korna çalışıyor',
      'Klima / ısıtma',
      'Koltuk ayarı / durumu',
      'Pedal durumu (temiz / takılma yok)',
      'Yangın söndürücü',
      'Reflektif üçgen (2 adet)',
      'İlk yardım kiti',
    ],
  },
  {
    category: 'Dış Gövde & Genel',
    items: [
      'Gövde hasarı (çarpma/ezik yok)',
      'Kapı açma/kapama',
      'Kapı kilitleri',
      'Bagaj / yük alanı',
      'Egzoz dumanı normal',
      'Yağ / sıvı sızıntısı yok',
      'Araç plakası okunuyor',
    ],
  },
]

// Her maddeyi başlangıçta "pass" olarak al
function buildDefaultItems() {
  return DEFAULT_CHECKLIST.flatMap(cat =>
    cat.items.map(item => ({
      category: cat.category,
      item,
      status: 'pass',   // pass | warning | fail | na
      note: '',
    }))
  )
}

const STATUS_OPTIONS = [
  { value: 'pass', label: 'Geçti', icon: CheckCircle2, cls: 'text-green-600' },
  { value: 'warning', label: 'Uyarı', icon: AlertCircle, cls: 'text-amber-500' },
  { value: 'fail', label: 'Kaldı', icon: XCircle, cls: 'text-red-600' },
  { value: 'na', label: 'N/A', icon: null, cls: 'text-slate-400' },
]

function deriveOverallStatus(items) {
  if (items.some(it => it.status === 'fail')) return 'fail'
  if (items.some(it => it.status === 'warning')) return 'warning'
  return 'pass'
}

export default function InspectionFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [items, setItems] = useState(buildDefaultItems)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      inspection_type: searchParams.get('type') || 'departure',
      inspection_date: new Date().toISOString().split('T')[0],
      vehicle_id: searchParams.get('vehicle_id') || '',
    },
  })

  const { data: vehiclesData } = useQuery({ queryKey: ['vehicles-all'], queryFn: () => getVehicles({ limit: 200 }) })
  const { data: driversData } = useQuery({ queryKey: ['drivers-all'], queryFn: () => getDrivers({ limit: 200 }) })

  const vehicles = vehiclesData?.data || vehiclesData || []
  const drivers = driversData?.data || driversData || []

  const setItemStatus = (idx, status) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, status } : it))
  }
  const setItemNote = (idx, note) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, note } : it))
  }
  const setAllInCategory = (category, status) => {
    setItems(prev => prev.map(it => it.category === category ? { ...it, status } : it))
  }

  const overall_status = deriveOverallStatus(items)
  const failCount = items.filter(it => it.status === 'fail').length
  const warnCount = items.filter(it => it.status === 'warning').length
  const naCount = items.filter(it => it.status === 'na').length

  const onSubmit = (data) => {
    setSubmitting(true)
    createInspection({ ...data, items, overall_status })
      .then((res) => {
        toast.success('Form kaydedildi.')
        qc.invalidateQueries({ queryKey: ['inspections'] })
        qc.invalidateQueries({ queryKey: ['inspection-stats'] })
        navigate(`/inspections/${res.id}`)
      })
      .catch((err) => {
        toast.error(err.response?.data?.error || 'Hata oluştu.')
        setSubmitting(false)
      })
  }

  // Group items by category for rendering
  const grouped = DEFAULT_CHECKLIST.map(cat => ({
    ...cat,
    itemsWithIdx: cat.items.map(itemName => {
      const idx = items.findIndex(it => it.category === cat.category && it.item === itemName)
      return { idx, data: items[idx] }
    }),
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/inspections')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Formlar
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2.5 rounded-xl">
          <ClipboardCheck size={22} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Yeni Muayene Formu</h1>
          <p className="text-sm text-slate-500">Her maddeyi kontrol edin ve durumunu işaretleyin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Başlık bilgileri */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-4">Form Bilgileri</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Araç *</label>
              <select {...register('vehicle_id', { required: 'Araç seçimi zorunludur.' })} className="input">
                <option value="">Seçin</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} — {v.brand} {v.model}</option>)}
              </select>
              {errors.vehicle_id && <p className="text-xs text-red-500 mt-1">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="label">Sürücü</label>
              <select {...register('driver_id')} className="input">
                <option value="">Seçin</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Form Tipi</label>
              <select {...register('inspection_type')} className="input">
                <option value="departure">Çıkış Kontrolü</option>
                <option value="return">Dönüş Kontrolü</option>
                <option value="periodic">Periyodik Muayene</option>
              </select>
            </div>
            <div>
              <label className="label">Tarih *</label>
              <input {...register('inspection_date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">KM (Güncel)</label>
              <input {...register('km', { valueAsNumber: true })} type="number" className="input" placeholder="ör: 125000" />
            </div>
            <div>
              <label className="label">Notlar</label>
              <input {...register('notes')} className="input" placeholder="Genel gözlem..." />
            </div>
          </div>
        </div>

        {/* Özet banner */}
        <div className={`rounded-xl px-5 py-3 flex items-center justify-between ${overall_status === 'fail' ? 'bg-red-50 border border-red-200' : overall_status === 'warning' ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-3">
            {overall_status === 'fail'
              ? <XCircle size={22} className="text-red-600" />
              : overall_status === 'warning'
              ? <AlertCircle size={22} className="text-amber-500" />
              : <CheckCircle2 size={22} className="text-green-600" />}
            <div>
              <p className={`font-semibold text-sm ${overall_status === 'fail' ? 'text-red-700' : overall_status === 'warning' ? 'text-amber-700' : 'text-green-700'}`}>
                Genel Sonuç: {overall_status === 'fail' ? 'BAŞARISIZ — Araç sefere çıkmamalı' : overall_status === 'warning' ? 'UYARI — Dikkat gerektiren maddeler var' : 'BAŞARILI — Araç kullanıma uygun'}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 font-medium">{items.filter(it => it.status === 'pass').length} geçti</span>
            {warnCount > 0 && <span className="text-amber-500 font-medium">{warnCount} uyarı</span>}
            {failCount > 0 && <span className="text-red-600 font-bold">{failCount} kaldı</span>}
            {naCount > 0 && <span className="text-slate-400">{naCount} N/A</span>}
          </div>
        </div>

        {/* Checklist — kategoriler */}
        {grouped.map(cat => {
          const catItems = cat.itemsWithIdx
          const catFail = catItems.filter(({ data: d }) => d?.status === 'fail').length
          const catWarn = catItems.filter(({ data: d }) => d?.status === 'warning').length
          return (
            <div key={cat.category} className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-700">{cat.category}</h2>
                <div className="flex items-center gap-2">
                  {catFail > 0 && <span className="text-xs text-red-600 font-bold">{catFail} kaldı</span>}
                  {catWarn > 0 && <span className="text-xs text-amber-500 font-semibold">{catWarn} uyarı</span>}
                  <span className="text-xs text-slate-400">Toplu:</span>
                  <button type="button" onClick={() => setAllInCategory(cat.category, 'pass')} className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200">Hepsi Geçti</button>
                  <button type="button" onClick={() => setAllInCategory(cat.category, 'fail')} className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200">Hepsi Kaldı</button>
                </div>
              </div>

              <div className="space-y-2">
                {catItems.map(({ idx, data: d }) => (
                  <div key={idx} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${d?.status === 'fail' ? 'bg-red-50 border-red-200' : d?.status === 'warning' ? 'bg-amber-50 border-amber-200' : d?.status === 'na' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-100'}`}>
                    {/* Madde adı */}
                    <span className={`text-sm font-medium flex-1 pt-0.5 ${d?.status === 'fail' ? 'text-red-800' : d?.status === 'warning' ? 'text-amber-800' : 'text-slate-700'}`}>
                      {d?.item}
                    </span>
                    {/* Durum seçici */}
                    <div className="flex gap-1 shrink-0">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setItemStatus(idx, opt.value)}
                          title={opt.label}
                          className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all ${d?.status === opt.value ? `border-transparent ${opt.value === 'pass' ? 'bg-green-500 text-white' : opt.value === 'warning' ? 'bg-amber-400 text-white' : opt.value === 'fail' ? 'bg-red-500 text-white' : 'bg-slate-400 text-white'}` : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {/* Not alanı — uyarı/kaldı durumunda göster */}
                    {(d?.status === 'fail' || d?.status === 'warning') && (
                      <input
                        type="text"
                        value={d?.note || ''}
                        onChange={(e) => setItemNote(idx, e.target.value)}
                        placeholder="Not ekleyin..."
                        className="input text-xs py-1 w-44 shrink-0"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Kaydet butonu */}
        <div className="flex gap-3 pb-6">
          <button type="button" onClick={() => navigate('/inspections')} className="btn-secondary flex-1 justify-center">
            Vazgeç
          </button>
          <button type="submit" disabled={submitting} className={`flex-1 justify-center btn-primary ${overall_status === 'fail' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : overall_status === 'warning' ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400' : ''}`}>
            {submitting ? 'Kaydediliyor...' : overall_status === 'fail' ? 'Formu Kaydet (Araç Çıkış Yok)' : overall_status === 'warning' ? 'Formu Kaydet (Uyarıyla)' : 'Formu Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
