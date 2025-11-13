import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function CheckIn() {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [checkinHistory, setCheckinHistory] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    confirmados: 0,
    presentes: 0,
  });
  const [manualCheckIn, setManualCheckIn] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  useEffect(() => {
    loadEvents();
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadStats();
      loadCheckinHistory();
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

      // Selecionar o primeiro evento ou o último usado
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

  const loadStats = async () => {
    if (!selectedEventId) return;

    try {
      const { data, error } = await supabase
        .from("convidados")
        .select("confirmado, checkin")
        .eq("evento_id", selectedEventId);

      if (error) throw error;

      const stats = {
        total: data.length,
        confirmados: data.filter((g) => g.confirmado).length,
        presentes: data.filter((g) => g.checkin).length,
      };

      setStats(stats);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const loadCheckinHistory = async () => {
    if (!selectedEventId) return;

    try {
      const { data, error } = await supabase
        .from("convidados")
        .select("*")
        .eq("evento_id", selectedEventId)
        .eq("checkin", true)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setCheckinHistory(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const startScanner = () => {
    if (scanner) return;

    const html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanFailure
      )
      .then(() => {
        setScanner(html5QrCode);
        setIsScanning(true);
      })
      .catch((err) => {
        console.error("Erro ao iniciar a câmara:", err);
        toast.error("Não foi possível iniciar a câmara");
      });
  };

  const stopScanner = () => {
    if (!scanner) return;

    scanner
      .stop()
      .then(() => {
        scanner.clear();
        setScanner(null);
        setIsScanning(false);
      })
      .catch((err) => console.error("Erro ao parar scanner:", err));
  };

  const onScanSuccess = async (decodedText) => {
    try {
      // Parse dos dados do QR code
      const qrData = JSON.parse(decodedText);

      if (!qrData.id) {
        toast.error("QR Code inválido");
        return;
      }

      await processCheckIn(qrData.id);
    } catch (error) {
      console.error("Erro ao processar QR code:", error);
      toast.error("QR Code inválido");
    }
  };

  const onScanFailure = (error) => {
    // Silently handle scan failures
    console.log("QR scan failure:", error);
  };

  const processCheckIn = async (guestId) => {
    try {
      // Verificar se o convidado existe e pertence ao evento selecionado
      const { data: guest, error: fetchError } = await supabase
        .from("convidados")
        .select("*")
        .eq("id", guestId)
        .eq("evento_id", selectedEventId)
        .single();

      if (fetchError || !guest) {
        toast.error("Convidado não encontrado neste evento");
        return;
      }

      if (guest.checkin) {
        toast.warning(`${guest.nome} já fez check-in anteriormente`);
        setLastCheckin({ ...guest, alreadyCheckedIn: true });
        return;
      }

      // Atualizar check-in
      const { error: updateError } = await supabase
        .from("convidados")
        .update({
          checkin: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guestId);

      if (updateError) throw updateError;

      // Sucesso
      setLastCheckin({ ...guest, alreadyCheckedIn: false });
      toast.success(`✅ Check-in efetuado: ${guest.nome} — Mesa ${guest.mesa}`);

      // Atualizar estatísticas e histórico
      loadStats();
      loadCheckinHistory();

      // Vibrar o dispositivo se suportado
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.error("Erro ao fazer check-in:", error);
      toast.error("Erro ao processar check-in");
    }
  };

  const handleManualCheckIn = async (e) => {
    e.preventDefault();
    if (!manualCheckIn.trim()) return;

    try {
      // Buscar convidado por nome ou email
      const { data, error } = await supabase
        .from("convidados")
        .select("*")
        .eq("evento_id", selectedEventId)
        .or(`nome.ilike.%${manualCheckIn}%,email.ilike.%${manualCheckIn}%`)
        .limit(1)
        .single();

      if (error || !data) {
        toast.error("Convidado não encontrado");
        return;
      }

      await processCheckIn(data.id);
      setManualCheckIn("");
    } catch (error) {
      console.error("Erro no check-in manual:", error);
      toast.error("Erro ao processar check-in manual");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Seletor de Evento */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Check-in de Convidados
          </h1>
          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um evento</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.nome} -{" "}
                  {new Date(event.data).toLocaleDateString("pt-PT")}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Convidados</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {stats.confirmados}
            </p>
            <p className="text-sm text-gray-600">Confirmados</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {stats.presentes}
            </p>
            <p className="text-sm text-gray-600">Presentes</p>
          </div>
        </div>
      </div>

      {selectedEventId && (
        <>
          {/* Scanner de QR Code */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Scanner QR Code
            </h2>

            <div className="text-center mb-4">
              {!isScanning ? (
                <button
                  onClick={startScanner}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition"
                >
                  📷 Iniciar Scanner
                </button>
              ) : (
                <button
                  onClick={stopScanner}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                >
                  Parar Scanner
                </button>
              )}
            </div>

            {/* Este div passa a existir SEMPRE no DOM */}
            <div
              id="qr-reader"
              className={`mx-auto ${isScanning ? "" : "hidden"}`}
              style={{ maxWidth: "500px" }}
            ></div>

            {/* Último check-in */}
            {lastCheckin && (
              <div
                className={`mt-6 p-4 rounded-lg ${
                  lastCheckin.alreadyCheckedIn
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-green-50 border-green-200"
                } border`}
              >
                <p className="font-medium text-gray-900 text-lg">
                  {lastCheckin.alreadyCheckedIn ? "⚠️" : "✅"}{" "}
                  {lastCheckin.nome}
                </p>
                <p className="text-gray-600">Mesa {lastCheckin.mesa}</p>
                {lastCheckin.alreadyCheckedIn && (
                  <p className="text-sm text-yellow-700 mt-1">
                    Já tinha feito check-in anteriormente
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Check-in Manual */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Check-in Manual
            </h2>
            <form onSubmit={handleManualCheckIn} className="flex gap-2">
              <input
                type="text"
                value={manualCheckIn}
                onChange={(e) => setManualCheckIn(e.target.value)}
                placeholder="Nome ou email do convidado"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
              >
                Check-in
              </button>
            </form>
          </div>

          {/* Histórico de Check-ins */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Últimos Check-ins
            </h2>
            {checkinHistory.length > 0 ? (
              <div className="space-y-2">
                {checkinHistory.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{guest.nome}</p>
                      <p className="text-sm text-gray-600">Mesa {guest.mesa}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(guest.updated_at).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Nenhum check-in realizado ainda
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CheckIn;
