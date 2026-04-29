import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data).then(r => r.data)
export const getMe = () => api.get('/auth/me').then(r => r.data)
export const changePassword = (data) => api.post('/auth/change-password', data).then(r => r.data)

// Araçlar
export const getVehicles = (params) => api.get('/vehicles', { params }).then(r => r.data)
export const getVehicle = (id) => api.get(`/vehicles/${id}`).then(r => r.data)
export const createVehicle = (data) => api.post('/vehicles', data).then(r => r.data)
export const updateVehicle = (id, data) => api.put(`/vehicles/${id}`, data).then(r => r.data)
export const deleteVehicle = (id) => api.delete(`/vehicles/${id}`).then(r => r.data)
export const uploadVehicleImage = (id, formData) => api.post(`/vehicles/${id}/image`, formData).then(r => r.data)
export const getVehicleTypes = () => api.get('/vehicles/lookup/types').then(r => r.data)

// Sürücüler
export const getDrivers = (params) => api.get('/drivers', { params }).then(r => r.data)
export const getDriver = (id) => api.get(`/drivers/${id}`).then(r => r.data)
export const createDriver = (data) => api.post('/drivers', data).then(r => r.data)
export const updateDriver = (id, data) => api.put(`/drivers/${id}`, data).then(r => r.data)
export const deleteDriver = (id) => api.delete(`/drivers/${id}`).then(r => r.data)

// Zimmetler
export const getAssignments = (params) => api.get('/assignments', { params }).then(r => r.data)
export const createAssignment = (data) => api.post('/assignments', data).then(r => r.data)
export const returnAssignment = (id, data) => api.put(`/assignments/${id}/return`, data).then(r => r.data)

// Yakıt
export const getFuelRecords = (params) => api.get('/fuel', { params }).then(r => r.data)
export const createFuelRecord = (data) => api.post('/fuel', data).then(r => r.data)
export const deleteFuelRecord = (id) => api.delete(`/fuel/${id}`).then(r => r.data)
export const getFuelStats = (vehicleId) => api.get(`/fuel/stats/${vehicleId}`).then(r => r.data)

// KM
export const getKmRecords = (vehicleId) => api.get(`/km/${vehicleId}`).then(r => r.data)
export const createKmRecord = (data) => api.post('/km', data).then(r => r.data)

// Bakım
export const getMaintenanceSchedules = (params) => api.get('/maintenance/schedules', { params }).then(r => r.data)
export const createMaintenanceSchedule = (data) => api.post('/maintenance/schedules', data).then(r => r.data)
export const updateMaintenanceSchedule = (id, data) => api.put(`/maintenance/schedules/${id}`, data).then(r => r.data)
export const deleteMaintenanceSchedule = (id) => api.delete(`/maintenance/schedules/${id}`).then(r => r.data)
export const getMaintenanceRecords = (params) => api.get('/maintenance/records', { params }).then(r => r.data)
export const createMaintenanceRecord = (data) => api.post('/maintenance/records', data).then(r => r.data)
export const getMaintenanceTypes = () => api.get('/maintenance/types').then(r => r.data)

// Arızalar
export const getFaults = (params) => api.get('/faults', { params }).then(r => r.data)
export const getFault = (id) => api.get(`/faults/${id}`).then(r => r.data)
export const createFault = (data) => api.post('/faults', data).then(r => r.data)
export const updateFaultStatus = (id, data) => api.put(`/faults/${id}/status`, data).then(r => r.data)
export const addFaultComment = (id, data) => api.post(`/faults/${id}/comment`, data).then(r => r.data)
export const uploadFaultImages = (id, formData) => api.post(`/faults/${id}/images`, formData).then(r => r.data)

// Belgeler
export const getDocuments = (vehicleId) => api.get(`/documents/${vehicleId}`).then(r => r.data)
export const getExpiringDocuments = (params) => api.get('/documents/expiring/soon', { params }).then(r => r.data)
export const createDocument = (data) => api.post('/documents', data).then(r => r.data)
export const updateDocument = (id, data) => api.put(`/documents/${id}`, data).then(r => r.data)
export const deleteDocument = (id) => api.delete(`/documents/${id}`).then(r => r.data)

// Raporlar
export const getDashboard = () => api.get('/reports/dashboard').then(r => r.data)
export const getFuelMonthly = (params) => api.get('/reports/fuel-monthly', { params }).then(r => r.data)
export const getMaintenanceCost = (params) => api.get('/reports/maintenance-cost', { params }).then(r => r.data)
export const getVehicleCosts = (params) => api.get('/reports/vehicle-costs', { params }).then(r => r.data)
export const getKmMonthly = (params) => api.get('/reports/km-monthly', { params }).then(r => r.data)

// Kullanıcılar
export const getUsers = () => api.get('/users').then(r => r.data)
export const createUser = (data) => api.post('/users', data).then(r => r.data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then(r => r.data)

// Sefer Defteri
export const getTrips = (params) => api.get('/trips', { params }).then(r => r.data)
export const getTripStats = (params) => api.get('/trips/stats', { params }).then(r => r.data)
export const createTrip = (data) => api.post('/trips', data).then(r => r.data)
export const returnTrip = (id, data) => api.put(`/trips/${id}/return`, data).then(r => r.data)
export const updateTrip = (id, data) => api.put(`/trips/${id}`, data).then(r => r.data)
export const deleteTrip = (id) => api.delete(`/trips/${id}`).then(r => r.data)

// Sürücü Belgeleri
export const getDriverDocs = (params) => api.get('/driver-documents', { params }).then(r => r.data)
export const getDriverDocsByDriver = (driverId) => api.get(`/driver-documents/driver/${driverId}`).then(r => r.data)
export const createDriverDoc = (data) => api.post('/driver-documents', data).then(r => r.data)
export const updateDriverDoc = (id, data) => api.put(`/driver-documents/${id}`, data).then(r => r.data)
export const deleteDriverDoc = (id) => api.delete(`/driver-documents/${id}`).then(r => r.data)

// Araç Vergileri (MTV)
export const getVehicleTaxes = (params) => api.get('/vehicle-taxes', { params }).then(r => r.data)
export const getVehicleTaxSummary = (year) => api.get('/vehicle-taxes/summary', { params: { year } }).then(r => r.data)
export const createVehicleTax = (data) => api.post('/vehicle-taxes', data).then(r => r.data)
export const updateVehicleTax = (id, data) => api.put(`/vehicle-taxes/${id}`, data).then(r => r.data)
export const payVehicleTax = (id, data) => api.patch(`/vehicle-taxes/${id}/pay`, data || {}).then(r => r.data)
export const deleteVehicleTax = (id) => api.delete(`/vehicle-taxes/${id}`).then(r => r.data)

// Kaza / Hasar Kayıtları
export const getAccidents = (params) => api.get('/accidents', { params }).then(r => r.data)
export const getAccidentStats = () => api.get('/accidents/stats').then(r => r.data)
export const getAccident = (id) => api.get(`/accidents/${id}`).then(r => r.data)
export const createAccident = (data) => api.post('/accidents', data).then(r => r.data)
export const updateAccident = (id, data) => api.put(`/accidents/${id}`, data).then(r => r.data)
export const deleteAccident = (id) => api.delete(`/accidents/${id}`).then(r => r.data)

// Tires
export const getTires = (params) => api.get('/tires', { params }).then(r => r.data)
export const getTireStats = () => api.get('/tires/stats').then(r => r.data)
export const getTire = (id) => api.get(`/tires/${id}`).then(r => r.data)
export const createTire = (data) => api.post('/tires', data).then(r => r.data)
export const updateTire = (id, data) => api.put(`/tires/${id}`, data).then(r => r.data)
export const deleteTire = (id) => api.delete(`/tires/${id}`).then(r => r.data)
export const addTireHistory = (id, data) => api.post(`/tires/${id}/history`, data).then(r => r.data)

export default api
