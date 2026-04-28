import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, AlertTriangle, Trash2, Pencil, Shield } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  getDriverDocs, createDriverDoc, updateDriverDoc, deleteDriverDoc, getDrivers
} from '../services/api'
import { PageLoader, EmptyState, ConfirmDialog, StatCard } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const DOC_TYPES = {
  src: 'SRC Belgesi',
  psikoteknik: 'Psikoteknik',
  saglik_raporu: 'Sağlık Raporu',
  takograf_karti: 'Takograf Kartı',
  ehliyet: 'Ehliyet',
  diger: 'Diğer',
}
const SRC_TYPES = ['SRC1', 'SRC2', 'SRC3', 'SRC4']

const statusBadge = (s) => {
  if (s === 'expired') return <span className="badge bg-red-100 text-red-700">Süresi Doldu</span>
  if (s === 'expiring') return <span className="badge bg-amber-100 text-amber-700">Yaklaşıyor</span>
  return <span className="badge bg-green-100 text-green-700">Geçerli</span>
}

export default function DriverDocsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canDelete = ['admin', 'manager'].includes(user?.role)

  const [modal, setModal] = useState(null) // null | 'new' | {id,..} (edit)
  const [deleteId, setDeleteId] = useState(null)
  const [driverFilter, setDriverFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['driver-docs', driverFilter, typeFilter],
    queryFn: () => getDriverDocs({
      driver_id: driverFilter || undefined,
      document_type: typeFilter || undefined,
    }),
  })

  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: () => import('../services/api').then(m => m.getDrivers()) })

  const { register, handleSubmit, reset, watch, setValue } = useForm()
  const docType = watch('document_type')

  const openNew = () => { reset({}); setModal('new') }
  const openEdit = (doc) => {
    reset({
      driver_id: doc.driver_id,
      document_type: doc.document_type,
      src_type: doc.src_type || '',
      document_no: doc.document_no || '',
      issue_date: doc.issue_date?.split('T')[0] || '',
      expiry_date: doc.expiry_date?.split('T')[0] || '',
      issuing_authority: doc.issuing_authority || '',
      notes: doc.notes || '',
    })
    setModal(doc)
  }

  const saveMutation = useMutation({
    mutationFn: (data) => modal === 'new' ? createDriverDoc(data) : updateDriverDoc(modal.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-docs'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setModal(null)
      toast.success(modal === 'new' ? 'Belge eklendi.' : 'Belge güncellendi.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDriverDoc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-docs'] })
      setDeleteId(null)
      toast.success('Belge silindi.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const filtered = statusFilter
    ? docs.filter(d => d.validity_status === statusFilter)
    : docs

  const expiredCount = docs.filter(d => d.validity_status === 'expired').length
  const expiringCount = docs.filter(d => d.validity_status === 'expiring').length
  const validCount = docs.filter(d => d.validity_status === 'valid').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sürücü Belgeleri</h1>
          <p className="text-sm text-slate-500">SRC, psikoteknik, sağlık raporu ve diğer sürücü belgeleri</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Belge Ekle
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Toplam Belge" value={docs.length} icon={FileText} color="blue" />
        <StatCard title="Geçerli" value={validCount} icon={Shield} color="green" />
        <StatCard title="Yaklaşıyor (30 gün)" value={expiringCount} icon={AlertTriangle} color="amber" />
        <StatCard title="Süresi Doldu" value={expiredCount} icon={AlertTriangle} color="red" />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <select value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Sürücüler</option>
          {drivers.map?.(d => <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Belge Tipleri</option>
          {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Durumlar</option>
          <option value="expired">Süresi Doldu</option>
          <option value="expiring">Yaklaşıyor</option>
          <option value="valid">Geçerli</option>
        </select>
      </div>

      {/* Tablo */}
      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Sürücü</th>
                <th>Belge Tipi</th>
                <th>Belge No</th>
                <th>Düzenleme Tarihi</th>
                <th>Son Geçerlilik</th>
                <th>Kalan Gün</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={8}><EmptyState icon={FileText} title="Belge kaydı bulunamadı" description="Belge ekle butonuna basarak kayıt oluşturun." /></td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className={d.validity_status === 'expired' ? 'bg-red-50/30' : d.validity_status === 'expiring' ? 'bg-amber-50/30' : ''}>
                  <td className="font-medium">{d.driver_name}</td>
                  <td>
                    {DOC_TYPES[d.document_type] || d.document_type}
                    {d.src_type && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{d.src_type}</span>}
                  </td>
                  <td className="text-slate-500 text-sm">{d.document_no || '—'}</td>
                  <td>{d.issue_date ? format(new Date(d.issue_date), 'dd.MM.yyyy') : '—'}</td>
                  <td className="font-medium">
                    {d.expiry_date ? format(new Date(d.expiry_date), 'dd.MM.yyyy') : <span className="text-green-600 text-sm">Süresiz</span>}
                  </td>
                  <td>
                    {d.days_until_expiry != null ? (
                      <span className={d.days_until_expiry < 0 ? 'text-red-600 font-semibold' : d.days_until_expiry <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
                        {d.days_until_expiry < 0 ? `${Math.abs(d.days_until_expiry)} gün geçti` : `${d.days_until_expiry} gün`}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{statusBadge(d.validity_status)}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                        <Pencil size={14} />
                      </button>
                      {canDelete && (
                        <button onClick={() => setDeleteId(d.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                          <Trash2 size={14} />
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

      {/* Modal */}
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Belge Ekle' : 'Belge Düzenle'} size="lg">
        <form onSubmit={handleSubmit(saveMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {modal === 'new' && (
              <div className="col-span-2">
                <label className="label">Sürücü *</label>
                <select {...register('driver_id', { required: true, valueAsNumber: true })} className="input">
                  <option value="">Sürücü Seçin</option>
                  {drivers.map?.(d => (
                    <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Belge Tipi *</label>
              <select {...register('document_type', { required: true })} className="input">
                <option value="">Seçin</option>
                {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {docType === 'src' && (
              <div>
                <label className="label">SRC Türü</label>
                <select {...register('src_type')} className="input">
                  <option value="">Seçin</option>
                  {SRC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Belge No</label>
              <input {...register('document_no')} className="input" placeholder="Belge numarası" />
            </div>
            <div>
              <label className="label">Düzenleme Tarihi</label>
              <input {...register('issue_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Son Geçerlilik Tarihi</label>
              <input {...register('expiry_date')} type="date" className="input" />
              <p className="text-xs text-slate-400 mt-1">Süresiz belgeler için boş bırakın</p>
            </div>
            <div className="col-span-2">
              <label className="label">Veren Kurum</label>
              <input {...register('issuing_authority')} className="input" placeholder="Örn: TOBB, Sağlık Bakanlığı..." />
            </div>
            <div className="col-span-2">
              <label className="label">Notlar</label>
              <textarea {...register('notes')} className="input" rows={2} />
            </div>
          </div>
          <button type="submit" disabled={saveMutation.isPending} className="btn-primary w-full justify-center">
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Belgeyi Sil"
        message="Bu belge kaydını silmek istediğinize emin misiniz?"
      />
    </div>
  )
}
