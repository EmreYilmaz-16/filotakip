import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Trash2, ClipboardCheck } from 'lucide-react'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { getInspections, getInspectionStats, deleteInspection } from '../services/api'
import { PageLoader, StatCard } from '../components/ui/Common'
import { useAuthStore } from '../store/authStore'

const TYPE_MAP = {
  departure: { label: 'Çıkış', cls: 'bg-blue-100 text-blue-700' },
  return: { label: 'Dönüş', cls: 'bg-purple-100 text-purple-700' },
  periodic: { label: 'Periyodik', cls: 'bg-slate-100 text-slate-600' },
}
const STATUS_MAP = {
  pass: { label: 'Geçti', cls: 'bg-green-100 text-green-700' },
  warning: { label: 'Uyarı', cls: 'bg-amber-100 text-amber-700' },
  fail: { label: 'Kaldı', cls: 'bg-red-100 text-red-700' },
}

export default function InspectionsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: statsData } = useQuery({ queryKey: ['inspection-stats'], queryFn: getInspectionStats })
  const { data, isLoading } = useQuery({
    queryKey: ['inspections', typeFilter, statusFilter],
    queryFn: () => getInspections({
      inspection_type: typeFilter || undefined,
      overall_status: statusFilter || undefined,
      limit: 100,
    }),
  })

  const handleDelete = (id, plate, date) => {
    if (window.confirm(`${plate} — ${date} tarihli formu silmek istediğinizden emin misiniz?`)) {
      deleteInspection(id)
        .then(() => {
          toast.success('Form silindi.')
          qc.invalidateQueries({ queryKey: ['inspections'] })
          qc.invalidateQueries({ queryKey: ['inspection-stats'] })
        })
        .catch((err) => toast.error(err.response?.data?.error || 'Hata oluştu.'))
    }
  }

  const inspections = data?.data || []
  const stats = statsData || {}

  const typeBtns = [
    { label: 'Tümü', value: '' },
    { label: 'Çıkış', value: 'departure' },
    { label: 'Dönüş', value: 'return' },
    { label: 'Periyodik', value: 'periodic' },
  ]
  const statusBtns = [
    { label: 'Tüm Sonuçlar', value: '' },
    { label: 'Geçti', value: 'pass' },
    { label: 'Uyarı', value: 'warning' },
    { label: 'Kaldı', value: 'fail' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Araç Muayene Formları</h1>
          <p className="text-sm text-slate-500">Sürücü çıkış / dönüş kontrol formları</p>
        </div>
        <Link to="/inspections/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Yeni Form
        </Link>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Toplam Form" value={stats.total || 0} subtitle="Tüm kayıtlar" icon={ClipboardCheck} color="slate" />
        <StatCard title="Bu Ay" value={stats.this_month || 0} subtitle="Bu ay doldurulan" icon={ClipboardCheck} color="blue" />
        <StatCard title="Uyarılı" value={stats.total_warning || 0} subtitle="Dikkat gerektiren" icon={ClipboardCheck} color={stats.total_warning > 0 ? 'amber' : 'slate'} />
        <StatCard title="Başarısız" value={stats.total_fail || 0} subtitle="Araca çıkış verilmedi" icon={ClipboardCheck} color={stats.total_fail > 0 ? 'red' : 'slate'} />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {typeBtns.map(b => (
            <button
              key={b.value}
              onClick={() => setTypeFilter(b.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === b.value ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >{b.label}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {statusBtns.map(b => (
            <button
              key={b.value}
              onClick={() => setStatusFilter(b.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === b.value ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >{b.label}</button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div className="card p-0 overflow-x-auto">
        {isLoading ? <PageLoader /> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Tarih</th>
                <th className="th">Araç</th>
                <th className="th">Sürücü</th>
                <th className="th">Form Tipi</th>
                <th className="th">KM</th>
                <th className="th">Madde Durumu</th>
                <th className="th">Sonuç</th>
                <th className="th">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {inspections.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400 text-sm">Henüz form kaydı yok.</td></tr>
              ) : inspections.map(ins => {
                const items = ins.items || []
                const failCount = items.filter(it => it.status === 'fail').length
                const warnCount = items.filter(it => it.status === 'warning').length
                const passCount = items.filter(it => it.status === 'pass').length
                return (
                  <tr key={ins.id} className="table-row-hover">
                    <td className="td text-sm text-slate-700 font-medium">
                      {ins.inspection_date ? format(new Date(ins.inspection_date), 'dd MMM yyyy', { locale: tr }) : '—'}
                    </td>
                    <td className="td">
                      <Link to={`/vehicles/${ins.vehicle_id}`} className="text-blue-600 hover:underline text-sm font-medium">{ins.plate_no}</Link>
                      <span className="block text-xs text-slate-400">{ins.brand} {ins.model}</span>
                    </td>
                    <td className="td text-sm text-slate-600">{ins.driver_name || '—'}</td>
                    <td className="td">
                      <span className={`badge ${TYPE_MAP[ins.inspection_type]?.cls}`}>{TYPE_MAP[ins.inspection_type]?.label}</span>
                    </td>
                    <td className="td text-sm text-slate-600">{ins.km ? `${parseInt(ins.km).toLocaleString('tr-TR')} km` : '—'}</td>
                    <td className="td">
                      <div className="flex items-center gap-1.5 text-xs">
                        {passCount > 0 && <span className="text-green-600 font-medium">{passCount} geçti</span>}
                        {warnCount > 0 && <><span className="text-slate-300">·</span><span className="text-amber-500 font-medium">{warnCount} uyarı</span></>}
                        {failCount > 0 && <><span className="text-slate-300">·</span><span className="text-red-600 font-bold">{failCount} kaldı</span></>}
                        {items.length === 0 && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="td">
                      <span className={`badge ${STATUS_MAP[ins.overall_status]?.cls}`}>{STATUS_MAP[ins.overall_status]?.label}</span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <Link to={`/inspections/${ins.id}`} className="icon-btn" title="Detay"><Eye size={15} /></Link>
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(ins.id, ins.plate_no, ins.inspection_date ? format(new Date(ins.inspection_date), 'dd.MM.yyyy') : '')}
                            className="icon-btn text-red-500 hover:text-red-700"
                            title="Sil"
                          ><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
