import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { login } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      navigate('/dashboard')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Giriş başarısız.')
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 p-3 rounded-2xl mb-3">
            <Truck size={36} className="text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Filo Takip</h1>
          <p className="text-sm text-slate-500 mt-1">Sisteme giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Kullanıcı Adı veya E-posta</label>
            <input
              {...register('username', { required: 'Bu alan zorunlu.' })}
              className="input"
              placeholder="admin"
              autoComplete="username"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="label">Şifre</label>
            <input
              {...register('password', { required: 'Bu alan zorunlu.' })}
              type="password"
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary w-full justify-center py-2.5"
          >
            {mutation.isPending ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Varsayılan: admin / Admin123!
        </p>
      </div>
    </div>
  )
}
