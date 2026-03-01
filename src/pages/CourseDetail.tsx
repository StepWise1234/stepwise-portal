import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Video,
  X,
  Loader2
} from 'lucide-react'
import {
  useCourse,
  useCourseModules,
  useUpdateCourse,
  useCreateModule,
  useUpdateModule,
  useDeleteModule,
  useReorderModules,
  useCreateLesson,
  useUpdateLesson,
  useDeleteLesson,
  useReorderLessons,
  useCreateResource,
  useDeleteResource,
  type CourseModule,
  type CourseLesson,
} from '../hooks/useCourses'

// Course colors
const COURSE_COLORS: Record<string, string> = {
  'beginning': '#F59E0B',
  'intermediate': '#8B5CF6',
  'advanced': '#EF4444',
  'mastery': '#3B82F6',
  'facilitator': '#10B981',
}

function getCourseColor(slug: string): string {
  return COURSE_COLORS[slug] || '#6B7280'
}

// Format duration (in minutes)
function formatDuration(minutes: number | null): string {
  if (!minutes) return '-'
  return `${minutes} min`
}

// Sortable Lesson Item
function SortableLesson({
  lesson,
  onEdit,
  onDelete,
  onToggleVisibility
}: {
  lesson: CourseLesson
  onEdit: (lesson: CourseLesson) => void
  onDelete: (id: string) => void
  onToggleVisibility: (id: string, visible: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="lesson-row">
      <div className="drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>
      <div className="lesson-info">
        <span className="lesson-title">{lesson.title}</span>
        <span className="lesson-meta">
          {lesson.vimeo_id && (
            <span className="vimeo-id">
              <Video size={12} /> {lesson.vimeo_id}
            </span>
          )}
          <span className="duration">{formatDuration(lesson.duration_minutes)}</span>
        </span>
      </div>
      <div className="lesson-actions">
        <button
          className={`btn-icon ${lesson.is_published ? 'visible' : 'hidden'}`}
          onClick={() => onToggleVisibility(lesson.id, !lesson.is_published)}
          title={lesson.is_published ? 'Published' : 'Hidden'}
        >
          {lesson.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button className="btn-icon" onClick={() => onEdit(lesson)} title="Edit">
          <Edit2 size={14} />
        </button>
        <button className="btn-icon danger" onClick={() => onDelete(lesson.id)} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// Sortable Module Item
function SortableModule({
  module,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleVisibility,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleLessonVisibility,
  onReorderLessons,
  onAddResource,
  onDeleteResource
}: {
  module: CourseModule
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: (module: CourseModule) => void
  onDelete: (id: string) => void
  onToggleVisibility: (id: string, visible: boolean) => void
  onAddLesson: (moduleId: string) => void
  onEditLesson: (lesson: CourseLesson) => void
  onDeleteLesson: (id: string) => void
  onToggleLessonVisibility: (id: string, visible: boolean) => void
  onReorderLessons: (moduleId: string, lessonIds: string[]) => void
  onAddResource: (moduleId: string) => void
  onDeleteResource: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const lessons = module.lessons || []
      const oldIndex = lessons.findIndex(l => l.id === active.id)
      const newIndex = lessons.findIndex(l => l.id === over.id)
      const newOrder = arrayMove(lessons, oldIndex, newIndex)
      onReorderLessons(module.id, newOrder.map(l => l.id))
    }
  }

  const videoCount = (module.lessons || []).length
  const resourceCount = (module.resources || []).length

  return (
    <div ref={setNodeRef} style={style} className={`module-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="module-header">
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical size={16} />
        </div>
        <div className="module-info" onClick={onToggleExpand}>
          <h4>{module.title}</h4>
          <div className="module-meta">
            <span><Video size={12} /> {videoCount} videos</span>
            <span><FileText size={12} /> {resourceCount} resources</span>
          </div>
        </div>
        <div className="module-actions">
          <button
            className={`btn-icon ${module.is_published ? 'visible' : 'hidden'}`}
            onClick={() => onToggleVisibility(module.id, !module.is_published)}
            title={module.is_published ? 'Published' : 'Hidden'}
          >
            {module.is_published ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button className="btn-icon" onClick={() => onEdit(module)} title="Edit">
            <Edit2 size={16} />
          </button>
          <button className="btn-icon danger" onClick={() => onDelete(module.id)} title="Delete">
            <Trash2 size={16} />
          </button>
          <button className="btn-icon expand" onClick={onToggleExpand}>
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="module-content">
          {module.description && (
            <p className="module-desc">{module.description}</p>
          )}

          {/* Lessons */}
          <div className="lessons-section">
            <div className="section-header-compact">
              <h5>Lessons</h5>
              <button className="btn-add-small" onClick={() => onAddLesson(module.id)}>
                <Plus size={14} /> Add
              </button>
            </div>
            {(module.lessons && module.lessons.length > 0) ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLessonDragEnd}
              >
                <SortableContext
                  items={module.lessons.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="lessons-list">
                    {module.lessons.map(lesson => (
                      <SortableLesson
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={onEditLesson}
                        onDelete={onDeleteLesson}
                        onToggleVisibility={onToggleLessonVisibility}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="empty-text">No lessons yet</p>
            )}
          </div>

          {/* Resources */}
          <div className="resources-section">
            <div className="section-header-compact">
              <h5>Resources</h5>
              <button className="btn-add-small" onClick={() => onAddResource(module.id)}>
                <Plus size={14} /> Add
              </button>
            </div>
            {(module.resources && module.resources.length > 0) ? (
              <div className="resources-list">
                {module.resources.map(resource => (
                  <div key={resource.id} className="resource-row">
                    <FileText size={14} />
                    <span className="resource-title">{resource.title}</span>
                    <span className="resource-type">{resource.resource_type || 'pdf'}</span>
                    <button
                      className="btn-icon danger"
                      onClick={() => onDeleteResource(resource.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">No resources yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CourseDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: course, isLoading: courseLoading } = useCourse(id)
  const { data: modules, isLoading: modulesLoading } = useCourseModules(id)

  const updateCourse = useUpdateCourse()
  const createModule = useCreateModule()
  const updateModule = useUpdateModule()
  const deleteModule = useDeleteModule()
  const reorderModules = useReorderModules()
  const createLesson = useCreateLesson()
  const updateLesson = useUpdateLesson()
  const deleteLesson = useDeleteLesson()
  const reorderLessons = useReorderLessons()
  const createResource = useCreateResource()
  const deleteResource = useDeleteResource()

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [editingCourse, setEditingCourse] = useState(false)
  const [courseDesc, setCourseDesc] = useState('')

  // Modal states
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null)
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' })

  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null)
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState({ title: '', vimeo_id: '', duration_minutes: '' })

  const [showResourceModal, setShowResourceModal] = useState(false)
  const [resourceModuleId, setResourceModuleId] = useState<string | null>(null)
  const [resourceForm, setResourceForm] = useState({ title: '', file_path: '', resource_type: 'pdf' })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (courseLoading || modulesLoading) {
    return <div className="page loading">Loading course...</div>
  }

  if (!course) {
    return <div className="page error">Course not found</div>
  }

  const color = getCourseColor(course.slug)

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && modules && id) {
      const oldIndex = modules.findIndex(m => m.id === active.id)
      const newIndex = modules.findIndex(m => m.id === over.id)
      const newOrder = arrayMove(modules, oldIndex, newIndex)
      reorderModules.mutate({ courseId: id, moduleIds: newOrder.map(m => m.id) })
    }
  }

  // Course description editing
  const startEditCourse = () => {
    setCourseDesc(course.description || '')
    setEditingCourse(true)
  }

  const saveCourseDesc = () => {
    updateCourse.mutate({ id: course.id, updates: { description: courseDesc } })
    setEditingCourse(false)
  }

  // Module handlers
  const openAddModule = () => {
    setEditingModule(null)
    setModuleForm({ title: '', description: '' })
    setShowModuleModal(true)
  }

  const openEditModule = (module: CourseModule) => {
    setEditingModule(module)
    setModuleForm({ title: module.title, description: module.description || '' })
    setShowModuleModal(true)
  }

  const saveModule = () => {
    if (!id) return
    if (editingModule) {
      updateModule.mutate({
        id: editingModule.id,
        courseId: id,
        updates: { title: moduleForm.title, description: moduleForm.description || null }
      })
    } else {
      const sortOrder = (modules?.length || 0)
      createModule.mutate({
        course_id: id,
        title: moduleForm.title,
        description: moduleForm.description || null,
        sort_order: sortOrder,
        is_published: true
      })
    }
    setShowModuleModal(false)
  }

  const handleDeleteModule = (moduleId: string) => {
    if (!id) return
    if (confirm('Delete this module and all its lessons?')) {
      deleteModule.mutate({ id: moduleId, courseId: id })
    }
  }

  const handleToggleModuleVisibility = (moduleId: string, visible: boolean) => {
    if (!id) return
    updateModule.mutate({ id: moduleId, courseId: id, updates: { is_published: visible } })
  }

  // Lesson handlers
  const openAddLesson = (moduleId: string) => {
    setEditingLesson(null)
    setLessonModuleId(moduleId)
    setLessonForm({ title: '', vimeo_id: '', duration_minutes: '' })
    setShowLessonModal(true)
  }

  const openEditLesson = (lesson: CourseLesson) => {
    setEditingLesson(lesson)
    setLessonModuleId(lesson.module_id)
    setLessonForm({
      title: lesson.title,
      vimeo_id: lesson.vimeo_id || '',
      duration_minutes: lesson.duration_minutes?.toString() || ''
    })
    setShowLessonModal(true)
  }

  const saveLesson = () => {
    if (!id || !lessonModuleId) return
    const duration = lessonForm.duration_minutes ? parseInt(lessonForm.duration_minutes) : null

    if (editingLesson) {
      updateLesson.mutate({
        id: editingLesson.id,
        courseId: id,
        updates: {
          title: lessonForm.title,
          vimeo_id: lessonForm.vimeo_id || null,
          duration_minutes: duration
        }
      })
    } else {
      const module = modules?.find(m => m.id === lessonModuleId)
      const sortOrder = (module?.lessons?.length || 0)
      createLesson.mutate({
        courseId: id,
        lesson: {
          module_id: lessonModuleId,
          title: lessonForm.title,
          description: null,
          vimeo_id: lessonForm.vimeo_id || null,
          duration_minutes: duration,
          sort_order: sortOrder,
          is_published: true
        }
      })
    }
    setShowLessonModal(false)
  }

  const handleDeleteLesson = (lessonId: string) => {
    if (!id) return
    if (confirm('Delete this lesson?')) {
      deleteLesson.mutate({ id: lessonId, courseId: id })
    }
  }

  const handleToggleLessonVisibility = (lessonId: string, visible: boolean) => {
    if (!id) return
    updateLesson.mutate({ id: lessonId, courseId: id, updates: { is_published: visible } })
  }

  const handleReorderLessons = (moduleId: string, lessonIds: string[]) => {
    if (!id) return
    reorderLessons.mutate({ courseId: id, moduleId, lessonIds })
  }

  // Resource handlers
  const openAddResource = (moduleId: string) => {
    setResourceModuleId(moduleId)
    setResourceForm({ title: '', file_path: '', resource_type: 'pdf' })
    setShowResourceModal(true)
  }

  const saveResource = () => {
    if (!id || !resourceModuleId) return
    const module = modules?.find(m => m.id === resourceModuleId)
    const sortOrder = (module?.resources?.length || 0)
    createResource.mutate({
      courseId: id,
      resource: {
        module_id: resourceModuleId,
        title: resourceForm.title,
        file_path: resourceForm.file_path,
        resource_type: resourceForm.resource_type,
        sort_order: sortOrder
      }
    })
    setShowResourceModal(false)
  }

  const handleDeleteResource = (resourceId: string) => {
    if (!id) return
    if (confirm('Delete this resource?')) {
      deleteResource.mutate({ id: resourceId, courseId: id })
    }
  }

  return (
    <div className="page course-detail">
      <header className="page-header">
        <Link to="/courses" className="back-link">
          <ArrowLeft size={20} />
          Back to Courses
        </Link>
      </header>

      {/* Course Header */}
      <div className="course-header-card" style={{ borderLeftColor: color }}>
        <div className="course-header-info">
          <div className="course-title-row">
            <h1>{course.name}</h1>
            <span className="course-badge" style={{ backgroundColor: color + '20', color }}>
              {course.slug}
            </span>
            <button
              className={`btn-visibility ${course.is_published ? 'visible' : 'hidden'}`}
              onClick={() => updateCourse.mutate({ id: course.id, updates: { is_published: !course.is_published } })}
              title={course.is_published ? 'Published' : 'Hidden from students'}
            >
              {course.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {editingCourse ? (
            <div className="edit-desc-form">
              <textarea
                value={courseDesc}
                onChange={e => setCourseDesc(e.target.value)}
                placeholder="Course description..."
                rows={2}
              />
              <div className="edit-actions">
                <button className="btn-save-small" onClick={saveCourseDesc}>
                  <Save size={14} /> Save
                </button>
                <button className="btn-cancel-small" onClick={() => setEditingCourse(false)}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <p className="course-desc" onClick={startEditCourse}>
              {course.description || <em className="empty">Click to add description...</em>}
              <Edit2 size={14} className="edit-icon" />
            </p>
          )}

          <div className="course-stats">
            <span>{modules?.length || 0} modules</span>
            <span>{modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} lessons</span>
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="modules-section">
        <div className="section-header">
          <h2>Modules</h2>
          <button className="btn-add" onClick={openAddModule}>
            <Plus size={16} /> Add Module
          </button>
        </div>

        {modules && modules.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModuleDragEnd}
          >
            <SortableContext
              items={modules.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="modules-list">
                {modules.map(module => (
                  <SortableModule
                    key={module.id}
                    module={module}
                    isExpanded={expandedModules.has(module.id)}
                    onToggleExpand={() => toggleModuleExpand(module.id)}
                    onEdit={openEditModule}
                    onDelete={handleDeleteModule}
                    onToggleVisibility={handleToggleModuleVisibility}
                    onAddLesson={openAddLesson}
                    onEditLesson={openEditLesson}
                    onDeleteLesson={handleDeleteLesson}
                    onToggleLessonVisibility={handleToggleLessonVisibility}
                    onReorderLessons={handleReorderLessons}
                    onAddResource={openAddResource}
                    onDeleteResource={handleDeleteResource}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="empty-modules">
            <p>No modules yet. Add your first module to get started.</p>
          </div>
        )}
      </div>

      {/* Module Modal */}
      {showModuleModal && (
        <div className="modal-overlay" onClick={() => setShowModuleModal(false)}>
          <div className="modal-content compact" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingModule ? 'Edit Module' : 'Add Module'}</h2>
              <button className="btn-close" onClick={() => setShowModuleModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={e => setModuleForm({ ...moduleForm, title: e.target.value })}
                  placeholder="Module title..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={moduleForm.description}
                  onChange={e => setModuleForm({ ...moduleForm, description: e.target.value })}
                  placeholder="Module description..."
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModuleModal(false)}>Cancel</button>
              <button
                className="btn-save"
                onClick={saveModule}
                disabled={!moduleForm.title || createModule.isPending || updateModule.isPending}
              >
                {(createModule.isPending || updateModule.isPending) ? (
                  <><Loader2 size={16} className="spin" /> Saving...</>
                ) : (
                  editingModule ? 'Save Changes' : 'Add Module'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="modal-overlay" onClick={() => setShowLessonModal(false)}>
          <div className="modal-content compact" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</h2>
              <button className="btn-close" onClick={() => setShowLessonModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="Lesson title..."
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Vimeo ID</label>
                  <input
                    type="text"
                    value={lessonForm.vimeo_id}
                    onChange={e => setLessonForm({ ...lessonForm, vimeo_id: e.target.value })}
                    placeholder="e.g., 123456789"
                  />
                </div>
                <div className="form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    value={lessonForm.duration_minutes}
                    onChange={e => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowLessonModal(false)}>Cancel</button>
              <button
                className="btn-save"
                onClick={saveLesson}
                disabled={!lessonForm.title || createLesson.isPending || updateLesson.isPending}
              >
                {(createLesson.isPending || updateLesson.isPending) ? (
                  <><Loader2 size={16} className="spin" /> Saving...</>
                ) : (
                  editingLesson ? 'Save Changes' : 'Add Lesson'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Modal */}
      {showResourceModal && (
        <div className="modal-overlay" onClick={() => setShowResourceModal(false)}>
          <div className="modal-content compact" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Resource</h2>
              <button className="btn-close" onClick={() => setShowResourceModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={resourceForm.title}
                  onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                  placeholder="Resource title..."
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>File Path</label>
                <input
                  type="text"
                  value={resourceForm.file_path}
                  onChange={e => setResourceForm({ ...resourceForm, file_path: e.target.value })}
                  placeholder="path/to/file.pdf"
                />
              </div>
              <div className="form-group">
                <label>Resource Type</label>
                <select
                  value={resourceForm.resource_type}
                  onChange={e => setResourceForm({ ...resourceForm, resource_type: e.target.value })}
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="xlsx">XLSX</option>
                  <option value="image">Image</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowResourceModal(false)}>Cancel</button>
              <button
                className="btn-save"
                onClick={saveResource}
                disabled={!resourceForm.title || !resourceForm.file_path || createResource.isPending}
              >
                {createResource.isPending ? (
                  <><Loader2 size={16} className="spin" /> Saving...</>
                ) : (
                  'Add Resource'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
