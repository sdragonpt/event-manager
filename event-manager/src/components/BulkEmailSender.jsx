import { useState } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import emailjs from "@emailjs/browser";

// 🔧 Configuração do EmailJS
// (os valores são os que usaste no outro projeto)
emailjs.init("YZWRdopb-zpik6r8g");

const SERVICE_ID = "service_hqo7rbq";
const TEMPLATE_ID = "template_l4umitw";

// Função para enviar email via EmailJS (frontend)
async function sendEmailViaSMTP({
  to,
  subject,
  body,
  fromName,
  fromEmail,
  replyTo,
  eventName,
  eventDate,
  eventTime,
}) {
  try {
    const formattedDate = new Date(eventDate).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      // Estes nomes têm de corresponder às variáveis definidas no template do EmailJS
      to_email: to,
      subject,
      message: body,
      event_name: eventName,
      event_date: formattedDate,
      event_time: eventTime || "",
      from_name: fromName,
      from_email: fromEmail,
      reply_to: replyTo,
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar email via EmailJS:", error);
    throw new Error("Erro ao enviar email");
  }
}

function BulkEmailSender({ eventId, eventData, guests, onComplete }) {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, errors: 0 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [template, setTemplate] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("todos"); // todos, pendentes, confirmados, nao-enviados

  const loadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("evento_id", eventId)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error(
          "Template de email não configurado. Configure primeiro em Templates de Email."
        );
        return false;
      }

      setTemplate(data);
      return true;
    } catch (error) {
      console.error("Erro ao carregar template:", error);
      toast.error("Erro ao carregar template de email");
      return false;
    } finally {
      setLoadingTemplate(false);
    }
  };

  const getFilteredGuests = () => {
    let filtered = guests;

    switch (selectedFilter) {
      case "pendentes":
        filtered = guests.filter((g) => !g.confirmado && !g.rejeitado);
        break;
      case "confirmados":
        filtered = guests.filter((g) => g.confirmado);
        break;
      case "nao-enviados":
        filtered = guests.filter((g) => !g.email_enviado);
        break;
      default:
        // todos
        break;
    }

    return filtered;
  };

  const handleSendBulk = async () => {
    const hasTemplate = await loadTemplate();
    if (!hasTemplate) return;

    const filtered = getFilteredGuests();
    if (filtered.length === 0) {
      toast.error("Não há convidados para enviar neste filtro.");
      return;
    }

    setShowConfirm(true);
  };

  const confirmAndSend = async () => {
    setShowConfirm(false);
    setSending(true);

    const filteredGuests = getFilteredGuests();
    const total = filteredGuests.length;
    let sent = 0;
    let errors = 0;

    setProgress({ sent, total, errors });

    for (const guest of filteredGuests) {
      try {
        // Nome formal → se tiver cargo = "Diretor João Silva"
        const nomeFormal = guest.cargo
          ? `${guest.cargo} ${guest.nome}`
          : guest.nome;

        // Substituir variáveis no template
        const replacements = {
          "{{nome}}": guest.nome,
          "{{email}}": guest.email,
          "{{cargo}}": guest.cargo || "",
          "{{nome_formal}}": nomeFormal,
          "{{link}}": `${window.location.origin}/confirmar?id=${guest.id}`,
          "{{evento}}": eventData.nome,
          "{{data}}": new Date(eventData.data).toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          "{{hora}}": eventData.hora?.slice(0, 5),
          "{{local}}": eventData.local,
        };

        let assunto = template.assunto;
        let corpo = template.corpo;

        Object.entries(replacements).forEach(([key, value]) => {
          assunto = assunto.replace(new RegExp(key, "g"), value);
          corpo = corpo.replace(new RegExp(key, "g"), value);
        });

        // Enviar email via EmailJS
        await sendEmailViaSMTP({
          to: guest.email,
          subject: assunto,
          body: corpo,
          fromName: template.remetente_nome,
          fromEmail: template.remetente_email,
          replyTo: template.remetente_email,
          eventName: eventData.nome,
          eventDate: eventData.data,
          eventTime: eventData.hora?.slice(0, 5),
        });

        // Registrar log de envio
        await supabase.from("email_logs").insert({
          convidado_id: guest.id,
          evento_id: eventId,
          email_destinatario: guest.email,
          assunto: assunto,
          corpo: corpo,
          status: "enviado",
        });

        // Atualizar flag de email enviado
        await supabase
          .from("convidados")
          .update({
            email_enviado: true,
            email_enviado_em: new Date().toISOString(),
          })
          .eq("id", guest.id);

        sent++;
        setProgress({ sent, total, errors });

        // Pequeno delay para não rebentar o limite do EmailJS
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Erro ao enviar email para ${guest.email}:`, error);
        errors++;
        setProgress({ sent, total, errors });

        // Registrar log de erro
        await supabase.from("email_logs").insert({
          convidado_id: guest.id,
          evento_id: eventId,
          email_destinatario: guest.email,
          assunto: template?.assunto || "",
          corpo: template?.corpo || "",
          status: "erro",
          erro_mensagem: error.message,
        });
      }
    }

    setSending(false);
    toast.success(`Envio concluído! ${sent} emails enviados, ${errors} erros.`);

    if (onComplete) {
      onComplete();
    }
  };

  const filteredCount = getFilteredGuests().length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enviar para:
        </label>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        >
          <option value="todos">Todos os convidados ({guests.length})</option>
          <option value="pendentes">
            Pendentes (
            {guests.filter((g) => !g.confirmado && !g.rejeitado).length})
          </option>
          <option value="confirmados">
            Confirmados ({guests.filter((g) => g.confirmado).length})
          </option>
          <option value="nao-enviados">
            Ainda não receberam email (
            {guests.filter((g) => !g.email_enviado).length})
          </option>
        </select>
      </div>

      {/* Botão de Envio */}
      <button
        onClick={handleSendBulk}
        disabled={sending || loadingTemplate || filteredCount === 0}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {loadingTemplate ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>A carregar template...</span>
          </>
        ) : sending ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>A enviar emails...</span>
          </>
        ) : (
          <>
            <span>✉️</span>
            <span>
              Enviar Emails em Massa ({filteredCount}{" "}
              {filteredCount === 1 ? "destinatário" : "destinatários"})
            </span>
          </>
        )}
      </button>

      {/* Progresso */}
      {sending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-900">
              Progresso do Envio
            </span>
            <span className="text-sm text-blue-700">
              {progress.sent} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.sent / progress.total) * 100}%`
                    : "0%",
              }}
            ></div>
          </div>
          {progress.errors > 0 && (
            <p className="text-xs text-red-600">
              ⚠️ {progress.errors} erro(s) durante o envio
            </p>
          )}
        </div>
      )}

      {/* Modal de Confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ⚠️ Confirmar Envio em Massa
            </h3>
            <p className="text-gray-700 mb-4">
              Está prestes a enviar <strong>{filteredCount} emails</strong> para
              os convidados selecionados.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Esta ação não pode ser desfeita.
                Certifique-se de que o template está correto.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndSend}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
              >
                Enviar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informação */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
        <p className="text-xs text-blue-800">
          💡 <strong>Dica:</strong> Certifique-se de que configurou o template
          de email em "Templates de Email" antes de enviar.
        </p>
      </div>
    </div>
  );
}

export default BulkEmailSender;
