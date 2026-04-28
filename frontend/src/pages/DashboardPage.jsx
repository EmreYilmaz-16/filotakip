import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Truck, AlertTriangle, Wrench, Fuel, FileText, ClipboardList, TrendingUp, Receipt, Shield } from 'lucide-react'
import { getDashboard, getMaintenanceSchedules, getExpiringDocuments } from '../services/api'
import { PageLoader, StatCard } from '../components/ui/Common'
import { StatusBadge, SeverityBadge } from '../components/ui/Badges'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function DashboardPage() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60000,
  })
  const { data: overdueSchedules } = useQuery({
    queryKey: ['maintenance-schedules-overdue'],
    queryFn: () => getMaintenanceSchedules({ overdue: 'true' }),
  })
  const { data: expiringDocs } = useQuery({
    queryKey: ['expiring-docs'],
    queryFn: () => getExpiringDocuments({ days: 30 }),
  })

  if (isLoading) return <PageLoader />

  const v = dash?.vehicles || {}
  const f = dash?.faults || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">Filo durumuna genel bakış</p>
      </div>

      {/* İstatistik kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Araç"
          value={v.total || 0}
          subtitle={`${v.active || 0} aktif, ${v.maintenance || 0} bakımda`}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Açık Arızalar"
          value={f.total_open || 0}
          subtitle={f.critical ? `${f.critical} kritik` : 'Kritik arıza yok'}
          icon={AlertTriangle}
          color={f.critical ? 'red' : 'amber'}
        />
        <StatCard
          title="Yaklaşan Bakım"
          value={dash?.upcoming_maintenance || 0}
          subtitle="15 gün içinde"
          icon={Wrench}
          color="amber"
        />
        <StatCard
          title="Bu Ay Yakıt"
          value={`₺${(dash?.monthly_fuel?.cost || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
          subtitle={`${(dash?.monthly_fuel?.liters || 0).toFixed(0)} litre`}
          icon={Fuel}
          color="green"
        />
        <StatCard
          title="Aktif Zimmet"
          value={dash?.active_assignments || 0}
          subtitle="Arac zimmetli"
          icon={ClipboardList}
          color="purple"
        />
        <StatCard
          title="Sona Erecek Belgeler"
          value={dash?.expiring_documents || 0}
          subtitle="30 gün içinde"
          icon={FileText}
          color={dash?.expiring_documents > 0 ? 'red' : 'slate'}
        />
        <StatCard
          title="Bakımda Araç"
          value={v.maintenance || 0}
          icon={Wrench}
          color="amber"
        />
        <StatCard
          title="Arızalı Araç"
          value={v.faulty || 0}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Sürücü Belgeleri"
          value={dash?.expiring_driver_docs || 0}
          subtitle="30 gün içinde sona eriyor"
          icon={Shield}
          color={dash?.expiring_driver_docs > 0 ? 'red' : 'slate'}
        />
        <StatCard
          title="Bekleyen MTV"
          value={dash?.pending_taxes || 0}
          subtitle="Bu yıl ödenmemiş"
          icon={Receipt}
          color={dash?.pending_taxes > 0 ? 'amber' : 'slate'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gecikmiş bakımlar */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Gecikmiş / Yaklaşan Bakımlar</h2>
            <Link to="/maintenance" className="text-xs text-blue-600 hover:underline">Tümü</Link>
          </div>
          {!overdueSchedules?.length ? (
            <p className="text-sm text-slate-400 text-center py-8">Bekleyen bakım yok</p>
          ) : (
            <div className="space-y-2">
              {overdueSchedules.slice(0, 6).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.plate_no} - {s.brand} {s.model}</p>
                    <p className="text-xs text-slate-500">{s.maintenance_type_name || s.custom_name}</p>
                  </div>
                  <div className="text-right">
                    {s.next_due_date && (
                      <p className="text-xs text-slate-500">
                        {format(new Date(s.next_due_date), 'dd MMM yyyy', { locale: tr })}
                      </p>
                    )}
                    {s.is_overdue ? (
                      <span className="badge bg-red-100 text-red-700">Gecikmiş</span>
                    ) : (
                      <span className="badge bg-amber-100 text-amber-700">Yaklaşıyor</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sona erecek belgeler */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Sona Erecek Belgeler</h2>
          </div>
          {!expiringDocs?.length ? (
            <p className="text-sm text-slate-400 text-center py-8">Yakın sürede sona erecek belge yok</p>
          ) : (
            <div className="space-y-2">
              {expiringDocs.slice(0, 6).map((d) => {
                const daysLeft = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000)
                const isExpired = daysLeft < 0
                return (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{d.plate_no} - {d.document_name}</p>
                      <p className="text-xs text-slate-500">{d.brand} {d.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {format(new Date(d.expiry_date), 'dd MMM yyyy', { locale: tr })}
                      </p>
                      <span className={`badge ${isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isExpired ? `${Math.abs(daysLeft)} gün geçti` : `${daysLeft} gün`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
