import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface UserCourseAccess {
  id: string
  user_id: string
  course_id: string
  granted_at: string
  granted_by: string | null
}

export interface Course {
  id: string
  slug: string
  name: string
  description: string | null
  color: string | null
  sort_order: number
  is_default: boolean
  is_published: boolean
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

// Get course access for a specific user (by auth user_id)
export function useUserCourseAccess(userId: string | null) {
  return useQuery({
    queryKey: ['user-course-access', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('user_course_access')
        .select('*, courses(*)')
        .eq('user_id', userId)

      if (error) throw error
      return data as (UserCourseAccess & { courses: Course })[]
    },
    enabled: !!userId,
  })
}

// Get the auth user_id for an applicant (via their email -> applications table)
export function useApplicantUserId(applicantEmail: string | null) {
  return useQuery({
    queryKey: ['applicant-user-id', applicantEmail],
    queryFn: async () => {
      if (!applicantEmail) return null

      // Find the application with this email to get user_id
      const { data, error } = await supabase
        .from('applications')
        .select('user_id')
        .eq('email', applicantEmail)
        .maybeSingle()

      if (error) throw error
      return data?.user_id || null
    },
    enabled: !!applicantEmail,
  })
}

// Grant course access to a user
export function useGrantCourseAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { data, error } = await supabase
        .from('user_course_access')
        .upsert({
          user_id: userId,
          course_id: courseId,
          granted_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,course_id'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-course-access', variables.userId] })
    },
  })
}

// Revoke course access from a user
export function useRevokeCourseAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { error } = await supabase
        .from('user_course_access')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId)

      if (error) throw error
      return { userId, courseId }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-course-access', variables.userId] })
    },
  })
}

// Grant Beginning course access (for auto-grant on Payment stage)
export function useGrantBeginningCourseAccess() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, sendEmail = true }: { userId: string; sendEmail?: boolean }) => {
      // First, find the Beginning course
      const { data: beginningCourse, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', 'beginning')
        .single()

      if (courseError) throw courseError
      if (!beginningCourse) throw new Error('Beginning course not found')

      // Grant access
      const { data, error } = await supabase
        .from('user_course_access')
        .upsert({
          user_id: userId,
          course_id: beginningCourse.id,
          granted_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,course_id'
        })
        .select()
        .single()

      if (error) throw error

      // Send email notification if requested
      if (sendEmail) {
        try {
          await supabase.functions.invoke('send-course-access-email', {
            body: { user_id: userId, course_name: 'Beginning' }
          })
        } catch (emailError) {
          console.error('Failed to send course access email:', emailError)
          // Don't throw - access was granted, email is secondary
        }
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-course-access', variables.userId] })
    },
  })
}

// Check if user has access to a specific course
export function useHasCourseAccess(userId: string | null, courseSlug: string) {
  return useQuery({
    queryKey: ['has-course-access', userId, courseSlug],
    queryFn: async () => {
      if (!userId) return false

      // Check if course is default (everyone has access) or user has explicit access
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, is_default')
        .eq('slug', courseSlug)
        .single()

      if (courseError) return false
      if (!course) return false
      if (course.is_default) return true

      // Check explicit access
      const { data: access, error: accessError } = await supabase
        .from('user_course_access')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', course.id)
        .maybeSingle()

      if (accessError) return false
      return !!access
    },
    enabled: !!userId,
  })
}
