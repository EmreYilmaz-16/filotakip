import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import VehiclesPage from './pages/VehiclesPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import DriversPage from './pages/DriversPage'
import AssignmentsPage from './pages/AssignmentsPage'
import FuelPage from './pages/FuelPage'
import MaintenancePage from './pages/MaintenancePage'
import FaultsPage from './pages/FaultsPage'
import FaultDetailPage from './pages/FaultDetailPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import TripsPage from './pages/TripsPage'
import DriverDocsPage from './pages/DriverDocsPage'
import TaxesPage from './pages/TaxesPage'
import AccidentsPage from './pages/AccidentsPage'
import AccidentDetailPage from './pages/AccidentDetailPage'
import TiresPage from './pages/TiresPage'
import TireDetailPage from './pages/TireDetailPage'
import InspectionsPage from './pages/InspectionsPage'
import InspectionFormPage from './pages/InspectionFormPage'
import InspectionDetailPage from './pages/InspectionDetailPage'

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="fuel" element={<FuelPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="faults" element={<FaultsPage />} />
          <Route path="faults/:id" element={<FaultDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="driver-docs" element={<DriverDocsPage />} />
          <Route path="taxes" element={<TaxesPage />} />
          <Route path="accidents" element={<AccidentsPage />} />
          <Route path="accidents/:id" element={<AccidentDetailPage />} />
          <Route path="tires" element={<TiresPage />} />
          <Route path="tires/:id" element={<TireDetailPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route path="inspections/new" element={<InspectionFormPage />} />
          <Route path="inspections/:id" element={<InspectionDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
