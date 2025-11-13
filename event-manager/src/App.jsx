import { useState } from "react";
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import CreateEvent from "./components/CreateEvent";
import UploadGuests from "./components/UploadGuests";
import Confirm from "./components/Confirm";
import CheckIn from "./components/CheckIn";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";

function App() {
  const location = useLocation();

  // autenticação apenas em memória (por sessão)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Não mostrar navegação na página de confirmação nem na página de login
  const showNav =
    !location.pathname.includes("/confirmar") &&
    !location.pathname.includes("/login");

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMobileOpen(false);
  };

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
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center space-x-8">
                  <Link
                    to="/"
                    className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition"
                    onClick={() => setMobileOpen(false)}
                  >
                    📅 Gestor de Eventos
                  </Link>
                  {/* Menu desktop */}
                  <div className="hidden sm:flex space-x-6">
                    <Link
                      to="/"
                      className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                        location.pathname === "/"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : ""
                      }`}
                    >
                      Criar Evento
                    </Link>
                    <Link
                      to="/upload"
                      className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                        location.pathname === "/upload"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : ""
                      }`}
                    >
                      Upload Convidados
                    </Link>
                    <Link
                      to="/checkin"
                      className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                        location.pathname === "/checkin"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : ""
                      }`}
                    >
                      Check-in
                    </Link>
                    <Link
                      to="/dashboard"
                      className={`text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition ${
                        location.pathname === "/dashboard"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : ""
                      }`}
                    >
                      Dashboard
                    </Link>
                    {isAuthenticated && (
                      <button
                        onClick={handleLogout}
                        className="text-red-600 hover:text-red-700 px-3 py-2 text-sm font-medium transition"
                      >
                        Sair
                      </button>
                    )}
                  </div>
                </div>

                {/* Menu mobile (botão) */}
                <div className="sm:hidden flex items-center">
                  <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="text-gray-600 hover:text-gray-900 p-2 focus:outline-none"
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
                            ? "M6 18L18 6M6 6l12 12" // X
                            : "M4 6h16M4 12h16M4 18h16" // hambúrguer
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
            <div className="sm:hidden bg-white shadow-md border-b">
              <div className="px-4 py-3 space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 py-2 text-base"
                >
                  Criar Evento
                </Link>
                <Link
                  to="/upload"
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 py-2 text-base"
                >
                  Upload Convidados
                </Link>
                <Link
                  to="/checkin"
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 py-2 text-base"
                >
                  Check-in
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block text-gray-700 py-2 text-base"
                >
                  Dashboard
                </Link>
                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    className="block text-red-600 py-2 text-base"
                  >
                    Sair
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <main className={showNav ? "py-8" : ""}>
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
        </Routes>
      </main>
    </div>
  );
}

export default App;
