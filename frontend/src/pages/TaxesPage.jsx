import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Receipt, CheckCircle, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  getVehicleTaxes, getVehicleTaxSummary, createVehicleTax,
  updateVehicleTax, payVehicleTax, deleteVehicleTax, getVehicles
} from '../services/api'
import { PageLoader, EmptyState, ConfirmDialog, StatCard } from '../components/ui/Common'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

const INSTALLMENT_LABEL = { 1: '1. Taksit (Ocak)', 2: '2. Taksit (Temmuz)' }
const currentYear = new Date().getFullYear()

const statusBadge = (s) => {
  if (s === 'paid') return <span className="badge bg-green-100 text-green-700">Ödendi</span>
  if (s === 'overdue') return <span className="badge bg-red-100 text-red-700">Gecikti</span>
  return <span className="badge bg-amber-100 text-amber-700">Bekliyor</span>
}

export default function TaxesPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canDelete = ['admin', 'manager'].includes(user?.role)

  const [year, setYear] = useState(currentYear)
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['vehicle-taxes', year, vehicleFilter, statusFilter],
    queryFn: () => getVehicleTaxes({
      year: year || undefined,
      vehicle_id: vehicleFilter || undefined,
      status: statusFilter || undefined,
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['vehicle-tax-summary', year],
    queryFn: () => getVehicleTaxSummary(year),
  })

  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => import('../services/api').then(m => m.getVehicles()) })

  const { register, handleSubmit, reset } = useForm()

  const openNew = () => {
    reset({ year: currentYear, tax_type: 'mtv', status: 'pending' })
    setModal('new')
  }
  const openEdit = (tax) => {
    reset({
      vehicle_id: tax.vehicle_id,
      tax_type: tax.tax_type,
      year: tax.year,
      installment: tax.installment || '',
      amount: tax.amount || '',
      due_date: tax.due_date?.split('T')[0] || '',
      paid_date: tax.paid_date?.split('T')[0] || '',
      status: tax.status,
      notes: tax.notes || '',
    })
    setModal(tax)
  }

  const saveMutation = useMutation({
    mutationFn: (data) => modal === 'new' ? createVehicleTax(data) : updateVehicleTax(modal.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-taxes'] })
      qc.invalidateQueries({ queryKey: ['vehicle-tax-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setModal(null)
      toast.success(modal === 'new' ? 'Vergi kaydı eklendi.' : 'Güncellendi.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const payMutation = useMutation({
    mutationFn: (id) => payVehicleTax(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-taxes'] })
      qc.invalidateQueries({ queryKey: ['vehicle-tax-summary'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Ödeme işaretlendi.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVehicleTax,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-taxes'] })
      qc.invalidateQueries({ queryKey: ['vehicle-tax-summary'] })
      setDeleteId(null)
      toast.success('Kayıt silindi.')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Vergi Takibi</h1>
          <p className="text-sm text-slate-500">Motorlu Taşıtlar Vergisi (MTV) ve diğer araç vergileri</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Vergi Kaydı Ekle
        </button>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={`${year} Toplam Vergi`}
          value={`${(summary?.total_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
          icon={Receipt}
          color="blue"
        />
        <StatCard
          title="Ödenen"
          value={`${(summary?.paid_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Bekleyen"
          value={`${(summary?.pending_amount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`}
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Gecikmiş"
          value={summary?.overdue_count || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-auto">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Araçlar</option>
          {vehicles?.data?.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
          <option value="">Tüm Durumlar</option>
          <option value="pending">Bekliyor</option>
          <option value="paid">Ödendi</option>
          <option value="overdue">Gecikti</option>
        </select>
      </div>

      {/* Tablo */}
      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Araç</th>
                <th>Vergi Türü</th>
                <th>Yıl</th>
                <th>Taksit</th>
                <th>Tutar</th>
                <th>Vade Tarihi</th>
                <th>Ödeme Tarihi</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!taxes.length ? (
                <tr><td colSpan={9}><EmptyState icon={Receipt} title="Vergi kaydı bulunamadı" description="Vergi kaydı ekle butonuna basarak kayıt oluşturun." /></td></tr>
              ) : taxes.map(t => (
                <tr key={t.id} className={t.status === 'overdue' ? 'bg-red-50/30' : t.status === 'paid' ? 'bg-green-50/20' : ''}>
                  <td>
                    <span className="font-medium">{t.plate_no}</span>
                    <span className="text-slate-400 text-xs ml-1">{t.brand} {t.model}</span>
                  </td>
                  <td>{t.tax_type === 'mtv' ? 'MTV' : 'Diğer'}</td>
                  <td className="font-semibold">{t.year}</td>
                  <td>{t.installment ? INSTALLMENT_LABEL[t.installment] : '—'}</td>
                  <td className="font-mono font-semibold">
                    {t.amount ? `${parseFloat(t.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺` : '—'}
                  </td>
                  <td>{t.due_date ? format(new Date(t.due_date), 'dd.MM.yyyy') : '—'}</td>
                  <td className="text-green-700">{t.paid_date ? format(new Date(t.paid_date), 'dd.MM.yyyy') : '—'}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td>
                    <div className="flex gap-1">
                      {t.status !== 'paid' && (
                        <button
                          onClick={() => payMutation.mutate(t.id)}
                          className="btn-success text-xs py-1 px-2"
                          title="Ödendi olarak işaretle"
                        >
                          <CheckCircle size={13} /> Ödendi
                        </button>
                      )}
                      <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500">
                        <Pencil size={14} />
                      </button>
                      {canDelete && (
                        <button onClick={() => setDeleteId(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
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
      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Vergi Kaydı Ekle' : 'Vergi Kaydını Düzenle'} size="lg">
        <form onSubmit={handleSubmit(saveMutation.mutate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {modal === 'new' && (
              <div className="col-span-2">
                <label className="label">Araç *</label>
                <select {...register('vehicle_id', { required: true, valueAsNumber: true })} className="input">
                  <option value="">Araç Seçin</option>
                  {vehicles?.data?.map(v => (
                    <option key={v.id} value={v.id}>{v.plate_no} - {v.brand} {v.model}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">Vergi Türü</label>
              <select {...register('tax_type')} className="input">
                <option value="mtv">MTV (Motorlu Taşıtlar Vergisi)</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div>
              <label className="label">Yıl *</label>
              <select {...register('year', { required: true, valueAsNumber: true })} className="input">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Taksit</label>
              <select {...register('installment', { valueAsNumber: true })} className="input">
                <option value="">Seçin</option>
                <option value={1}>1. Taksit (Ocak)</option>
                <option value={2}>2. Taksit (Temmuz)</option>
              </select>
            </div>
            <div>
              <label className="label">Tutar (₺)</label>
              <input {...register('amount', { valueAsNumber: true })} type="number" step="0.01" className="input font-mono" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Vade Tarihi</label>
              <input {...register('due_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Ödeme Tarihi</label>
              <input {...register('paid_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Durum</label>
              <select {...register('status')} className="input">
                <option value="pending">Bekliyor</option>
                <option value="paid">Ödendi</option>
                <option value="overdue">Gecikti</option>
              </select>
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
        title="Vergi Kaydını Sil"
        message="Bu vergi kaydını silmek istediğinize emin misiniz?"
      />
    </div>
  )
}
