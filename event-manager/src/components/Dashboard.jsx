import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function Dashboard() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [guests, setGuests] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    confirmados: 0,
    presentes: 0,
    pendentes: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      loadEventData()
    }
  }, [selectedEvent])

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
      
      if (data && data.length > 0) {
        // Selecionar o último evento usado ou o primeiro da lista
        const lastEventId = localStorage.getItem('currentEventId')
        const eventToSelect = data.find(e => e.id === lastEventId) || data[0]
        setSelectedEvent(eventToSelect)
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
      toast.error('Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  const loadEventData = async () => {
    if (!selectedEvent) return

    try {
      const { data, error } = await supabase
        .from('convidados')
        .select('*')
        .eq('evento_id', selectedEvent.id)
        .order('nome')

      if (error) throw error

      setGuests(data || [])
      
      // Calcular estatísticas
      const stats = {
        total: data.length,
        confirmados: data.filter(g => g.confirmado).length,
        presentes: data.filter(g => g.checkin).length,
        pendentes: data.filter(g => !g.confirmado).length
      }
      setStats(stats)

      // Salvar evento atual
      localStorage.setItem('currentEventId', selectedEvent.id)
    } catch (error) {
      console.error('Erro ao carregar convidados:', error)
      toast.error('Erro ao carregar dados do evento')
    }
  }

  const handleEventChange = (eventId) => {
    const event = events.find(e => e.id === eventId)
    setSelectedEvent(event)
  }

  const toggleConfirmation = async (guestId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('convidados')
        .update({ confirmado: !currentStatus })
        .eq('id', guestId)

      if (error) throw error
      
      toast.success('Status atualizado')
      loadEventData()
    } catch (error) {
      console.error('Erro ao atualizar confirmação:', error)
      toast.error('Erro ao atualizar status')
    }
  }

  const toggleCheckin = async (guestId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('convidados')
        .update({ checkin: !currentStatus })
        .eq('id', guestId)

      if (error) throw error
      
      toast.success('Check-in atualizado')
      loadEventData()
    } catch (error) {
      console.error('Erro ao atualizar check-in:', error)
      toast.error('Erro ao atualizar check-in')
    }
  }

  const deleteGuest = async (guestId) => {
    if (!window.confirm('Tem a certeza que deseja remover este convidado?')) return

    try {
      const { error } = await supabase
        .from('convidados')
        .delete()
        .eq('id', guestId)

      if (error) throw error
      
      toast.success('Convidado removido')
      loadEventData()
    } catch (error) {
      console.error('Erro ao remover convidado:', error)
      toast.error('Erro ao remover convidado')
    }
  }

  const exportToCSV = () => {
    if (guests.length === 0) {
      toast.error('Nenhum convidado para exportar')
      return
    }

    const headers = ['Nome', 'Email', 'Mesa', 'Confirmado', 'Check-in']
    const rows = guests.map(g => [
      g.nome,
      g.email,
      g.mesa,
      g.confirmado ? 'Sim' : 'Não',
      g.checkin ? 'Sim' : 'Não'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `convidados-${selectedEvent.nome.replace(/\s+/g, '-')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Ficheiro CSV exportado')
  }

  const filteredGuests = guests.filter(guest => 
    guest.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.mesa.toString().includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Seletor de Evento e Ações */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
            {events.length > 0 && (
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => handleEventChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um evento</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.nome} - {new Date(event.data).toLocaleDateString('pt-PT')}
                  </option>
                ))}
              </select>
            )}
          </div>
          {selectedEvent && (
            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            >
              📥 Exportar CSV
            </button>
          )}
        </div>

        {selectedEvent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium">Confirmados</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.confirmados}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Presentes</p>
              <p className="text-2xl font-bold text-green-900">{stats.presentes}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600 font-medium">Pendentes</p>
              <p className="text-2xl font-bold text-red-900">{stats.pendentes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Convidados */}
      {selectedEvent && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Lista de Convidados</h2>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {filteredGuests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mesa</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Confirmado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Check-in</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGuests.map((guest) => (
                    <tr key={guest.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{guest.nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{guest.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{guest.mesa}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleConfirmation(guest.id, guest.confirmado)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            guest.confirmado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          } hover:opacity-80 transition cursor-pointer`}
                        >
                          {guest.confirmado ? '✓ Sim' : 'Não'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleCheckin(guest.id, guest.checkin)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            guest.checkin
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          } hover:opacity-80 transition cursor-pointer`}
                        >
                          {guest.checkin ? '✓ Sim' : 'Não'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(
                              `${window.location.origin}/confirmar?id=${guest.id}`
                            ).then(() => toast.success('Link copiado!'))}
                            className="text-blue-600 hover:text-blue-900"
                            title="Copiar link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteGuest(guest.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remover"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Nenhum convidado encontrado com este termo de pesquisa'
                  : 'Nenhum convidado adicionado ainda'}
              </p>
            </div>
          )}
        </div>
      )}

      {events.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Nenhum evento criado</h2>
          <p className="text-gray-600 mb-4">Crie o seu primeiro evento para começar a gerir convidados.</p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Criar Evento
          </a>
        </div>
      )}
    </div>
  )
}

export default Dashboard
