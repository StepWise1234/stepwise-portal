import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Types for course management - matching database schema
export interface Course {
  id: string
  name: string
  slug: string
  description: string | null
  color: string | null
  is_published: boolean
  is_default: boolean
  sort_order: number
  created_at: string | null
  updated_at: string | null
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  is_published: boolean
  created_at: string | null
  updated_at: string | null
  lessons?: CourseLesson[]
  resources?: CourseResource[]
}

export interface CourseLesson {
  id: string
  module_id: string
  title: string
  description: string | null
  vimeo_id: string | null
  duration_minutes: number | null
  sort_order: number
  is_published: boolean
  created_at: string | null
  updated_at: string | null
}

export interface CourseResource {
  id: string
  module_id: string
  title: string
  file_path: string
  resource_type: string
  sort_order: number
  created_at: string | null
}

// Get all courses
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Course[]
    },
  })
}

// Get single course with modules and lessons
export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) throw new Error('No course ID provided')

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Course
    },
    enabled: !!id,
  })
}

// Get modules for a course
export function useCourseModules(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('No course ID provided')

      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons:course_lessons(*),
          resources:course_resources(*)
        `)
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true })

      if (error) throw error

      // Sort lessons and resources within each module
      return (data as CourseModule[]).map(module => ({
        ...module,
        lessons: (module.lessons || []).sort((a, b) => a.sort_order - b.sort_order),
        resources: (module.resources || []).sort((a, b) => a.sort_order - b.sort_order),
      }))
    },
    enabled: !!courseId,
  })
}

// Update course
export function useUpdateCourse() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Course> }) => {
      const { data, error } = await supabase
        .from('courses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course', variables.id] })
    },
  })
}

// Create module
export function useCreateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (module: Omit<CourseModule, 'id' | 'created_at' | 'updated_at' | 'lessons' | 'resources'>) => {
      const { data, error } = await supabase
        .from('course_modules')
        .insert(module)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', variables.course_id] })
    },
  })
}

// Update module
export function useUpdateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; courseId: string; updates: Partial<CourseModule> }) => {
      const { data, error } = await supabase
        .from('course_modules')
        .update({ ...params.updates, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single()

      if (error) throw error
      return { data, courseId: params.courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Delete module
export function useDeleteModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', params.id)

      if (error) throw error
      return { courseId: params.courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Reorder modules
export function useReorderModules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { courseId: string; moduleIds: string[] }) => {
      const updates = params.moduleIds.map((id, index) => ({
        id,
        sort_order: index,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('course_modules')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)

        if (error) throw error
      }
      return { courseId: params.courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Create lesson
export function useCreateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, lesson }: { courseId: string; lesson: Omit<CourseLesson, 'id' | 'created_at' | 'updated_at'> }) => {
      const { data, error } = await supabase
        .from('course_lessons')
        .insert(lesson)
        .select()
        .single()

      if (error) throw error
      return { data, courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Update lesson
export function useUpdateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, courseId, updates }: { id: string; courseId: string; updates: Partial<CourseLesson> }) => {
      const { data, error } = await supabase
        .from('course_lessons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Delete lesson
export function useDeleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Reorder lessons within a module
export function useReorderLessons() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, moduleId, lessonIds }: { courseId: string; moduleId: string; lessonIds: string[] }) => {
      const updates = lessonIds.map((id, index) => ({
        id,
        sort_order: index,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from('course_lessons')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)

        if (error) throw error
      }
      return { courseId, moduleId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Upload resource (creates record - actual file upload handled separately)
export function useCreateResource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ courseId, resource }: { courseId: string; resource: Omit<CourseResource, 'id' | 'created_at'> }) => {
      const { data, error } = await supabase
        .from('course_resources')
        .insert(resource)
        .select()
        .single()

      if (error) throw error
      return { data, courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}

// Delete resource
export function useDeleteResource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('course_resources')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { courseId }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['course-modules', result.courseId] })
    },
  })
}
