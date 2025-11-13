import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

function UploadGuests() {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [guests, setGuests] = useState([])
  const [uploadedGuests, setUploadedGuests] = useState([])
  const [currentEvent, setCurrentEvent] = useState(null)
  const [copySuccess, setCopySuccess] = useState({})

  useEffect(() => {
    loadCurrentEvent()
  }, [])

  const loadCurrentEvent = async () => {
    const eventId = localStorage.getItem('currentEventId')
    if (!eventId) {
      toast.error('Nenhum evento selecionado. Por favor, crie um evento primeiro.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) throw error
      setCurrentEvent(data)
    } catch (error) {
      console.error('Erro ao carregar evento:', error)
      toast.error('Erro ao carregar evento')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFile(file)
      parseCSV(file)
    }
  }

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const validGuests = results.data.filter(row => 
          row.nome && row.email && row.mesa
        )
        setGuests(validGuests)
        if (validGuests.length === 0) {
          toast.error('O ficheiro CSV não contém dados válidos. Certifique-se de incluir colunas: nome, email, mesa')
        } else {
          toast.success(`${validGuests.length} convidados carregados do CSV`)
        }
      },
      error: (error) => {
        toast.error('Erro ao processar o ficheiro CSV: ' + error.message)
      }
    })
  }

  const handleUpload = async () => {
    if (!currentEvent) {
      toast.error('Por favor, crie um evento primeiro')
      return
    }

    if (guests.length === 0) {
      toast.error('Nenhum convidado para fazer upload')
      return
    }

    setLoading(true)

    try {
      const guestsWithIds = guests.map(guest => ({
        id: uuidv4(),
        evento_id: currentEvent.id,
        nome: guest.nome,
        email: guest.email,
        mesa: guest.mesa,
        confirmado: false,
        checkin: false
      }))

      const { data, error } = await supabase
        .from('convidados')
        .insert(guestsWithIds)
        .select()

      if (error) throw error

      // Gerar links de confirmação
      const guestsWithLinks = data.map(guest => ({
        ...guest,
        link: `${window.location.origin}/confirmar?id=${guest.id}`
      }))

      setUploadedGuests(guestsWithLinks)
      toast.success(`${data.length} convidados adicionados com sucesso!`)
    } catch (error) {
      console.error('Erro ao fazer upload dos convidados:', error)
      toast.error('Erro ao fazer upload: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = (guestId, link) => {
    navigator.clipboard.writeText(link)
    setCopySuccess({ ...copySuccess, [guestId]: true })
    toast.success('Link copiado!')
    
    setTimeout(() => {
      setCopySuccess({ ...copySuccess, [guestId]: false })
    }, 2000)
  }

  const sendEmail = (email, link) => {
    const subject = encodeURIComponent(`Confirmação de Presença - ${currentEvent?.nome || 'Evento'}`)
    const body = encodeURIComponent(`Olá,\n\nPor favor confirme a sua presença no evento clicando no link abaixo:\n\n${link}\n\nObrigado!`)
    window.open(`mailto:${email}?subject=${subject}&body=${body}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload de Convidados</h1>
        
        {currentEvent && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Evento atual:</p>
            <p className="font-semibold text-gray-900">{currentEvent.nome}</p>
            <p className="text-sm text-gray-600">{currentEvent.data} às {currentEvent.hora} - {currentEvent.local}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ficheiro CSV (colunas: nome, email, mesa)
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
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mesa</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.slice(0, 10).map((guest, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{guest.nome}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{guest.email}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{guest.mesa}</td>
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
            {loading ? 'A fazer upload...' : `Fazer Upload de ${guests.length} Convidados`}
          </button>
        </div>
      </div>

      {/* Lista de convidados com links */}
      {uploadedGuests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Links de Confirmação</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadedGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{guest.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{guest.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{guest.mesa}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyLink(guest.id, guest.link)}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          {copySuccess[guest.id] ? '✓ Copiado' : '📋 Copiar Link'}
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
            <p className="text-sm font-medium text-blue-800 mb-2">Formato do ficheiro CSV:</p>
            <pre className="text-xs text-blue-700 bg-white p-2 rounded">
{`nome,email,mesa
João Silva,joao@email.com,1
Maria Santos,maria@email.com,2
Pedro Costa,pedro@email.com,1`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadGuests
