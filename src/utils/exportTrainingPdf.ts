import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface Training {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  location: string | null
  max_capacity: number | null
}

interface Applicant {
  id: string
  name: string
  email: string | null
  phone: string | null
  pipeline_stage: string | null
  accommodation_choice: string | null
}

interface Room {
  id: string
  name: string
  bed_type: string | null
  is_premier: boolean
}

interface RoomReservation {
  room_id: string
  application?: {
    first_name: string
    last_name: string
    email: string
  }
}

interface ApplicationInfo {
  id: string
  first_name: string
  last_name: string
  email: string
  dietary_preferences: string[] | null
  dietary_other: string | null
  allergies: string | null
  accommodation_notes: string | null
  special_accommodations: string | null
  meal_selections?: Record<string, { lunch?: string; dinner?: string }> | null
}

// April training ID (meal selection enabled)
const APRIL_TRAINING_ID = '1952aca4-ef44-4294-bd63-a467cd800497'

// Meal dates for April training
const MEAL_DATES = [
  { date: '2025-03-30', label: 'Sun 3/30' },
  { date: '2025-03-31', label: 'Mon 3/31' },
  { date: '2025-04-01', label: 'Tue 4/1' },
  { date: '2025-04-02', label: 'Wed 4/2' },
]

export function exportTrainingPdf(
  training: Training,
  applicants: Applicant[],
  rooms: Room[],
  reservations: RoomReservation[],
  applications: ApplicationInfo[]
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let yPos = 20

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(training.name, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // Training details
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  const dates = training.start_date && training.end_date
    ? `${format(new Date(training.start_date), 'MMMM d')} - ${format(new Date(training.end_date), 'MMMM d, yyyy')}`
    : 'Dates TBD'
  doc.text(dates, pageWidth / 2, yPos, { align: 'center' })
  yPos += 6
  if (training.location) {
    doc.text(training.location, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
  }
  doc.text(`Capacity: ${applicants.length} / ${training.max_capacity || 6}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Participants Table
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Participants', 14, yPos)
  yPos += 8

  const participantData = applicants.map(a => {
    const reservation = reservations.find(r => r.application?.email === a.email)
    const room = reservation ? rooms.find(rm => rm.id === reservation.room_id) : null
    const roomName = room ? room.name : (a.accommodation_choice === 'commute' ? 'Commute' : '-')
    return [a.name, a.email || '-', a.phone || '-', roomName]
  })

  autoTable(doc, {
    startY: yPos,
    head: [['Name', 'Email', 'Phone', 'Room']],
    body: participantData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    styles: { fontSize: 9 },
  })

  yPos = (doc as any).lastAutoTable.finalY + 15

  // Meal Assignments (April training only)
  if (training.id === APRIL_TRAINING_ID) {
    const appsWithMeals = applications.filter(a => a.meal_selections && Object.keys(a.meal_selections).length > 0)

    if (appsWithMeals.length > 0) {
      // Check if we need a new page
      if (yPos > 200) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Meal Assignments', 14, yPos)
      yPos += 8

      // Build header row with date columns
      const mealHeaders = ['Name', ...MEAL_DATES.flatMap(d => [`${d.label} L`, `${d.label} D`])]

      const mealData = appsWithMeals.map(app => {
        const meals = app.meal_selections || {}
        const row = [`${app.first_name} ${app.last_name?.charAt(0) || ''}.`]

        MEAL_DATES.forEach(d => {
          const dayMeals = meals[d.date] || {}
          // Shorten meal names for PDF
          const lunchShort = dayMeals.lunch?.replace(/^Organic\s+/, '').substring(0, 20) || '-'
          const dinnerShort = dayMeals.dinner?.replace(/^Organic\s+/, '').substring(0, 20) || '-'
          row.push(lunchShort, dinnerShort)
        })

        return row
      })

      autoTable(doc, {
        startY: yPos,
        head: [mealHeaders],
        body: mealData,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 25 },
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 15
    }
  }

  // Dietary & Accommodation Needs
  const withNeeds = applications.filter(a =>
    (a.dietary_preferences && a.dietary_preferences.length > 0) ||
    a.dietary_other ||
    a.allergies ||
    a.special_accommodations ||
    a.accommodation_notes
  )

  if (withNeeds.length > 0) {
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Dietary & Accommodation Needs', 14, yPos)
    yPos += 8

    const needsData = withNeeds.map(app => {
      const dietary = [
        ...(app.dietary_preferences || []),
        app.dietary_other ? `Other: ${app.dietary_other}` : '',
        app.allergies ? `ALLERGY: ${app.allergies}` : ''
      ].filter(Boolean).join(', ') || '-'

      const special = app.special_accommodations || '-'
      const notes = app.accommodation_notes || '-'

      return [`${app.first_name} ${app.last_name}`, dietary, special, notes]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Name', 'Dietary/Allergies', 'Special Needs', 'Notes']],
      body: needsData,
      theme: 'striped',
      headStyles: { fillColor: [234, 179, 8] },
      styles: { fontSize: 8, cellWidth: 'wrap' },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
      },
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Generated ${format(new Date(), 'MMM d, yyyy h:mm a')} - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Download
  const fileName = `${training.name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}
