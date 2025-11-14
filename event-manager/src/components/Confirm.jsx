import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function Confirm() {
  const [accentColor, setAccentColor] = useState("#1e40af");
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

  const extractAccentColor = (img) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const width = (canvas.width = img.naturalWidth || img.width);
      const height = (canvas.height = img.naturalHeight || img.height);

      ctx.drawImage(img, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height).data;

      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      const step = 4 * 10; // amostra 1 em cada 10 píxeis

      for (let i = 0; i < data.length; i += step) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      if (!count) return;

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);

      const toHex = (v) => v.toString(16).padStart(2, "0");
      const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

      setAccentColor(hex);
    } catch (e) {
      console.error("Erro a extrair cor da imagem:", e);
    }
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: event?.imagem_url
          ? `radial-gradient(circle at top, ${accentColor}33, #020617 55%)`
          : `linear-gradient(135deg, ${accentColor}66, #020617)`,
      }}
    >
      <div className="max-w-3xl w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/40">
        {/* Banner do evento */}
        {event?.imagem_url ? (
          <div className="relative w-full h-56 sm:h-72 overflow-hidden">
            <img
              src={event.imagem_url}
              alt={event.nome}
              className="w-full h-full object-cover"
              onLoad={(e) => {
                // Só extrai cor automaticamente se não tiveres override vindo da BD
                if (
                  !event.accent_color &&
                  typeof extractAccentColor === "function"
                ) {
                  extractAccentColor(e.target);
                }
              }}
            />
          </div>
        ) : (
          <div
            className="w-full h-32 sm:h-40 flex items-center justify-center text-center px-6"
            style={{
              background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}88)`,
            }}
          >
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-white/80 mb-2">
                Convite para evento
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {event ? event.nome : "Convite"}
              </h1>
            </div>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="p-6 sm:p-8">
          {/* Cabeçalho com info do evento + convidado */}
          {event && (
            <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8">
              {/* Info do evento */}
              <div className="flex-1 space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {event.nome}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <div>
                      <p className="font-semibold">Data</p>
                      <p>{event.data}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🕐</span>
                    <div>
                      <p className="font-semibold">Hora</p>
                      <p>{event.hora}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="font-semibold">Local</p>
                      <p>{event.local}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloco do convidado */}
              {guest && (
                <div className="md:w-56 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="text-center mb-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-2 shadow">
                      <span className="text-3xl">👤</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      Convidado(a)
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {guest.nome}
                    </p>
                  </div>

                  {guest.mesa ? (
                    <div
                      className="mt-2 text-center px-3 py-2 rounded-xl font-semibold"
                      style={{
                        backgroundColor: `${accentColor}15`,
                        color: accentColor,
                      }}
                    >
                      🪑 Mesa {guest.mesa}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      A sua mesa será atribuída pela organização após o
                      check-in.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ESTADOS PRINCIPAIS */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600 mb-4" />
              <p>A carregar o seu convite…</p>
            </div>
          ) : !guest || !event ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-semibold mb-2">
                Não foi possível carregar o convite.
              </p>
              <p className="text-gray-600 text-sm">
                Verifique se o link está correto ou contacte a organização.
              </p>
            </div>
          ) : !confirmed && !rejected ? (
            /* Estado: Aguarda confirmação */
            <div className="text-center">
              <div
                className="border-2 rounded-2xl p-6 sm:p-7 mb-4"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}10, #fff)`,
                  borderColor: `${accentColor}33`,
                }}
              >
                <p className="text-gray-700 mb-4 leading-relaxed">
                  Será uma honra contar com a sua presença no{" "}
                  <span className="font-semibold">{event.nome}</span>. Por
                  favor, confirme ou rejeite o convite clicando num dos botões
                  abaixo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
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
              /* Estado: já fez check-in e já tem mesa → ecrã da mesa */
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center gap-2 text-emerald-700 font-bold text-xl mb-2">
                    <span className="text-3xl">🎉</span>
                    <span>Bem-vindo(a) ao evento!</span>
                  </div>
                  <p className="text-emerald-700 mb-4">
                    O seu check-in foi realizado com sucesso.
                  </p>
                  <p className="text-gray-700 mb-1">
                    A sua mesa para o evento:
                  </p>
                  <p className="text-4xl font-extrabold text-emerald-900 mb-3">
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
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                  <div className="inline-flex items-center justify-center gap-2 text-green-700 font-bold text-xl mb-2">
                    <span className="text-3xl animate-bounce">✓</span>
                    <span>Presença Confirmada!</span>
                  </div>
                  <p className="text-green-600 mb-4">
                    Obrigado por confirmar a sua presença!
                  </p>
                  {watchingTable && (
                    <p className="text-xs text-green-700 mb-2">
                      Assim que o seu check-in for efetuado e a mesa atribuída,
                      esta página será atualizada automaticamente.
                    </p>
                  )}
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Alterar resposta (não posso comparecer)
                  </button>
                </div>

                {/* QR Code */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 sm:p-8 border border-gray-200">
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
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">💡</span>
                    <div>
                      <h4 className="font-bold text-blue-900 mb-3 text-lg">
                        Informações importantes:
                      </h4>
                      <ul className="space-y-2 text-blue-700 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>
                            Guarde este QR Code no seu telemóvel ou imprima-o.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>
                            Apresente-o na entrada para agilizar o check-in.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>Cada QR Code é único e intransmissível.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>
                            Em caso de dúvidas, contacte a organização.
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
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-6 text-center">
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

              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200 text-center">
                <p className="text-gray-600 text-sm">
                  Caso mude de ideias, pode alterar a sua resposta a qualquer
                  momento clicando no botão acima.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Confirm;
