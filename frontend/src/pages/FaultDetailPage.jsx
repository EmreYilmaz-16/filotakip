import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessageSquare, Upload, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getFault, updateFaultStatus, addFaultComment, uploadFaultImages } from '../services/api'
import { PageLoader } from '../components/ui/Common'
import { StatusBadge, SeverityBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

export default function FaultDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = ['admin', 'manager'].includes(user?.role)
  const [resolveModal, setResolveModal] = useState(false)
  const [commentText, setCommentText] = useState('')

  const { data: fault, isLoading } = useQuery({
    queryKey: ['fault', id],
    queryFn: () => getFault(id),
  })

  const { register: regR, handleSubmit: handleR } = useForm({
    defaultValues: { resolved_date: format(new Date(), 'yyyy-MM-dd'), status: 'resolved' }
  })

  const statusMutation = useMutation({
    mutationFn: (data) => updateFaultStatus(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fault', id] }); setResolveModal(false); toast.success('Durum güncellendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const commentMutation = useMutation({
    mutationFn: (data) => addFaultComment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fault', id] }); setCommentText(''); toast.success('Yorum eklendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const imageMutation = useMutation({
    mutationFn: (formData) => uploadFaultImages(id, formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fault', id] }); toast.success('Fotoğraflar yüklendi.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  const handleImageUpload = (e) => {
    const files = e.target.files
    if (!files?.length) return
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('images', f))
    imageMutation.mutate(fd)
  }

  if (isLoading) return <PageLoader />
  if (!fault) return <div className="text-center py-20 text-slate-400">Arıza bulunamadı.</div>

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/faults')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Arıza Listesi
      </button>

      {/* Başlık Kartı */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-slate-800">{fault.title}</h1>
              <SeverityBadge severity={fault.severity} />
              <StatusBadge status={fault.status} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {fault.plate_no} {fault.brand} {fault.model} &bull; {format(new Date(fault.reported_date), 'dd.MM.yyyy')} &bull; Bildiren: {fault.reported_by_name || '—'}
            </p>
          </div>
          {canEdit && fault.status !== 'resolved' && fault.status !== 'cancelled' && (
            <div className="flex gap-2 shrink-0">
              {fault.status === 'open' && (
                <button onClick={() => statusMutation.mutate({ status: 'in_progress' })} className="btn-warning text-sm py-1.5">
                  İşleme Al
                </button>
              )}
              <button onClick={() => setResolveModal(true)} className="btn-success text-sm py-1.5">
                <CheckCircle size={15} /> Çözüldü
              </button>
            </div>
          )}
        </div>
        <p className="mt-3 text-slate-700 whitespace-pre-wrap">{fault.description}</p>
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
          {fault.category && <span>Kategori: <strong>{fault.category}</strong></span>}
          {fault.km_at_fault && <span>KM: <strong>{parseInt(fault.km_at_fault).toLocaleString()}</strong></span>}
          {fault.resolved_date && <span>Çözüm: <strong>{format(new Date(fault.resolved_date), 'dd.MM.yyyy')}</strong></span>}
          {fault.repair_cost && <span>Tamir Maliyeti: <strong>₺{parseFloat(fault.repair_cost).toFixed(2)}</strong></span>}
          {fault.downtime_days && <span>Duruş: <strong>{fault.downtime_days} gün</strong></span>}
        </div>
      </div>

      {/* Fotoğraflar */}
      {fault.images?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-3">Fotoğraflar</h2>
          <div className="flex flex-wrap gap-3">
            {fault.images.map((img, i) => (
              <a key={i} href={`/uploads/${img}`} target="_blank" rel="noreferrer">
                <img src={`/uploads/${img}`} alt={`arıza-${i}`} className="w-24 h-24 object-cover rounded-lg border border-slate-200 hover:opacity-80" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Fotoğraf Yükle */}
      {canEdit && fault.status !== 'resolved' && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer btn-secondary w-fit text-sm">
            <Upload size={15} /> Fotoğraf Yükle
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      )}

      {/* Aktivite / Yorumlar */}
      <div className="card">
        <h2 className="font-semibold text-slate-700 mb-4">Aktivite</h2>
        <div className="space-y-3">
          {fault.activities?.length === 0 && <p className="text-sm text-slate-400">Henüz aktivite yok.</p>}
          {fault.activities?.map((a) => (
            <div key={a.id} className="flex gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${a.activity_type === 'comment' ? 'bg-blue-400' : 'bg-slate-300'}`} />
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-medium text-slate-600">{a.user_name}</span>
                  <span>{format(new Date(a.created_at), 'dd.MM.yyyy HH:mm')}</span>
                  {a.activity_type !== 'comment' && <span className="text-slate-400 capitalize">[{a.activity_type}]</span>}
                </div>
                <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{a.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Yorum Ekle */}
        <div className="mt-4 flex gap-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="input flex-1"
            rows={2}
            placeholder="Yorum yaz..."
          />
          <button
            onClick={() => commentMutation.mutate({ content: commentText })}
            disabled={!commentText.trim() || commentMutation.isPending}
            className="btn-primary self-end"
          >
            <MessageSquare size={15} /> Ekle
          </button>
        </div>
      </div>

      {/* Çözüm Modal */}
      <Modal isOpen={resolveModal} onClose={() => setResolveModal(false)} title="Arızayı Çözdü Olarak Kapat">
        <form onSubmit={handleR(statusMutation.mutate)} className="space-y-4">
          <input type="hidden" {...regR('status')} value="resolved" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Çözüm Tarihi</label>
              <input {...regR('resolved_date')} type="date" className="input" />
            </div>
            <div>
              <label className="label">Tamir Maliyeti (₺)</label>
              <input {...regR('repair_cost', { valueAsNumber: true })} type="number" step="0.01" className="input" />
            </div>
            <div>
              <label className="label">Duruş (Gün)</label>
              <input {...regR('downtime_days', { valueAsNumber: true })} type="number" className="input" />
            </div>
            <div>
              <label className="label">Servis</label>
              <input {...regR('resolved_by')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Çözüm Notu</label>
            <textarea {...regR('resolution_notes')} className="input" rows={3} />
          </div>
          <button type="submit" disabled={statusMutation.isPending} className="btn-success w-full justify-center">
            {statusMutation.isPending ? 'Kaydediliyor...' : 'Çözüldü Olarak Kapat'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
