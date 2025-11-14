import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    confirmados: 0,
    rejeitados: 0,
    presentes: 0,
    pendentes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' ou 'cards' para mobile
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadEventData();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);

      if (data && data.length > 0) {
        const lastEventId = localStorage.getItem("currentEventId");
        const eventToSelect = data.find((e) => e.id === lastEventId) || data[0];
        setSelectedEvent(eventToSelect);
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  const loadEventData = async () => {
    if (!selectedEvent) return;

    try {
      const { data, error } = await supabase
        .from("convidados")
        .select("*")
        .eq("evento_id", selectedEvent.id)
        .order("nome");

      if (error) throw error;

      setGuests(data || []);

      const stats = {
        total: data.length,
        confirmados: data.filter((g) => g.confirmado).length,
        rejeitados: data.filter((g) => g.rejeitado).length,
        presentes: data.filter((g) => g.checkin).length,
        pendentes: data.filter((g) => !g.confirmado && !g.rejeitado).length,
      };
      setStats(stats);

      localStorage.setItem("currentEventId", selectedEvent.id);
    } catch (error) {
      console.error("Erro ao carregar convidados:", error);
      toast.error("Erro ao carregar dados do evento");
    }
  };

  const handleEventChange = (eventId) => {
    const event = events.find((e) => e.id === eventId);
    setSelectedEvent(event);
  };

  const toggleConfirmation = async (guestId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("convidados")
        .update({ confirmado: !currentStatus, rejeitado: false })
        .eq("id", guestId);

      if (error) throw error;

      toast.success("Status atualizado");
      loadEventData();
    } catch (error) {
      console.error("Erro ao atualizar confirmação:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const toggleCheckin = async (guestId, currentStatus) => {
    try {
      const { error } = await supabase
        .from("convidados")
        .update({ checkin: !currentStatus })
        .eq("id", guestId);

      if (error) throw error;

      toast.success("Check-in atualizado");
      loadEventData();
    } catch (error) {
      console.error("Erro ao atualizar check-in:", error);
      toast.error("Erro ao atualizar check-in");
    }
  };

  const updateMesa = async (guestId, newMesa) => {
    try {
      const { error } = await supabase
        .from("convidados")
        .update({ mesa: newMesa || null })
        .eq("id", guestId);

      if (error) throw error;

      toast.success("Mesa atualizada");
      loadEventData();
    } catch (error) {
      console.error("Erro ao atualizar mesa:", error);
      toast.error("Erro ao atualizar mesa");
    }
  };

  const deleteGuest = async (guestId) => {
    if (!window.confirm("Tem a certeza que deseja remover este convidado?"))
      return;

    try {
      const { error } = await supabase
        .from("convidados")
        .delete()
        .eq("id", guestId);

      if (error) throw error;

      toast.success("Convidado removido");
      loadEventData();
    } catch (error) {
      console.error("Erro ao remover convidado:", error);
      toast.error("Erro ao remover convidado");
    }
  };

  const exportToCSV = () => {
    if (guests.length === 0) {
      toast.error("Nenhum convidado para exportar");
      return;
    }

    const headers = [
      "Nome",
      "Email",
      "Mesa",
      "Confirmado",
      "Rejeitado",
      "Check-in",
    ];
    const rows = guests.map((g) => [
      g.nome,
      g.email,
      g.mesa,
      g.confirmado ? "Sim" : "Não",
      g.rejeitado ? "Sim" : "Não",
      g.checkin ? "Sim" : "Não",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `convidados-${selectedEvent.nome.replace(/\s+/g, "-")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Ficheiro CSV exportado");
  };

  const filteredGuests = guests.filter(
    (guest) =>
      guest.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guest.mesa && guest.mesa.toString().includes(searchTerm))
  );

  // Formatar hora sem segundos
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Cabeçalho e Seletor de Evento */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          {events.length > 0 && (
            <select
              value={selectedEvent?.id || ""}
              onChange={(e) => handleEventChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.nome} -{" "}
                  {new Date(event.data).toLocaleDateString("pt-PT")} às{" "}
                  {formatTime(event.hora)}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedEvent && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg overflow-hidden border border-blue-200">
            {selectedEvent.imagem_url && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={selectedEvent.imagem_url}
                  alt={selectedEvent.nome}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📅</span>
                    <h2 className="text-xl font-bold">{selectedEvent.nome}</h2>
                  </div>
                </div>
              </div>
            )}
            <div className="p-4">
              {!selectedEvent.imagem_url && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📅</span>
                  <h2 className="text-xl font-bold text-blue-900">
                    {selectedEvent.nome}
                  </h2>
                </div>
              )}
              <p className="text-blue-700">
                <span className="font-medium">Data:</span>{" "}
                {new Date(selectedEvent.data).toLocaleDateString("pt-PT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                às {formatTime(selectedEvent.hora)}
              </p>
              <p className="text-blue-700">
                <span className="font-medium">Local:</span>{" "}
                {selectedEvent.local}
              </p>

              {/* Botão para editar o evento */}
              <button
                onClick={() => navigate(`/eventos/${selectedEvent.id}/editar`)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                ✏️ Editar evento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      {selectedEvent && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition">
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-600 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition">
            <p className="text-3xl font-bold text-green-600">
              {stats.confirmados}
            </p>
            <p className="text-sm text-gray-600 mt-1">Confirmados</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition">
            <p className="text-3xl font-bold text-red-600">
              {stats.rejeitados}
            </p>
            <p className="text-sm text-gray-600 mt-1">Rejeitados</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition">
            <p className="text-3xl font-bold text-purple-600">
              {stats.presentes}
            </p>
            <p className="text-sm text-gray-600 mt-1">Presentes</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 text-center hover:shadow-lg transition">
            <p className="text-3xl font-bold text-yellow-600">
              {stats.pendentes}
            </p>
            <p className="text-sm text-gray-600 mt-1">Pendentes</p>
          </div>
        </div>
      )}

      {/* Lista de Convidados */}
      {selectedEvent && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Convidados</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition font-medium"
              >
                📥 Exportar CSV
              </button>
              <button
                onClick={() =>
                  setViewMode(viewMode === "table" ? "cards" : "table")
                }
                className="sm:hidden px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                {viewMode === "table" ? "📱 Vista Cartões" : "📋 Vista Tabela"}
              </button>
            </div>
          </div>

          {filteredGuests.length > 0 ? (
            <>
              {/* Vista em Cartões para mobile */}
              <div
                className={`${
                  viewMode === "cards" ? "block sm:hidden" : "hidden"
                } space-y-4`}
              >
                {filteredGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-lg">
                          {guest.nome}
                        </p>
                        <p className="text-sm text-gray-500">{guest.email}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Mesa:{" "}
                          <input
                            type="text"
                            defaultValue={guest.mesa || ""}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value !== (guest.mesa || "")) {
                                updateMesa(guest.id, value);
                              }
                            }}
                            className="inline-block w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="-"
                          />
                        </p>
                      </div>
                      <button
                        onClick={() => deleteGuest(guest.id)}
                        className="text-red-600 hover:text-red-800"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="flex space-x-2 mb-3">
                      <button
                        onClick={() =>
                          toggleConfirmation(guest.id, guest.confirmado)
                        }
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          guest.confirmado
                            ? "bg-green-100 text-green-800"
                            : guest.rejeitado
                            ? "bg-gray-100 text-gray-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {guest.confirmado
                          ? "✓ Confirmado"
                          : guest.rejeitado
                          ? "✗ Rejeitado"
                          : "Confirmar"}
                      </button>
                      <button
                        onClick={() => toggleCheckin(guest.id, guest.checkin)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          guest.checkin
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {guest.checkin ? "✓ Presente" : "Check-in"}
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        navigator.clipboard
                          .writeText(
                            `${window.location.origin}/confirmar?id=${guest.id}`
                          )
                          .then(() => toast.success("Link copiado!"))
                      }
                      className="w-full bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                    >
                      📋 Copiar Link de Confirmação
                    </button>
                  </div>
                ))}
              </div>

              {/* Vista em Tabela para desktop */}
              <div
                className={`${
                  viewMode === "table" ? "block" : "hidden sm:block"
                } overflow-x-auto`}
              >
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                        Email
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Mesa
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Check-in
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGuests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {guest.nome}
                            </p>
                            <p className="text-xs text-gray-500 md:hidden">
                              {guest.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                          {guest.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">
                          <input
                            type="text"
                            defaultValue={guest.mesa || ""}
                            onBlur={(e) => {
                              const value = e.target.value.trim();
                              if (value !== (guest.mesa || "")) {
                                updateMesa(guest.id, value);
                              }
                            }}
                            className="w-16 px-2 py-1 border-2 border-gray-200 rounded text-center text-sm"
                            placeholder="-"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              toggleConfirmation(guest.id, guest.confirmado)
                            }
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${
                              guest.confirmado
                                ? "bg-green-100 text-green-800"
                                : guest.rejeitado
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {guest.confirmado
                              ? "✓ Confirmado"
                              : guest.rejeitado
                              ? "✗ Rejeitado"
                              : "Pendente"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              toggleCheckin(guest.id, guest.checkin)
                            }
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${
                              guest.checkin
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {guest.checkin ? "✓ Sim" : "Não"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(
                                    `${window.location.origin}/confirmar?id=${guest.id}`
                                  )
                                  .then(() => toast.success("Link copiado!"))
                              }
                              className="text-blue-600 hover:text-blue-900"
                              title="Copiar link"
                            >
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
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteGuest(guest.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Remover"
                            >
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <p className="text-gray-500">
                {searchTerm
                  ? "Nenhum convidado encontrado com este termo de pesquisa"
                  : "Nenhum convidado adicionado ainda"}
              </p>
            </div>
          )}
        </div>
      )}

      {events.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum evento criado
          </h2>
          <p className="text-gray-600 mb-4">
            Crie o seu primeiro evento para começar a gerir convidados.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg"
          >
            Criar Evento
          </a>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
