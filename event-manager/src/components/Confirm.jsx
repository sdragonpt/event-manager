import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function Confirm() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(null);
  const [event, setEvent] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [qrData, setQrData] = useState("");
  const qrRef = useRef(null);

  useEffect(() => {
    loadGuestData();
  }, []);

  const loadGuestData = async () => {
    const guestId = searchParams.get("id");

    if (!guestId) {
      toast.error("Link inválido - ID do convidado não encontrado");
      setLoading(false);
      return;
    }

    try {
      // Buscar dados do convidado
      const { data: guestData, error: guestError } = await supabase
        .from("convidados")
        .select("*")
        .eq("id", guestId)
        .single();

      if (guestError) throw guestError;

      setGuest(guestData);
      setConfirmed(guestData.confirmado);

      // Buscar dados do evento
      const { data: eventData, error: eventError } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", guestData.evento_id)
        .single();

      if (eventError) throw eventError;

      setEvent(eventData);

      // Gerar dados do QR code
      const qrString = JSON.stringify({
        id: guestData.id,
        nome: guestData.nome,
      });
      setQrData(qrString);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do convidado");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!guest) return;

    setLoading(true);

    try {
      // Atualizar confirmação no banco
      const { error } = await supabase
        .from("convidados")
        .update({ confirmado: true })
        .eq("id", guest.id);

      if (error) throw error;

      // Salvar QR code no storage
      await saveQRCodeToStorage();

      setConfirmed(true);
      toast.success("Presença confirmada com sucesso!");
    } catch (error) {
      console.error("Erro ao confirmar presença:", error);
      toast.error("Erro ao confirmar presença");
    } finally {
      setLoading(false);
    }
  };

  const saveQRCodeToStorage = async () => {
    if (!qrRef.current) return;

    try {
      // Converter QR code para blob
      const canvas = qrRef.current.querySelector("canvas");
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));

      // Upload para Supabase Storage
      const fileName = `qrcodes/${guest.id}.png`;
      const { error } = await supabase.storage
        .from("qrcodes")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Erro ao salvar QR code:", error);
      // Não vamos mostrar erro ao utilizador pois a confirmação já foi feita
    }
  };

  const downloadQRCode = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `qrcode-${guest.nome.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code descarregado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!guest || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Link Inválido
          </h1>
          <p className="text-gray-600">
            O link de confirmação não é válido ou expirou.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header do evento */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">{event.nome}</h1>
            <div className="flex items-center space-x-4 text-blue-100">
              <span className="flex items-center">
                📅 {new Date(event.data).toLocaleDateString("pt-PT")}
              </span>
              <span className="flex items-center">🕐 {event.hora}</span>
            </div>
            <p className="mt-2 flex items-center text-blue-100">
              📍 {event.local}
            </p>
          </div>

          {/* Informações do convidado */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{guest.nome}</h2>
              {guest.mesa ? (
                <p className="text-lg text-gray-600 mt-2">Mesa {guest.mesa}</p>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  A sua mesa será atribuída pela organização após a confirmação.
                </p>
              )}
            </div>

            {!confirmed ? (
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Por favor, confirme a sua presença no evento clicando no botão
                  abaixo.
                </p>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? "A confirmar..." : "✓ Confirmar Presença"}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 font-medium flex items-center justify-center">
                    <span className="text-2xl mr-2">✓</span>
                    Presença Confirmada!
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Seu QR Code para Check-in
                  </h3>

                  <div ref={qrRef} className="flex justify-center mb-4">
                    <div className="p-4 bg-white rounded-lg shadow-md">
                      <QRCodeCanvas
                        value={qrData}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Apresente este QR Code na entrada do evento
                  </p>

                  <button
                    onClick={downloadQRCode}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Descarregar QR Code
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Informações importantes:
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Guarde este QR Code no seu telemóvel</li>
                    <li>• Apresente-o na entrada do evento</li>
                    <li>• Cada QR Code é único e intransmissível</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Confirm;
