import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Home, Car, Users, Bed, Bath, Wifi, Wind, Tv, Utensils, ParkingCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Room data from the Airbnb listing
const ROOMS = [
  {
    id: 'bedroom-1',
    name: 'Room 1',
    subtitle: 'Queen Suite',
    beds: '1 Queen Bed',
    description: 'Private room with queen bed, perfect for solo occupancy.',
    capacity: 1,
    floor: 'Main Floor',
    amenities: ['Private closet', 'Desk area', 'Natural light'],
    image: '/rooms/room1.jpg'
  },
  {
    id: 'bedroom-2',
    name: 'Room 2',
    subtitle: 'Double Room',
    beds: '2 Double Beds',
    description: 'Spacious room with two double beds. Ideal for sharing.',
    capacity: 2,
    floor: 'Main Floor',
    amenities: ['Extra space', 'Two nightstands', 'Large closet'],
    image: '/rooms/room2.jpg'
  },
  {
    id: 'bedroom-3',
    name: 'Room 3',
    subtitle: 'Artisan Room',
    beds: '2 Double Beds',
    description: 'Bright room featuring colorful wall art and large windows.',
    capacity: 2,
    floor: 'Second Floor',
    amenities: ['Artistic decor', 'Abundant light', 'Modern style'],
    image: '/rooms/room3.jpg'
  },
  {
    id: 'bedroom-4',
    name: 'Room 4',
    subtitle: 'Modern Double',
    beds: '2 Double Beds',
    description: 'Clean, modern room with neutral tones and two comfortable beds.',
    capacity: 2,
    floor: 'Second Floor',
    amenities: ['Contemporary design', 'Cozy atmosphere', 'Great views'],
    image: '/rooms/room4.jpg'
  },
  {
    id: 'bedroom-5',
    name: 'Room 5',
    subtitle: 'Work Suite',
    beds: '1 Queen Bed',
    description: 'Queen room with dedicated desk area for those who need workspace.',
    capacity: 1,
    floor: 'Second Floor',
    amenities: ['Work desk', 'Task lighting', 'Quiet location'],
    image: '/rooms/room5.jpg'
  },
  {
    id: 'bedroom-6',
    name: 'Room 6',
    subtitle: 'Attic Retreat',
    beds: '1 Double Bed + Couch',
    description: 'Unique attic room with slanted ceilings and abundant natural light.',
    capacity: 1,
    floor: 'Top Floor',
    amenities: ['Character ceiling', 'Cozy nook', 'Window views'],
    image: '/rooms/room6.jpg'
  },
  {
    id: 'bedroom-7',
    name: 'Room 7',
    subtitle: 'Skylight Suite',
    beds: '1 Queen Bed + Couch',
    description: 'Top floor suite with angled ceiling and warm, inviting decor.',
    capacity: 1,
    floor: 'Top Floor',
    amenities: ['Unique architecture', 'Premium bedding', 'Private feel'],
    image: '/rooms/room7.jpg'
  },
  {
    id: 'bedroom-8',
    name: 'Room 8',
    subtitle: 'Grand Suite',
    beds: '2 Queen Beds',
    description: 'Largest bedroom with two queen beds. Perfect for sharing or extra space.',
    capacity: 2,
    floor: 'Top Floor',
    amenities: ['Most spacious', 'Two queens', 'Premium location'],
    image: '/rooms/room8.jpg'
  }
]

const COMMUTE_OPTION = {
  id: 'commute',
  name: 'Commute',
  subtitle: 'Daily Travel',
  description: 'Choose to commute daily from your own accommodation.',
  amenities: ['Sleep at home', 'Personal space', 'Flexible']
}

interface RoomSelection {
  odpm_id: string
  name: string
  room_id: string
}

export function Accommodation() {
  const [searchParams] = useSearchParams()
  const odpmId = searchParams.get('id')

  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [roomSelections, setRoomSelections] = useState<RoomSelection[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [_applicantName, setApplicantName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  // Fetch current room selections and applicant info
  useEffect(() => {
    async function fetchData() {
      if (!odpmId) return

      // Get applicant info
      const { data: applicant } = await supabase
        .from('applicants')
        .select('name, accommodation_choice')
        .eq('id', odpmId)
        .single()

      if (applicant) {
        setApplicantName(applicant.name || '')
        if (applicant.accommodation_choice) {
          setSelectedRoom(applicant.accommodation_choice)
          setIsSubmitted(true)
        }
      }

      // Get all room selections for March 13-16 training
      const { data: selections } = await supabase
        .from('applicants')
        .select('id, name, accommodation_choice')
        .eq('training_id', 'c626109f-11a4-4549-991e-022727300feb')
        .not('accommodation_choice', 'is', null)

      if (selections) {
        setRoomSelections(selections.map(s => ({
          odpm_id: s.id,
          name: s.name || 'Anonymous',
          room_id: s.accommodation_choice || ''
        })))
      }
    }

    fetchData()
  }, [odpmId])

  const getRoomOccupants = (roomId: string): string[] => {
    return roomSelections
      .filter(s => s.room_id === roomId && s.odpm_id !== odpmId)
      .map(s => s.name.split(' ')[0]) // First name only
  }

  const getRoomAvailability = (roomId: string): { available: boolean; spotsLeft: number } => {
    const room = ROOMS.find(r => r.id === roomId)
    if (!room) return { available: true, spotsLeft: 0 }

    const currentOccupants = roomSelections.filter(s => s.room_id === roomId && s.odpm_id !== odpmId).length
    const spotsLeft = room.capacity - currentOccupants
    return { available: spotsLeft > 0, spotsLeft }
  }

  const handleSubmit = async () => {
    if (!selectedRoom || !odpmId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('applicants')
        .update({
          accommodation_choice: selectedRoom,
          accommodation_confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', odpmId)

      if (updateError) throw updateError

      setIsSubmitted(true)
    } catch (err) {
      setError('Failed to save your selection. Please try again.')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!odpmId) {
    return (
      <div className="accommodation-page">
        <div className="accommodation-error">
          <h2>Invalid Link</h2>
          <p>This accommodation selection link is invalid. Please use the link from your email.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="accommodation-page">
      {/* Hero Section */}
      <header className="accommodation-hero">
        <div className="hero-content">
          <span className="hero-eyebrow">March 13-16, 2026 Training</span>
          <h1>Choose Your Room</h1>
          <p>Select your accommodation for the upcoming training in Somerville, MA</p>
        </div>
      </header>

      {/* Property Overview */}
      <section className="property-overview">
        <div className="property-features">
          <div className="feature">
            <Home size={20} />
            <span>8 Bedrooms</span>
          </div>
          <div className="feature">
            <Bath size={20} />
            <span>5 Bathrooms</span>
          </div>
          <div className="feature">
            <Wifi size={20} />
            <span>High-Speed WiFi</span>
          </div>
          <div className="feature">
            <Wind size={20} />
            <span>Central A/C</span>
          </div>
          <div className="feature">
            <Tv size={20} />
            <span>Smart TV</span>
          </div>
          <div className="feature">
            <Utensils size={20} />
            <span>Full Kitchen</span>
          </div>
          <div className="feature">
            <ParkingCircle size={20} />
            <span>Free Parking</span>
          </div>
        </div>
      </section>

      {/* Success Message */}
      {isSubmitted && (
        <div className="submission-success">
          <Check size={24} />
          <div>
            <strong>Your selection has been saved!</strong>
            <p>You've selected: {selectedRoom === 'commute' ? 'Commute' : ROOMS.find(r => r.id === selectedRoom)?.name}</p>
          </div>
        </div>
      )}

      {/* Room Selection */}
      <section className="room-selection">
        <h2>Available Rooms</h2>
        <p className="section-description">
          Click on a room to select it. Some rooms can be shared with another participant.
        </p>

        <div className="rooms-grid">
          {ROOMS.map(room => {
            const { available, spotsLeft } = getRoomAvailability(room.id)
            const occupants = getRoomOccupants(room.id)
            const isSelected = selectedRoom === room.id
            const isDisabled = !available && !isSelected

            return (
              <div
                key={room.id}
                className={`room-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'unavailable' : ''}`}
                onClick={() => !isDisabled && !isSubmitted && setSelectedRoom(room.id)}
              >
                <div className="room-image">
                  <Bed size={48} />
                  <span className="room-floor">{room.floor}</span>
                </div>

                <div className="room-content">
                  <div className="room-header">
                    <h3>{room.name}</h3>
                    <span className="room-subtitle">{room.subtitle}</span>
                  </div>

                  <div className="room-beds">
                    <Bed size={14} />
                    <span>{room.beds}</span>
                  </div>

                  <p className="room-description">{room.description}</p>

                  <div className="room-amenities">
                    {room.amenities.map(amenity => (
                      <span key={amenity} className="amenity-tag">{amenity}</span>
                    ))}
                  </div>

                  <div className="room-status">
                    {room.capacity > 1 && (
                      <div className="capacity-info">
                        <Users size={14} />
                        <span>Fits {room.capacity} people</span>
                      </div>
                    )}

                    {occupants.length > 0 && (
                      <div className="current-occupants">
                        Sharing with: {occupants.join(', ')}
                      </div>
                    )}

                    {!available && !isSelected && (
                      <span className="full-badge">Full</span>
                    )}

                    {available && spotsLeft < room.capacity && (
                      <span className="spots-badge">{spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left</span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="selected-indicator">
                    <Check size={20} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Commute Option */}
          <div
            className={`room-card commute-card ${selectedRoom === 'commute' ? 'selected' : ''}`}
            onClick={() => !isSubmitted && setSelectedRoom('commute')}
          >
            <div className="room-image commute">
              <Car size={48} />
            </div>

            <div className="room-content">
              <div className="room-header">
                <h3>{COMMUTE_OPTION.name}</h3>
                <span className="room-subtitle">{COMMUTE_OPTION.subtitle}</span>
              </div>

              <p className="room-description">{COMMUTE_OPTION.description}</p>

              <div className="room-amenities">
                {COMMUTE_OPTION.amenities.map(amenity => (
                  <span key={amenity} className="amenity-tag">{amenity}</span>
                ))}
              </div>
            </div>

            {selectedRoom === 'commute' && (
              <div className="selected-indicator">
                <Check size={20} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Submit Section */}
      {!isSubmitted && (
        <section className="submit-section">
          {error && <div className="error-message">{error}</div>}

          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!selectedRoom || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Confirm Selection'}
          </button>

          <p className="submit-note">
            You can change your selection until March 1st by revisiting this page.
          </p>
        </section>
      )}

      {/* Footer */}
      <footer className="accommodation-footer">
        <p>Questions? Contact us at hello@stepwise.education</p>
      </footer>
    </div>
  )
}
