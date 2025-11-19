import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function EmailTemplate() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [template, setTemplate] = useState({
    assunto: "",
    corpo: "",
    remetente_nome: "Universidade de Trás-os-Montes e Alto Douro",
    remetente_email: "eventos@utad.pt",
  });
  const [previewGuest, setPreviewGuest] = useState({
    nome: "João Silva",
    email: "exemplo@email.com",
    id: "preview-id",
    cargo: "Prof. Doutor",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadTemplate();
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

      if (data?.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      toast.error("Erro ao carregar eventos");
    }
  };

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("evento_id", selectedEventId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setTemplate(data);
      } else {
        // Template padrão
        setTemplate({
          assunto: `Confirmação de Presença - ${
            events.find((e) => e.id === selectedEventId)?.nome || "Evento"
          }`,
          corpo: `Caro(a) {{nome}},\n\nÉ com grande prazer que convidamos V. Ex.ª para o evento {{evento}}.\n\nData: {{data}}\nHora: {{hora}}\nLocal: {{local}}\n\nPara confirmar a sua presença, por favor clique no link abaixo:\n{{link}}\n\nContamos com a sua presença.\n\nCom os melhores cumprimentos,\nUniversidade de Trás-os-Montes e Alto Douro`,
          remetente_nome: "Universidade de Trás-os-Montes e Alto Douro",
          remetente_email: "eventos@utad.pt",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar template:", error);
      toast.error("Erro ao carregar template");
    }
  };

  const saveTemplate = async () => {
    if (!selectedEventId) {
      toast.error("Selecione um evento primeiro");
      return;
    }

    if (!template.assunto.trim() || !template.corpo.trim()) {
      toast.error("Assunto e corpo do email são obrigatórios");
      return;
    }

    setLoading(true);

    try {
      // Verificar se já existe template
      const { data: existing } = await supabase
        .from("email_templates")
        .select("id")
        .eq("evento_id", selectedEventId)
        .single();

      if (existing) {
        // Atualizar
        const { error } = await supabase
          .from("email_templates")
          .update({
            assunto: template.assunto,
            corpo: template.corpo,
            remetente_nome: template.remetente_nome,
            remetente_email: template.remetente_email,
            updated_at: new Date().toISOString(),
          })
          .eq("evento_id", selectedEventId);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase.from("email_templates").insert({
          evento_id: selectedEventId,
          assunto: template.assunto,
          corpo: template.corpo,
          remetente_nome: template.remetente_nome,
          remetente_email: template.remetente_email,
        });

        if (error) throw error;
      }

      toast.success("Template guardado com sucesso!");
    } catch (error) {
      console.error("Erro ao guardar template:", error);
      toast.error("Erro ao guardar template: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    const selectedEvent = events.find((e) => e.id === selectedEventId);
    if (!selectedEvent) return { assunto: "", corpo: "" };

    // Nome formal → se tiver cargo = "Diretor João Silva"
    const nomeFormal = previewGuest.cargo
      ? `${previewGuest.cargo} ${previewGuest.nome}`
      : previewGuest.nome;

    const replacements = {
      "{{nome}}": previewGuest.nome,
      "{{email}}": previewGuest.email,
      "{{cargo}}": previewGuest.cargo || "",
      "{{nome_formal}}": nomeFormal,
      "{{link}}": `${window.location.origin}/confirmar?id=${previewGuest.id}`,
      "{{evento}}": selectedEvent.nome,
      "{{data}}": new Date(selectedEvent.data).toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      "{{hora}}": selectedEvent.hora?.slice(0, 5),
      "{{local}}": selectedEvent.local,
    };

    let assuntoPreview = template.assunto;
    let corpoPreview = template.corpo;

    // Substituições globais
    Object.entries(replacements).forEach(([key, value]) => {
      assuntoPreview = assuntoPreview.replace(new RegExp(key, "g"), value);
      corpoPreview = corpoPreview.replace(new RegExp(key, "g"), value);
    });

    return { assunto: assuntoPreview, corpo: corpoPreview };
  };

  const insertVariable = (variable) => {
    setTemplate({
      ...template,
      corpo: template.corpo + variable,
    });
  };

  const preview = renderPreview();

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          📧 Templates de Email
        </h1>

        {/* Seletor de Evento */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar Evento
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione um evento</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.nome} -{" "}
                {new Date(event.data).toLocaleDateString("pt-PT")}
              </option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <>
            {/* Informações do Remetente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Remetente
                </label>
                <input
                  type="text"
                  value={template.remetente_nome}
                  onChange={(e) =>
                    setTemplate({ ...template, remetente_nome: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Universidade de Trás-os-Montes e Alto Douro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do Remetente
                </label>
                <input
                  type="email"
                  value={template.remetente_email}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      remetente_email: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="eventos@utad.pt"
                />
              </div>
            </div>

            {/* Assunto */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assunto do Email <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={template.assunto}
                onChange={(e) =>
                  setTemplate({ ...template, assunto: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirmação de Presença - {{evento}}"
              />
            </div>

            {/* Variáveis Disponíveis */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variáveis Disponíveis (clique para inserir)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Nome", value: "{{nome}}" },
                  { label: "Email", value: "{{email}}" },
                  { label: "Cargo", value: "{{cargo}}" },
                  { label: "Nome formal", value: "{{nome_formal}}" },
                  { label: "Link", value: "{{link}}" },
                  { label: "Evento", value: "{{evento}}" },
                  { label: "Data", value: "{{data}}" },
                  { label: "Hora", value: "{{hora}}" },
                  { label: "Local", value: "{{local}}" },
                ].map((v) => (
                  <button
                    key={v.value}
                    onClick={() => insertVariable(v.value)}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corpo do Email */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Corpo do Email <span className="text-red-500">*</span>
              </label>
              <textarea
                value={template.corpo}
                onChange={(e) =>
                  setTemplate({ ...template, corpo: e.target.value })
                }
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Caro(a) {{nome}},&#10;&#10;É com grande prazer que convidamos V. Ex.ª..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Use as variáveis acima para personalizar o email
              </p>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={saveTemplate}
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "A guardar..." : "💾 Guardar Template"}
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
              >
                {showPreview ? "✏️ Editar" : "👁️ Preview"}
              </button>
            </div>

            {/* Preview */}
            {showPreview && (
              <div className="mt-6 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📧 Preview do Email
                </h3>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-xs text-gray-500 mb-1">De:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {template.remetente_nome} &lt;{template.remetente_email}
                      &gt;
                    </p>
                  </div>
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-xs text-gray-500 mb-1">Para:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {previewGuest.nome} &lt;{previewGuest.email}&gt;
                    </p>
                  </div>
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-xs text-gray-500 mb-1">Assunto:</p>
                    <p className="text-sm font-bold text-gray-900">
                      {preview.assunto}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Corpo:</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {preview.corpo}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs text-gray-600 mb-2">
                    Testar preview com outro nome:
                  </label>
                  <input
                    type="text"
                    value={previewGuest.nome}
                    onChange={(e) =>
                      setPreviewGuest({ ...previewGuest, nome: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Nome de exemplo"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Como usar:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Selecione o evento para o qual quer criar o template</li>
          <li>2. Personalize o assunto e corpo do email</li>
          <li>3. Use as variáveis para personalização automática</li>
          <li>4. Clique em "Preview" para ver como ficará o email</li>
          <li>5. Guarde o template</li>
          <li>6. Vá ao Dashboard para enviar emails em massa</li>
        </ul>
      </div>
    </div>
  );
}

export default EmailTemplate;
