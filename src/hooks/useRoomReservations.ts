import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Room {
  id: string
  training_id: string
  name: string
  bed_type: string | null
  bath_type: string | null
  is_premier: boolean
  price_adjustment_cents: number
  image_url: string | null
  sort_order: number
}

export interface RoomReservation {
  id: string
  room_id: string
  user_id: string
  training_id: string
  application_id: string | null
  created_at: string
  // Joined data
  room?: Room
  application?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

// Fetch all rooms for a training
export function useRooms(trainingId: string | null) {
  return useQuery({
    queryKey: ['rooms', trainingId],
    queryFn: async () => {
      if (!trainingId) return []
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('training_id', trainingId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Room[]
    },
    enabled: !!trainingId,
  })
}

// Fetch all room reservations for a training with room and application info
export function useRoomReservations(trainingId: string | null) {
  return useQuery({
    queryKey: ['room_reservations', trainingId],
    queryFn: async () => {
      if (!trainingId) return []
      const { data, error } = await supabase
        .from('room_reservations')
        .select(`
          *,
          room:rooms(*),
          application:applications(id, first_name, last_name, email)
        `)
        .eq('training_id', trainingId)

      if (error) throw error
      return data as RoomReservation[]
    },
    enabled: !!trainingId,
  })
}

// Fetch all room reservations across all trainings (for admin overview)
export function useAllRoomReservations() {
  return useQuery({
    queryKey: ['all_room_reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_reservations')
        .select(`
          *,
          room:rooms(*),
          application:applications(id, first_name, last_name, email)
        `)

      if (error) throw error
      return data as RoomReservation[]
    },
  })
}

// Fetch all rooms across all trainings
export function useAllRooms() {
  return useQuery({
    queryKey: ['all_rooms'],
    queryFn: async () => {
      console.log('Fetching all rooms...')
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('training_id')
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching rooms:', error)
        throw error
      }
      console.log('Rooms fetched:', data?.length)
      return data as Room[]
    },
  })
}
