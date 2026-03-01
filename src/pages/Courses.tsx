import { Link } from 'react-router-dom'
import {
  GraduationCap,
  ChevronRight,
  Eye,
  EyeOff,
  BookOpen,
  Video
} from 'lucide-react'
import { useCourses, useUpdateCourse } from '../hooks/useCourses'

// Course colors for badges
const COURSE_COLORS: Record<string, string> = {
  'beginning': '#F59E0B',    // Amber
  'intermediate': '#8B5CF6', // Purple
  'advanced': '#EF4444',     // Red
  'mastery': '#3B82F6',      // Blue
  'facilitator': '#10B981',  // Green
}

function getCourseColor(slug: string): string {
  return COURSE_COLORS[slug] || '#6B7280'
}

export function Courses() {
  const { data: courses, isLoading } = useCourses()
  const updateCourse = useUpdateCourse()

  const toggleVisibility = (id: string, currentValue: boolean, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    updateCourse.mutate({ id, updates: { is_published: !currentValue } })
  }

  if (isLoading) {
    return <div className="page loading">Loading courses...</div>
  }

  return (
    <div className="page courses">
      <header className="page-header">
        <h1>Courses</h1>
        <p className="subtitle">{courses?.length || 0} courses configured</p>
      </header>

      <div className="courses-list">
        {courses?.map(course => {
          const color = getCourseColor(course.slug)

          return (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="course-card"
              style={{ borderLeftColor: color }}
            >
              <div className="course-icon" style={{ backgroundColor: color + '15', color }}>
                <GraduationCap size={24} />
              </div>

              <div className="course-info">
                <div className="course-title-row">
                  <h3>{course.name}</h3>
                  <span
                    className="course-badge"
                    style={{ backgroundColor: color + '20', color }}
                  >
                    {course.slug}
                  </span>
                </div>
                {course.description && (
                  <p className="course-desc">{course.description}</p>
                )}
                <div className="course-meta">
                  <span><BookOpen size={14} /> Modules</span>
                  <span><Video size={14} /> Lessons</span>
                </div>
              </div>

              <div className="course-actions">
                <button
                  className={`btn-visibility ${course.is_published ? 'visible' : 'hidden'}`}
                  onClick={(e) => toggleVisibility(course.id, course.is_published, e)}
                  title={course.is_published ? 'Visible to students' : 'Hidden from students'}
                >
                  {course.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <ChevronRight size={20} className="chevron" />
              </div>
            </Link>
          )
        })}

        {(!courses || courses.length === 0) && (
          <div className="empty-state">
            <GraduationCap size={48} />
            <h3>No courses found</h3>
            <p>Courses will appear here once they are added to the database.</p>
          </div>
        )}
      </div>
    </div>
  )
}
