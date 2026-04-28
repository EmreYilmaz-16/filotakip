export function StatusBadge({ status }) {
  const map = {
    active: { label: 'Aktif', cls: 'bg-green-100 text-green-700' },
    maintenance: { label: 'Bakımda', cls: 'bg-amber-100 text-amber-700' },
    faulty: { label: 'Arızalı', cls: 'bg-red-100 text-red-700' },
    retired: { label: 'Hurdaya Ayrıldı', cls: 'bg-slate-100 text-slate-600' },
    sold: { label: 'Satıldı', cls: 'bg-purple-100 text-purple-700' },
    returned: { label: 'İade Edildi', cls: 'bg-slate-100 text-slate-600' },
    open: { label: 'Açık', cls: 'bg-red-100 text-red-700' },
    in_progress: { label: 'Devam Ediyor', cls: 'bg-amber-100 text-amber-700' },
    resolved: { label: 'Çözüldü', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: 'İptal Edildi', cls: 'bg-slate-100 text-slate-500' },
    inactive: { label: 'Pasif', cls: 'bg-slate-100 text-slate-600' },
    suspended: { label: 'Askıya Alındı', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`badge ${cls}`}>{label}</span>
}

export function SeverityBadge({ severity }) {
  const map = {
    low: { label: 'Düşük', cls: 'bg-slate-100 text-slate-600' },
    medium: { label: 'Orta', cls: 'bg-amber-100 text-amber-700' },
    high: { label: 'Yüksek', cls: 'bg-orange-100 text-orange-700' },
    critical: { label: 'Kritik', cls: 'bg-red-100 text-red-700' },
  }
  const { label, cls } = map[severity] || { label: severity, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`badge ${cls}`}>{label}</span>
}
