import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    data: "",
    hora: "",
    local: "",
    imagem_url: "",
    accent_color: "#1e40af", // azul padrão
  });

  useEffect(() => {
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Quando a imagem é carregada no preview, extrair cor
  useEffect(() => {
    if (!imagePreview) return;

    const img = new Image();
    img.src = imagePreview;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, img.width, img.height).data;

        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let i = 0; i < data.length; i += 40) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        const toHex = (v) => v.toString(16).padStart(2, "0");
        const hex = `#${toHex((r / count) | 0)}${toHex((g / count) | 0)}${toHex(
          (b / count) | 0
        )}`;

        setFormData((prev) => ({ ...prev, accent_color: hex }));
      } catch (e) {
        console.log("Erro ao extrair cor:", e);
      }
    };
  }, [imagePreview]);

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        nome: data.nome || "",
        data: data.data || "",
        hora: data.hora || "",
        local: data.local || "",
        imagem_url: data.imagem_url || "",
        accent_color: data.accent_color || "#1e40af",
      });

      setImagePreview(data.imagem_url || null);
    } catch (error) {
      console.error("Erro ao carregar evento:", error);
      toast.error("Erro ao carregar evento");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um ficheiro de imagem válido");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({
      ...prev,
      imagem_url: "",
    }));
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    setUploadingImage(true);

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("event-images").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.data || !formData.hora || !formData.local) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);

    try {
      let imagem_url = formData.imagem_url || null;

      // Se escolheres uma nova imagem, faz upload e usa esse URL
      if (imageFile) {
        const newUrl = await uploadImage();
        if (newUrl) {
          imagem_url = newUrl;
        }
      }

      // Se retiraste a imagem (preview vazio e imagem_url vazio), apaga no DB
      if (!imagePreview && !imageFile) {
        imagem_url = null;
      }

      const { error } = await supabase
        .from("eventos")
        .update({
          nome: formData.nome,
          data: formData.data,
          hora: formData.hora,
          local: formData.local,
          imagem_url,
          accent_color: formData.accent_color,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Evento atualizado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      toast.error("Erro ao atualizar evento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Evento</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload de Imagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem do Evento (opcional)
            </label>

            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Clique para escolher uma imagem
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF até 5MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg transition"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Escolher cor do convite */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor do Convite
            </label>

            <div className="flex items-center gap-4">
              <input
                type="color"
                value={formData.accent_color}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    accent_color: e.target.value,
                  }))
                }
                className="w-12 h-12 rounded-md cursor-pointer border border-gray-300 shadow-sm"
              />

              <div
                className="w-14 h-14 rounded-lg border"
                style={{ backgroundColor: formData.accent_color }}
              ></div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Esta cor será usada como cor principal do convite.
            </p>
          </div>

          {/* Nome */}
          <div>
            <label
              htmlFor="nome"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nome do Evento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="data"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="data"
                name="data"
                value={formData.data}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="hora"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Hora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="hora"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label
              htmlFor="local"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Local <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="local"
              name="local"
              value={formData.local}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving || uploadingImage ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>
                  {uploadingImage
                    ? "A atualizar imagem..."
                    : "A guardar alterações..."}
                </span>
              </>
            ) : (
              "Guardar alterações"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditEvent;
