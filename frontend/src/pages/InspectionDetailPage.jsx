import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, CheckCircle2, XCircle, AlertCircle, MinusCircle, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getInspection, deleteInspection } from '../services/api'
import { PageLoader } from '../components/ui/Common'
import { useAuthStore } from '../store/authStore'
import { DEFAULT_CHECKLIST } from './InspectionFormPage'

const TYPE_MAP = {
  departure: { label: 'Çıkış Kontrolü', cls: 'bg-blue-100 text-blue-700' },
  return: { label: 'Dönüş Kontrolü', cls: 'bg-purple-100 text-purple-700' },
  periodic: { label: 'Periyodik Muayene', cls: 'bg-slate-100 text-slate-600' },
}
const OVERALL_MAP = {
  pass: { label: 'BAŞARILI', cls: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, iconCls: 'text-green-600' },
  warning: { label: 'UYARILI', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, iconCls: 'text-amber-500' },
  fail: { label: 'BAŞARISIZ', cls: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, iconCls: 'text-red-600' },
}
const ITEM_STATUS = {
  pass: { icon: CheckCircle2, cls: 'text-green-500', label: 'Geçti' },
  warning: { icon: AlertCircle, cls: 'text-amber-500', label: 'Uyarı' },
  fail: { icon: XCircle, cls: 'text-red-500', label: 'Kaldı' },
  na: { icon: MinusCircle, cls: 'text-slate-300', label: 'N/A' },
}

export default function InspectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'

  const { data: inspection, isLoading } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => getInspection(id),
  })

  const handleDelete = () => {
    if (window.confirm('Bu formu silmek istediğinizden emin misiniz?')) {
      deleteInspection(id)
        .then(() => { toast.success('Form silindi.'); navigate('/inspections') })
        .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
    }
  }

  if (isLoading) return <PageLoader />
  if (!inspection) return <div className="text-center py-20 text-slate-400">Form bulunamadı.</div>

  const items = inspection.items || []
  const failItems = items.filter(it => it.status === 'fail')
  const warnItems = items.filter(it => it.status === 'warning')
  const passCount = items.filter(it => it.status === 'pass').length
  const overall = OVERALL_MAP[inspection.overall_status] || OVERALL_MAP.pass
  const OverallIcon = overall.icon

  // Group items by category
  const grouped = DEFAULT_CHECKLIST.map(cat => ({
    category: cat.category,
    items: cat.items.map(itemName => items.find(it => it.category === cat.category && it.item === itemName) || { item: itemName, status: 'na', note: '' }),
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/inspections')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Formlar
        </button>
        {canEdit && (
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <Trash2 size={14} /> Formu Sil
          </button>
        )}
      </div>

      {/* Başlık */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-3 rounded-xl shrink-0">
            <ClipboardCheck size={24} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">
                {inspection.inspection_date ? format(new Date(inspection.inspection_date), 'dd MMMM yyyy', { locale: tr }) : '—'} — Muayene Formu
              </h1>
              <span className={`badge ${TYPE_MAP[inspection.inspection_type]?.cls}`}>{TYPE_MAP[inspection.inspection_type]?.label}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Araç: <Link to={`/vehicles/${inspection.vehicle_id}`} className="text-blue-600 hover:underline font-medium">{inspection.plate_no}</Link>
              {' '}{inspection.brand} {inspection.model}
              {inspection.driver_name && <> &bull; Sürücü: <strong>{inspection.driver_name}</strong></>}
              {inspection.km && <> &bull; KM: <strong>{parseInt(inspection.km).toLocaleString('tr-TR')}</strong></>}
            </p>
            {inspection.reported_by_name && <p className="text-xs text-slate-400 mt-0.5">Dolduran: {inspection.reported_by_name} &bull; {format(new Date(inspection.created_at), 'dd.MM.yyyy HH:mm')}</p>}
          </div>
        </div>
      </div>

      {/* Genel sonuç */}
      <div className={`rounded-xl px-5 py-4 border flex items-center justify-between ${overall.cls}`}>
        <div className="flex items-center gap-3">
          <OverallIcon size={24} className={overall.iconCls} />
          <div>
            <p className="font-bold text-base">{overall.label}</p>
            <p className="text-sm opacity-80">
              {inspection.overall_status === 'fail'
                ? 'Araç sefere çıkmamalıdır — acil müdahale gereklidir.'
                : inspection.overall_status === 'warning'
                ? 'Dikkat gerektiren maddeler mevcut. Takibe alınmalı.'
                : 'Tüm kontroller başarıyla geçildi. Araç kullanıma hazır.'}
            </p>
          </div>
        </div>
        <div className="flex gap-5 text-sm font-semibold">
          <span className="text-green-700">{passCount} geçti</span>
          {warnItems.length > 0 && <span className="text-amber-600">{warnItems.length} uyarı</span>}
          {failItems.length > 0 && <span className="text-red-700">{failItems.length} kaldı</span>}
        </div>
      </div>

      {/* Başarısız / Uyarılı maddeler özeti */}
      {(failItems.length > 0 || warnItems.length > 0) && (
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Dikkat Gerektiren Maddeler</h2>
          <div className="space-y-2">
            {[...failItems, ...warnItems].map((it, i) => {
              const s = ITEM_STATUS[it.status] || ITEM_STATUS.na
              const Icon = s.icon
              return (
                <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${it.status === 'fail' ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <Icon size={16} className={`${s.cls} shrink-0 mt-0.5`} />
                  <div>
                    <span className="text-sm font-medium text-slate-700">{it.item}</span>
                    <span className="text-xs text-slate-400 ml-2">({it.category})</span>
                    {it.note && <p className="text-xs text-slate-500 mt-0.5">Not: {it.note}</p>}
                  </div>
                  <span className={`ml-auto text-xs font-semibold ${s.cls}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Kategoriler — tam checklist */}
      {grouped.map(cat => {
        const catFail = cat.items.filter(it => it.status === 'fail').length
        const catWarn = cat.items.filter(it => it.status === 'warning').length
        return (
          <div key={cat.category} className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-700">{cat.category}</h2>
              <div className="flex gap-2 text-xs">
                {catFail > 0 && <span className="text-red-600 font-bold">{catFail} kaldı</span>}
                {catWarn > 0 && <span className="text-amber-500 font-semibold">{catWarn} uyarı</span>}
                {catFail === 0 && catWarn === 0 && <span className="text-green-600">Tümü geçti</span>}
              </div>
            </div>
            <div className="space-y-1">
              {cat.items.map((it, i) => {
                const s = ITEM_STATUS[it.status] || ITEM_STATUS.na
                const Icon = s.icon
                return (
                  <div key={i} className={`flex items-center gap-3 py-2 border-b border-slate-50 last:border-0 ${it.status === 'fail' ? 'bg-red-50 -mx-2 px-2 rounded' : it.status === 'warning' ? 'bg-amber-50 -mx-2 px-2 rounded' : ''}`}>
                    <Icon size={15} className={`${s.cls} shrink-0`} />
                    <span className="text-sm text-slate-700 flex-1">{it.item}</span>
                    <span className={`text-xs font-semibold ${s.cls}`}>{s.label}</span>
                    {it.note && <span className="text-xs text-slate-500 italic">"{it.note}"</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {inspection.notes && (
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-2">Genel Notlar</h2>
          <p className="text-sm text-slate-600">{inspection.notes}</p>
        </div>
      )}
    </div>
  )
}
