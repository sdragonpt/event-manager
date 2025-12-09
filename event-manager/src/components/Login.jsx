import { useState } from "react";
import toast from "react-hot-toast";

const ACCESS_CODES = {
  UTAD2025: "admin",
  alumni2025: "checkin",
};

function Login({ onLogin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("Introduza o código de acesso");
      return;
    }

    setLoading(true);
    const trimmed = code.trim();

    setTimeout(() => {
      const role = ACCESS_CODES[trimmed];

      if (role) {
        // se existir um papel associado a este código
        if (role === "admin") {
          toast.success("Login efetuado com sucesso (Acesso completo)!");
        } else {
          toast.success("Login efetuado com sucesso (Apenas Check-in)!");
        }
        onLogin(role); // passamos o papel para o App
      } else {
        toast.error("Código de acesso inválido");
        setCode("");
      }

      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-8 py-10 text-center relative overflow-hidden">
            {/* Padrão decorativo */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern
                    id="loginPattern"
                    x="0"
                    y="0"
                    width="40"
                    height="40"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="20" cy="20" r="2" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#loginPattern)" />
              </svg>
            </div>

            <div className="relative">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <span className="text-5xl">📅</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Gestor de Eventos
              </h1>
              <p className="text-blue-100 text-sm">
                Acesso à área administrativa
              </p>
            </div>
          </div>

          {/* Formulário */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="access-code"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Código de acesso
                </label>
                <div className="relative">
                  <input
                    id="access-code"
                    type={showCode ? "text" : "password"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Introduza o código"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showCode ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>A validar...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Entrar</span>
                  </>
                )}
              </button>
            </form>

            {/* Info sobre o acesso */}
            <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">ℹ️</span>
                <div>
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    Acesso Restrito
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    O acesso completo é reservado à equipa de organização.
                    Alguns códigos permitem apenas acesso ao módulo de check-in
                    para apoio operacional no dia do evento.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              © {new Date().getFullYear()} Gestor de Eventos UTAD - Todos os
              direitos reservados
            </p>
          </div>
        </div>

        {/* Recursos para organização */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Necessita de ajuda? Contacte o administrador do sistema
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
