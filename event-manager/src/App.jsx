import { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import CreateEvent from "./components/CreateEvent";
import UploadGuests from "./components/UploadGuests";
import Confirm from "./components/Confirm";
import CheckIn from "./components/CheckIn";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import EditEvent from "./components/EditEvent";

function App() {
  const location = useLocation();

  // autenticação com persistência no localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("isAuthenticated") === "true";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Não mostrar navegação na página de confirmação nem na página de login
  const showNav =
    !location.pathname.includes("/confirmar") &&
    !location.pathname.includes("/login");

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem("isAuthenticated", "true");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
    setMobileOpen(false);
  };

  // Fechar menu mobile quando mudar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // wrapper para proteger rotas
  const RequireAuth = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && (
        <>
          <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center space-x-8">
                  <Link
                    to="/"
                    className="flex items-center space-x-2 text-xl font-semibold text-gray-900 hover:text-blue-600 transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-2xl">📅</span>
                    <span className="hidden sm:inline">Gestor de Eventos</span>
                  </Link>
                  {/* Menu desktop */}
                  <div className="hidden md:flex space-x-1">
                    <Link
                      to="/"
                      className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                        location.pathname === "/"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      Criar Evento
                    </Link>
                    <Link
                      to="/upload"
                      className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                        location.pathname === "/upload"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      Convidados
                    </Link>
                    <Link
                      to="/checkin"
                      className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                        location.pathname === "/checkin"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      Check-in
                    </Link>
                    <Link
                      to="/dashboard"
                      className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                        location.pathname === "/dashboard"
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      Dashboard
                    </Link>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Botão de Logout desktop */}
                  {isAuthenticated && (
                    <button
                      onClick={handleLogout}
                      className="hidden md:flex items-center space-x-1 text-red-600 hover:text-red-700 px-3 py-2 text-sm font-medium transition"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Sair</span>
                    </button>
                  )}

                  {/* Menu mobile (botão) */}
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          mobileOpen
                            ? "M6 18L18 6M6 6l12 12"
                            : "M4 6h16M4 12h16M4 18h16"
                        }
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Menu mobile (lista de links) */}
          {mobileOpen && (
            <div className="md:hidden bg-white shadow-lg border-b">
              <div className="px-4 py-3 space-y-1">
                <Link
                  to="/"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition ${
                    location.pathname === "/"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Criar Evento
                </Link>
                <Link
                  to="/upload"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition ${
                    location.pathname === "/upload"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Convidados
                </Link>
                <Link
                  to="/checkin"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition ${
                    location.pathname === "/checkin"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Check-in
                </Link>
                <Link
                  to="/dashboard"
                  className={`block px-3 py-2 rounded-md text-base font-medium transition ${
                    location.pathname === "/dashboard"
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Dashboard
                </Link>
                {isAuthenticated && (
                  <>
                    <div className="border-t my-2"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Sair
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <main className={showNav ? "py-6 sm:py-8" : ""}>
        <Routes>
          {/* login é público */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          {/* confirmar é público (sem login) */}
          <Route path="/confirmar" element={<Confirm />} />

          {/* rotas protegidas */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <CreateEvent />
              </RequireAuth>
            }
          />
          <Route
            path="/upload"
            element={
              <RequireAuth>
                <UploadGuests />
              </RequireAuth>
            }
          />
          <Route
            path="/checkin"
            element={
              <RequireAuth>
                <CheckIn />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/eventos/:id/editar"
            element={
              <RequireAuth>
                <EditEvent />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
