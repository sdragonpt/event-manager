import { useState } from "react";
import toast from "react-hot-toast";

const ACCESS_CODE = "UTAD2025"; // <-- muda para o código que quiseres

function Login({ onLogin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("Introduza o código de acesso");
      return;
    }

    setLoading(true);

    // Aqui é só um check simples em memória
    if (code.trim() === ACCESS_CODE) {
      toast.success("Login efetuado com sucesso!");
      onLogin(); // avisa o App que ficou autenticado
    } else {
      toast.error("Código de acesso inválido");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Acesso ao Gestor de Eventos
        </h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          Introduza o código de acesso para gerir eventos, convidados e
          check-in.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="access-code"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Código de acesso
            </label>
            <input
              id="access-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder=""
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "A validar..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <p className="text-xs text-blue-700">
            O acesso é reservado à equipa de organização para criar eventos,
            fazer upload de convidados, gerir confirmações e realizar check-in.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
