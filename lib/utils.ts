import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const APP_VERSION = '0.5.0'

export const isProfileComplete = (profile: Record<string, any> | null | undefined) => {
  if (!profile) {
    return false
  }

  const requiredStrings = [
    'skill_level',
    'play_frequency',
    'preferred_round_time',
    'pace_of_play',
    'swing_tendency',
    'group_preference',
    'business_talk_preference',
    'drinks_on_course_preference',
    'money_game_preference',
    'distraction_tolerance',
  ]

  const hasStrings = requiredStrings.every((field) => Boolean(profile[field]))
  const hasInterests = Array.isArray(profile.interests) && profile.interests.length > 0
  const hasMatchGoals = Array.isArray(profile.match_goals) && profile.match_goals.length > 0
  const hasTraits = Array.isArray(profile.personality_traits) && profile.personality_traits.length > 0

  return hasStrings && hasInterests && hasMatchGoals && hasTraits
}
