import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getFuelMonthly, getMaintenanceCost, getVehicleCosts, getKmMonthly } from '../services/api'
import { PageLoader } from '../components/ui/Common'

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function buildMonthlyData(fuelData, maintData) {
  return MONTHS.map((name, i) => {
    const monthNum = i + 1
    const fuel = fuelData?.find(r => parseInt(r.month) === monthNum)
    const maint = maintData?.find(r => parseInt(r.month) === monthNum)
    return {
      name,
      'Yakıt': parseFloat(fuel?.total_cost || 0).toFixed(0),
      'Bakım': parseFloat(maint?.total_cost || 0).toFixed(0),
    }
  })
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const { data: fuelData, isLoading: l1 } = useQuery({
    queryKey: ['fuel-monthly', year],
    queryFn: () => getFuelMonthly({ year }),
  })
  const { data: maintData, isLoading: l2 } = useQuery({
    queryKey: ['maint-cost', year],
    queryFn: () => getMaintenanceCost({ year }),
  })
  const { data: vehicleCosts, isLoading: l3 } = useQuery({
    queryKey: ['vehicle-costs', year],
    queryFn: () => getVehicleCosts({ year }),
  })
  const { data: kmData, isLoading: l4 } = useQuery({
    queryKey: ['km-monthly', year],
    queryFn: () => getKmMonthly({ year }),
  })

  const isLoading = l1 || l2 || l3 || l4

  const monthlyData = buildMonthlyData(fuelData, maintData)

  const kmMonthlyData = MONTHS.map((name, i) => {
    const monthNum = i + 1
    const km = kmData?.find(r => parseInt(r.month) === monthNum)
    return { name, 'KM': parseInt(km?.km_driven || 0) }
  })

  const vehicleChartData = vehicleCosts?.slice(0, 15).map(v => ({
    name: v.plate_no,
    'Yakıt': parseFloat(v.fuel_cost || 0).toFixed(0),
    'Bakım': parseFloat(v.maintenance_cost || 0).toFixed(0),
  })) || []

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Raporlar</h1>
          <p className="text-sm text-slate-500">Filo maliyet ve kilometre analizleri</p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input w-28">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* Aylık Maliyet Grafiği */}
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-4">Aylık Yakıt & Bakım Maliyeti ({year})</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₺${Number(v).toLocaleString()}`} />
                <Tooltip formatter={(v) => `₺${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Yakıt" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Bakım" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aylık KM Grafiği */}
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-4">Aylık Toplam Kilometre ({year})</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kmMonthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${Number(v).toLocaleString()}`} />
                <Tooltip formatter={(v) => `${Number(v).toLocaleString()} km`} />
                <Bar dataKey="KM" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Araç Bazlı Maliyet */}
          <div className="card">
            <h2 className="font-semibold text-slate-700 mb-4">Araç Bazlı Toplam Maliyet ({year})</h2>
            {vehicleChartData.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Bu yıl için veri bulunamadı.</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={vehicleChartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => `₺${Number(v).toLocaleString()}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `₺${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Yakıt" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="Bakım" fill="#f59e0b" stackId="a" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Araç Bazlı Tablo */}
          {vehicleCosts?.length > 0 && (
            <div className="card overflow-auto">
              <h2 className="font-semibold text-slate-700 mb-3">Araç Maliyet Detayı ({year})</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Araç</th>
                    <th>Yakıt Maliyeti</th>
                    <th>Bakım Maliyeti</th>
                    <th>Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleCosts.map(v => (
                    <tr key={v.vehicle_id}>
                      <td className="font-medium">{v.plate_no} <span className="text-slate-400 font-normal">{v.brand} {v.model}</span></td>
                      <td>₺{parseFloat(v.fuel_cost || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                      <td>₺{parseFloat(v.maintenance_cost || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                      <td className="font-semibold">₺{(parseFloat(v.fuel_cost || 0) + parseFloat(v.maintenance_cost || 0)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
