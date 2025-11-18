import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

function UploadGuests() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [guests, setGuests] = useState([]);
  const [uploadedGuests, setUploadedGuests] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [copySuccess, setCopySuccess] = useState({});

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadSelectedEvent();
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);

      // Selecionar o último evento usado ou o primeiro disponível
      const lastEventId = localStorage.getItem("currentEventId");
      if (lastEventId && data?.some((e) => e.id === lastEventId)) {
        setSelectedEventId(lastEventId);
      } else if (data?.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar eventos");
    }
  };

  const loadSelectedEvent = async () => {
    if (!selectedEventId) {
      setCurrentEvent(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", selectedEventId)
        .single();

      if (error) throw error;
      setCurrentEvent(data);
      localStorage.setItem("currentEventId", selectedEventId);
    } catch (error) {
      console.error("Erro ao carregar evento:", error);
      toast.error("Erro ao carregar evento");
    }
  };

  const handleEventChange = (eventId) => {
    setSelectedEventId(eventId);
    setUploadedGuests([]); // Limpar lista de convidados carregados
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      parseCSV(file);
    }
  };

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      delimiter: ";", // Aceitar ponto-e-vírgula como delimitador
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const validGuests = results.data
          .filter(
            (row) =>
              row.nome && row.email && row.nome.trim() && row.email.trim()
          )
          .map((row) => ({
            nome: row.nome.trim(),
            email: row.email.trim().split(";")[0].trim(), // Pegar apenas o primeiro email se houver múltiplos
            mesa: row.mesa ? row.mesa.trim() : "", // Mesa é opcional
          }));

        setGuests(validGuests);

        if (validGuests.length === 0) {
          toast.error(
            "O ficheiro CSV não contém dados válidos. Certifique-se de incluir pelo menos as colunas: nome, email"
          );
        } else {
          toast.success(`${validGuests.length} convidados carregados do CSV`);
        }
      },
      error: (error) => {
        toast.error("Erro ao processar o ficheiro CSV: " + error.message);
      },
    });
  };

  const handleUpload = async () => {
    if (!currentEvent) {
      toast.error("Por favor, selecione um evento primeiro");
      return;
    }

    if (guests.length === 0) {
      toast.error("Nenhum convidado para fazer upload");
      return;
    }

    setLoading(true);

    try {
      const guestsWithIds = guests.map((guest) => ({
        id: uuidv4(),
        evento_id: currentEvent.id,
        nome: guest.nome,
        email: guest.email,
        mesa: guest.mesa || null,
        confirmado: false,
        rejeitado: false,
        checkin: false,
      }));

      const { data, error } = await supabase
        .from("convidados")
        .insert(guestsWithIds)
        .select();

      if (error) throw error;

      // Gerar links de confirmação
      const guestsWithLinks = data.map((guest) => ({
        ...guest,
        link: `${window.location.origin}/confirmar?id=${guest.id}`,
      }));

      setUploadedGuests(guestsWithLinks);
      toast.success(`${data.length} convidados adicionados com sucesso!`);
    } catch (error) {
      console.error("Erro ao fazer upload dos convidados:", error);
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (guestId, link) => {
    navigator.clipboard.writeText(link);
    setCopySuccess({ ...copySuccess, [guestId]: true });
    toast.success("Link copiado!");

    setTimeout(() => {
      setCopySuccess({ ...copySuccess, [guestId]: false });
    }, 2000);
  };

  const sendEmail = (email, link) => {
    const subject = encodeURIComponent(
      `Confirmação de Presença - ${currentEvent?.nome || "Evento"}`
    );
    const body = encodeURIComponent(
      `Olá,\n\nPor favor confirme a sua presença no evento clicando no link abaixo:\n\n${link}\n\nObrigado!`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  // Formatar hora sem segundos
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Upload de Convidados
        </h1>

        {/* Seletor de Evento */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o Evento
          </label>
          {events.length > 0 ? (
            <select
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um evento</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.nome} -{" "}
                  {new Date(event.data).toLocaleDateString("pt-PT")} às{" "}
                  {formatTime(event.hora)}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                Nenhum evento disponível. Por favor, crie um evento primeiro.
              </p>
            </div>
          )}
        </div>

        {currentEvent && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-1">
              Evento selecionado:
            </p>
            <p className="font-bold text-blue-900 text-lg">
              {currentEvent.nome}
            </p>
            <p className="text-sm text-blue-700">
              {new Date(currentEvent.data).toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              às {formatTime(currentEvent.hora)} - {currentEvent.local}
            </p>
          </div>
        )}

        {currentEvent && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ficheiro CSV (colunas: nome;email ou nome;email;mesa)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {guests.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Pré-visualização ({guests.length} convidados)
                </h3>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Nome
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Mesa
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {guests.slice(0, 10).map((guest, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {guest.nome}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {guest.email}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {guest.mesa}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {guests.length > 10 && (
                    <p className="text-sm text-gray-500 p-2 text-center">
                      ... e mais {guests.length - 10} convidados
                    </p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || guests.length === 0}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading
                ? "A fazer upload..."
                : `Fazer Upload de ${guests.length} Convidados`}
            </button>
          </div>
        )}
      </div>

      {/* Lista de convidados com links */}
      {uploadedGuests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Links de Confirmação
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Mesa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadedGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {guest.nome}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {guest.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {guest.mesa}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyLink(guest.id, guest.link)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {copySuccess[guest.id]
                            ? "✓ Copiado"
                            : "📋 Copiar Link"}
                        </button>
                        <button
                          onClick={() => sendEmail(guest.email, guest.link)}
                          className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          ✉️ Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exemplo de CSV */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Formato do ficheiro CSV (com ponto-e-vírgula):
            </p>
            <pre className="text-xs text-blue-700 bg-white p-2 rounded">
              {`nome;email;mesa
João Silva;joao@email.com;1
Maria Santos;maria@email.com;2
Pedro Costa;pedro@email.com;1`}
            </pre>
            <p className="text-xs text-blue-600 mt-2">
              * A coluna "mesa" é opcional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UploadGuests;
