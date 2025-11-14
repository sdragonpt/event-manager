import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function Confirm() {
  const [watchingTable, setWatchingTable] = useState(false);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(null);
  const [event, setEvent] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [qrData, setQrData] = useState("");
  const qrRef = useRef(null);

  useEffect(() => {
    loadGuestData();
  }, []);

  useEffect(() => {
    // só faz sentido “espiar” se:
    // - já temos o convidado
    // - ele já confirmou (está a ver o QR)
    if (!guest || !confirmed) return;

    // se ele já tem mesa e check-in, não precisamos de intervalos
    if (guest.checkin && guest.mesa) return;

    setWatchingTable(true);

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("convidados")
          .select("id, mesa, checkin")
          .eq("id", guest.id)
          .single();

        if (error) {
          console.error("Erro a verificar mesa:", error);
          return;
        }

        // quando o check-in estiver feito e a mesa atribuída,
        // atualizamos o estado e a página muda automaticamente
        if (data?.checkin && data?.mesa) {
          clearInterval(interval);
          setGuest((prev) => ({
            ...prev,
            mesa: data.mesa,
            checkin: data.checkin,
          }));
        }
      } catch (err) {
        console.error("Erro inesperado a verificar mesa:", err);
      }
    }, 3000); // 3 segundos

    // limpar intervalo quando o componente desmontar ou dependências mudarem
    return () => clearInterval(interval);
  }, [guest, confirmed, setGuest]);

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
      setRejected(guestData.rejeitado || false);

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
        .update({ confirmado: true, rejeitado: false })
        .eq("id", guest.id);

      if (error) throw error;

      // Salvar QR code no storage
      await saveQRCodeToStorage();

      setConfirmed(true);
      setRejected(false);
      toast.success("Presença confirmada com sucesso!");
    } catch (error) {
      console.error("Erro ao confirmar presença:", error);
      toast.error("Erro ao confirmar presença");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!guest) return;

    setLoading(true);

    try {
      // Atualizar rejeição no banco
      const { error } = await supabase
        .from("convidados")
        .update({ confirmado: false, rejeitado: true })
        .eq("id", guest.id);

      if (error) throw error;

      setConfirmed(false);
      setRejected(true);
      toast.success("Resposta registada. Lamentamos a sua ausência!");
    } catch (error) {
      console.error("Erro ao rejeitar convite:", error);
      toast.error("Erro ao processar resposta");
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

  // Formatar hora sem segundos
  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">
            A carregar o seu convite...
          </p>
        </div>
      </div>
    );
  }

  if (!guest || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Link Inválido
            </h1>
            <p className="text-gray-600">
              O link de confirmação não é válido ou expirou. Por favor, contacte
              a organização do evento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-6 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Card principal do convite */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
          {/* Banner decorativo com gradiente ou imagem */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
            {/* Imagem de fundo do evento (se existir) */}
            {event.imagem_url && (
              <div className="absolute inset-0">
                <img
                  src={event.imagem_url}
                  alt={event.nome}
                  className="w-full h-full object-cover"
                />
                {/* Overlay escuro para melhorar legibilidade do texto */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/60"></div>
              </div>
            )}

            {/* Padrão decorativo (só aparece se não houver imagem) */}
            {!event.imagem_url && (
              <>
                <div className="absolute inset-0 opacity-10">
                  <svg
                    className="w-full h-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern
                        id="pattern"
                        x="0"
                        y="0"
                        width="40"
                        height="40"
                        patternUnits="userSpaceOnUse"
                      >
                        <circle cx="20" cy="20" r="2" fill="white" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#pattern)" />
                  </svg>
                </div>

                {/* Círculos decorativos */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
              </>
            )}

            {/* Conteúdo do banner */}
            <div className="relative h-full flex flex-col items-center justify-center text-white px-6 text-center">
              {!event.imagem_url && (
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4 mb-4 animate-pulse">
                  <span className="text-5xl sm:text-6xl">🎉</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 drop-shadow-lg">
                {event.nome}
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm sm:text-base text-blue-100">
                <span className="flex items-center gap-1 bg-white bg-opacity-20 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>📅</span>
                  {new Date(event.data).toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1 bg-white bg-opacity-20 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>🕐</span>
                  {formatTime(event.hora)}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-1 text-sm sm:text-base text-blue-100">
                <span>📍</span>
                {event.local}
              </p>
            </div>
          </div>

          {/* Conteúdo do convite */}
          <div className="p-6 sm:p-8">
            {/* Informações do convidado */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4 shadow-lg">
                <span className="text-4xl">👤</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {guest.nome}
              </h2>
              {guest.mesa ? (
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 rounded-full">
                  <span className="text-xl">🪑</span>
                  <span className="font-semibold text-blue-900">
                    Mesa {guest.mesa}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  A sua mesa será atribuída pela organização após a confirmação.
                </p>
              )}
            </div>

            {!confirmed && !rejected ? (
              /* Estado: Aguarda confirmação */
              <div className="text-center">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    Será uma honra contar com a sua presença! Por favor,
                    confirme ou rejeite o convite clicando num dos botões
                    abaixo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={handleConfirm}
                      disabled={loading}
                      className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <span className="text-2xl">✓</span>
                      <span>
                        {loading ? "A confirmar..." : "Confirmar Presença"}
                      </span>
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={loading}
                      className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-red-600 hover:to-rose-700 focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <span className="text-2xl">✗</span>
                      <span>
                        {loading ? "A processar..." : "Não Posso Comparecer"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : confirmed ? (
              guest.checkin && guest.mesa ? (
                /* Estado: Confirmado + Check-in feito → mostrar mesa em vez do QR */
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 text-center">
                    <div className="inline-flex items-center justify-center gap-2 text-green-700 font-bold text-xl mb-2">
                      <span className="text-3xl">🎉</span>
                      <span>Check-in efetuado com sucesso!</span>
                    </div>
                    <p className="text-green-700 mb-2">
                      Obrigado por fazer o check-in à entrada.
                    </p>
                    <p className="text-gray-700 mb-1">
                      A sua mesa para o evento:
                    </p>
                    <p className="text-4xl font-extrabold text-green-900 mb-3">
                      Mesa {guest.mesa}
                    </p>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto">
                      Mostre esta página à organização se precisar de ajuda a
                      encontrar a mesa.
                    </p>
                  </div>
                </div>
              ) : (
                /* Estado: Confirmado mas ainda sem check-in/mesa → mostra QR */
                <div className="space-y-6">
                  {/* Mensagem de confirmação */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 text-center">
                    <div className="inline-flex items-center justify-center gap-2 text-green-700 font-bold text-xl mb-2">
                      <span className="text-3xl animate-bounce">✓</span>
                      <span>Presença Confirmada!</span>
                    </div>
                    <p className="text-green-600 mb-4">
                      Obrigado por confirmar a sua presença!
                    </p>
                    <button
                      onClick={handleReject}
                      disabled={loading}
                      className="text-sm text-red-600 hover:text-red-700 underline"
                    >
                      Alterar resposta (não posso comparecer)
                    </button>
                  </div>

                  {/* QR Code */}
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 sm:p-8 border border-gray-200">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="text-2xl">📱</span>
                      <h3 className="text-xl font-bold text-gray-900">
                        O seu QR Code para Check-in
                      </h3>
                    </div>

                    <div ref={qrRef} className="flex justify-center mb-6">
                      <div className="bg-white p-6 rounded-2xl shadow-xl border-4 border-blue-100">
                        <QRCodeCanvas
                          value={qrData}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>

                    <p className="text-center text-gray-600 mb-4 text-sm sm:text-base">
                      Apresente este QR Code na entrada do evento para fazer
                      check-in rapidamente.
                    </p>

                    <button
                      onClick={downloadQRCode}
                      className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 px-6 py-3 border-2 border-blue-300 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 font-medium"
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Descarregar QR Code
                    </button>
                  </div>

                  {/* Instruções */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">💡</span>
                      <div>
                        <h4 className="font-bold text-blue-900 mb-3 text-lg">
                          Informações importantes:
                        </h4>
                        <ul className="space-y-2 text-blue-700">
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>
                              Guarde este QR Code no seu telemóvel ou imprima-o
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>
                              Apresente-o na entrada para agilizar o check-in
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>Cada QR Code é único e intransmissível</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>
                              Em caso de dúvidas, contacte a organização
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Estado: Rejeitado */
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6 text-center">
                  <div className="inline-flex items-center justify-center gap-2 text-red-700 font-bold text-xl mb-2">
                    <span className="text-3xl">✗</span>
                    <span>Presença Não Confirmada</span>
                  </div>
                  <p className="text-red-600 mb-4">
                    Lamentamos que não possa estar presente!
                  </p>
                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="text-sm text-green-600 hover:text-green-700 underline"
                  >
                    Alterar resposta (confirmar presença)
                  </button>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 text-center">
                  <p className="text-gray-600">
                    Caso mude de ideias, pode alterar a sua resposta a qualquer
                    momento clicando no botão acima.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Créditos */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Gestor de Eventos UTAD © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default Confirm;
