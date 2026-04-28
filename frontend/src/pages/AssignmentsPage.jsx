import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ClipboardList } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getAssignments, createAssignment, returnAssignment, getVehicles, getDrivers } from '../services/api'
import { PageLoader, EmptyState } from '../components/ui/Common'
import { StatusBadge } from '../components/ui/Badges'
import Modal from '../components/ui/Modal'
import { useAuthStore } from '../store/authStore'

export default function AssignmentsPage() {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canEdit = ['admin', 'manager'].includes(user?.role)
  const [modalOpen, setModalOpen] = useState(false)
  const [returnModal, setReturnModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('active')

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', statusFilter],
    queryFn: () => getAssignments({ status: statusFilter || undefined }),
  })
  const { data: vehicles } = useQuery({ queryKey: ['vehicles'], queryFn: () => getVehicles({ status: 'active' }) })
  const { data: drivers } = useQuery({ queryKey: ['drivers'], queryFn: () => getDrivers({ status: 'active' }) })

  const { register: regA, handleSubmit: handleA, reset: resetA } = useForm({
    defaultValues: { assigned_date: format(new Date(), 'yyyy-MM-dd') }
  })
  const { register: regR, handleSubmit: handleR } = useForm({
    defaultValues: { return_date: format(new Date(), 'yyyy-MM-dd') }
  })

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setModalOpen(false); resetA(); toast.success('Zimmet oluşturuldu.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })
  const returnMutation = useMutation({
    mutationFn: ({ id, data }) => returnAssignment(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setReturnModal(null); toast.success('Zimmet iade alındı.') },
    onError: (err) => toast.error(err.response?.data?.error || 'Hata oluştu.'),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Zimmetler</h1>
          <p className="text-sm text-slate-500">Araç - Sürücü atama kayıtları</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Zimmet Oluştur
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {['active', 'returned', ''].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`btn text-sm py-1.5 px-4 ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
          >
            {s === 'active' ? 'Aktif' : s === 'returned' ? 'İade Edilmiş' : 'Tümü'}
          </button>
        ))}
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Araç</th>
                <th>Sürücü</th>
                <th>Zimmet Tarihi</th>
                <th>KM (Zimmet)</th>
                <th>İade Tarihi</th>
                <th>KM (İade)</th>
                <th>Durum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {!assignments?.length ? (
                <tr><td colSpan={8}><EmptyState icon={ClipboardList} title="Zimmet kaydı bulunamadı" /></td></tr>
              ) : assignments.map(a => (
                <tr key={a.id}>
                  <td className="font-medium">{a.plate_no} <span className="text-slate-400 font-normal">{a.brand} {a.model}</span></td>
                  <td>{a.driver_name}</td>
                  <td>{format(new Date(a.assigned_date), 'dd.MM.yyyy')}</td>
                  <td>{a.km_at_assignment?.toLocaleString('tr-TR') || '—'}</td>
                  <td>{a.return_date ? format(new Date(a.return_date), 'dd.MM.yyyy') : '—'}</td>
                  <td>{a.km_at_return?.toLocaleString('tr-TR') || '—'}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    {canEdit && a.status === 'active' && (
                      <button
                        onClick={() => setReturnModal(a)}
                        className="btn btn-warning text-xs py-1"
                      >
                        İade Al
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Zimmet Oluştur Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Zimmet Oluştur">
        <form onSubmit={handleA((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Araç *</label>
            <select {...regA('vehicle_id', { required: true, valueAsNumber: true })} className="input">
              <option value="">Araç seçin</option>
              {vehicles?.data?.filter(v => v.status === 'active').map(v => (
                <option key={v.id} value={v.id}>{v.plate_no} - {v.brand} {v.model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sürücü *</label>
            <select {...regA('driver_id', { required: true, valueAsNumber: true })} className="input">
              <option value="">Sürücü seçin</option>
              {drivers?.filter(d => d.status === 'active').map(d => (
                <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Zimmet Tarihi *</label>
              <input {...regA('assigned_date', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="label">KM (Zimmet Anı)</label>
              <input {...regA('km_at_assignment', { valueAsNumber: true })} type="number" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Kullanım Amacı</label>
            <input {...regA('purpose')} className="input" />
          </div>
          <div>
            <label className="label">Notlar</label>
            <textarea {...regA('notes')} className="input" rows={2} />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full justify-center">
            {createMutation.isPending ? 'Kaydediliyor...' : 'Zimmet Oluştur'}
          </button>
        </form>
      </Modal>

      {/* İade Modal */}
      <Modal isOpen={!!returnModal} onClose={() => setReturnModal(null)} title="Zimmet İadesi">
        {returnModal && (
          <form onSubmit={handleR((d) => returnMutation.mutate({ id: returnModal.id, data: d }))} className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>{returnModal.plate_no}</strong> plakalı araç - <strong>{returnModal.driver_name}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">İade Tarihi *</label>
                <input {...regR('return_date', { required: true })} type="date" className="input" />
              </div>
              <div>
                <label className="label">İade KM *</label>
                <input {...regR('km_at_return', { required: true, valueAsNumber: true })} type="number" className="input" />
              </div>
            </div>
            <div>
              <label className="label">Notlar</label>
              <textarea {...regR('notes')} className="input" rows={2} />
            </div>
            <button type="submit" disabled={returnMutation.isPending} className="btn-success w-full justify-center">
              {returnMutation.isPending ? 'Kaydediliyor...' : 'İade Onayla'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}
