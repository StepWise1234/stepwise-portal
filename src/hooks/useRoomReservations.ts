import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// Admin: Assign a user to a room
export function useAssignRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      roomId,
      applicationId,
      trainingId,
      userId,
    }: {
      roomId: string
      applicationId: string
      trainingId: string
      userId?: string
    }) => {
      console.log('useAssignRoom mutationFn called:', { roomId, applicationId, trainingId, userId })

      // First, remove any existing reservation for this application
      const { error: deleteAppError } = await supabase
        .from('room_reservations')
        .delete()
        .eq('application_id', applicationId)

      if (deleteAppError) console.warn('Error deleting old app reservation:', deleteAppError)

      // Also remove any existing reservation for this room (in case someone else was there)
      const { error: deleteRoomError } = await supabase
        .from('room_reservations')
        .delete()
        .eq('room_id', roomId)

      if (deleteRoomError) console.warn('Error deleting old room reservation:', deleteRoomError)

      // Build insert object - only include user_id if provided
      const insertData: Record<string, string> = {
        room_id: roomId,
        application_id: applicationId,
        training_id: trainingId,
      }
      if (userId) {
        insertData.user_id = userId
      }

      // Create the new reservation
      const { data, error } = await supabase
        .from('room_reservations')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('Error inserting room reservation:', error)
        throw error
      }
      console.log('Room reservation created:', data)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_room_reservations'] })
      queryClient.invalidateQueries({ queryKey: ['room_reservations'] })
    },
  })
}

// Admin: Remove a room assignment
export function useUnassignRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase
        .from('room_reservations')
        .delete()
        .eq('id', reservationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_room_reservations'] })
      queryClient.invalidateQueries({ queryKey: ['room_reservations'] })
    },
  })
}
