import { Routes, Route, Link, useLocation } from 'react-router-dom'
import CreateEvent from './components/CreateEvent'
import UploadGuests from './components/UploadGuests'
import Confirm from './components/Confirm'
import CheckIn from './components/CheckIn'
import Dashboard from './components/Dashboard'

function App() {
  const location = useLocation()

  // Não mostrar navegação na página de confirmação
  const showNav = !location.pathname.includes('/confirmar')

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && (
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link 
                  to="/" 
                  className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition"
                >
                  📅 Gestor de Eventos
                </Link>
                <div className="hidden sm:flex space-x-6">
                  <Link 
                    to="/" 
                    className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                      location.pathname === '/' ? 'text-blue-600 border-b-2 border-blue-600' : ''
                    }`}
                  >
                    Criar Evento
                  </Link>
                  <Link 
                    to="/upload" 
                    className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                      location.pathname === '/upload' ? 'text-blue-600 border-b-2 border-blue-600' : ''
                    }`}
                  >
                    Upload Convidados
                  </Link>
                  <Link 
                    to="/checkin" 
                    className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                      location.pathname === '/checkin' ? 'text-blue-600 border-b-2 border-blue-600' : ''
                    }`}
                  >
                    Check-in
                  </Link>
                  <Link 
                    to="/dashboard" 
                    className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                      location.pathname === '/dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : ''
                    }`}
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
              {/* Menu mobile */}
              <div className="sm:hidden flex items-center">
                <button className="text-gray-600 hover:text-gray-900 p-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={showNav ? 'py-8' : ''}>
        <Routes>
          <Route path="/" element={<CreateEvent />} />
          <Route path="/upload" element={<UploadGuests />} />
          <Route path="/confirmar" element={<Confirm />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
