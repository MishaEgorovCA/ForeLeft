"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BREAKDOWN_LABELS, computeCompatibility, formatLabel } from "@/lib/matchmaking"

type QueueEntryWithProfile = {
  id: string
  user_id: string
  group_size?: number | null
  status: string
  profile: any
  compatibility?: ReturnType<typeof computeCompatibility>
}

type MatchSuggestion = {
  id: string
  entries: QueueEntryWithProfile[]
  totalGroupSize: number
  compatibility: {
    score: number
    breakdown: Record<string, number>
  }
}

export default function CourseDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const courseId = params.courseId as string
  const supabase = useMemo(() => createClient(), [])

  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [teeTimes, setTeeTimes] = useState<any[]>([])
  const [queueEntry, setQueueEntry] = useState<any>(null)
  const [matchCandidates, setMatchCandidates] = useState<MatchSuggestion[]>([])
  const [availableQueueEntries, setAvailableQueueEntries] = useState<QueueEntryWithProfile[]>([])
  const [groupSize, setGroupSize] = useState<number>(1)
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0)
  const [matchmakingLoading, setMatchmakingLoading] = useState(false)
  const [requestingMatch, setRequestingMatch] = useState(false)
  const [matchmakingError, setMatchmakingError] = useState<string | null>(null)
  const [matchmakingNotice, setMatchmakingNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const lastCandidateRef = useRef<string | null>(null)
  const userIdRef = useRef<string>("")
  const profileRef = useRef<any>(null)
  const groupSizeRef = useRef<number>(1)

  const selectedDate = searchParams.get("date") || new Date().toISOString().split("T")[0]

  const friendlyDateLabel = useMemo(
    () =>
      new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [selectedDate],
  )

  const selectedCandidate = matchCandidates[selectedCandidateIndex] ?? null
  const primaryCandidateEntry = selectedCandidate?.entries[0] ?? null
  const additionalCandidateEntries = selectedCandidate ? selectedCandidate.entries.slice(1) : []
  const projectedGroupSize = Math.min(4, groupSize + (selectedCandidate?.totalGroupSize ?? 0))
  const projectedPlayersNeeded = Math.max(0, 4 - projectedGroupSize)
  const candidateBreakdown = useMemo(() => {
    if (!selectedCandidate?.compatibility?.breakdown) {
      return []
    }

    return Object.entries(selectedCandidate.compatibility.breakdown)
      .map(([key, value]) => ({ key, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }, [selectedCandidate])

  const showFoundMatch = Boolean(queueEntry && queueEntry.status === "searching" && matchCandidates.length > 0)
  const playersNeeded = Math.max(0, 4 - groupSize)

  const computeAggregatedCompatibility = useCallback((entries: QueueEntryWithProfile[]) => {
    if (entries.length === 0) {
      return { score: 0, breakdown: {} }
    }

    let totalWeight = 0
    let totalScore = 0
    const breakdownTotals: Record<string, number> = {}

    entries.forEach((entry) => {
      const weight = Math.max(1, entry.group_size ?? 1)
      const compatibility = entry.compatibility

      totalWeight += weight
      totalScore += (compatibility?.score ?? 0) * weight

      if (compatibility?.breakdown) {
        Object.entries(compatibility.breakdown).forEach(([key, value]) => {
          breakdownTotals[key] = (breakdownTotals[key] ?? 0) + Number(value) * weight
        })
      }
    })

    if (totalWeight === 0) {
      return { score: 0, breakdown: {} }
    }

    const averagedBreakdown = Object.fromEntries(
      Object.entries(breakdownTotals).map(([key, value]) => [key, value / totalWeight]),
    )

    return {
      score: Math.round(totalScore / totalWeight),
      breakdown: averagedBreakdown,
    }
  }, [])

  const findCombinations = useCallback((entries: QueueEntryWithProfile[], target: number) => {
    const results: QueueEntryWithProfile[][] = []

    const backtrack = (start: number, current: QueueEntryWithProfile[], total: number) => {
      if (total === target) {
        results.push([...current])
        return
      }

      if (total > target) {
        return
      }

      for (let index = start; index < entries.length; index += 1) {
        const entry = entries[index]
        const size = Math.max(1, entry.group_size ?? 1)
        current.push(entry)
        backtrack(index + 1, current, total + size)
        current.pop()
      }
    }

    backtrack(0, [], 0)
    return results
  }, [])

  const buildMatchSuggestions = useCallback(
    (entries: QueueEntryWithProfile[], myGroupSize: number): MatchSuggestion[] => {
      const normalized = entries.map((entry) => ({
        ...entry,
        group_size: Math.min(4, Math.max(1, entry.group_size ?? 1)),
      }))

      const remainingSpots = Math.max(0, 4 - Math.min(4, Math.max(1, myGroupSize)))

      if (remainingSpots === 0) {
        return []
      }

      const viable = normalized.filter((entry) => entry.group_size <= remainingSpots)
      const sortedViable = [...viable].sort(
        (a, b) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0),
      )

      const suggestions: MatchSuggestion[] = []

      sortedViable.forEach((entry) => {
        suggestions.push({
          id: entry.id,
          entries: [entry],
          totalGroupSize: entry.group_size ?? 1,
          compatibility: computeAggregatedCompatibility([entry]),
        })
      })

      if (remainingSpots > 1) {
        const combos = findCombinations(sortedViable, remainingSpots)
        combos.forEach((combo: QueueEntryWithProfile[]) => {
          if (combo.length <= 1) {
            return
          }
          const key = combo
            .map((item: QueueEntryWithProfile) => item.id)
            .sort()
            .join("-")

          if (suggestions.some((suggestion) => suggestion.id === key)) {
            return
          }

          suggestions.push({
            id: key,
            entries: combo,
            totalGroupSize: combo.reduce<number>(
              (sum, item) => sum + Math.max(1, item.group_size ?? 1),
              0,
            ),
            compatibility: computeAggregatedCompatibility(combo),
          })
        })
      }

      return suggestions.sort((a, b) => (b.compatibility.score ?? 0) - (a.compatibility.score ?? 0))
    },
    [computeAggregatedCompatibility, findCombinations],
  )

  const refreshMatchmaking = useCallback(
    async (profileOverride?: any, userIdOverride?: string) => {
      const activeProfile = profileOverride ?? profileRef.current
      const activeUserId = userIdOverride ?? userIdRef.current

      if (!activeProfile || !activeUserId) {
        return
      }

      const { data, error } = await supabase
        .from("course_match_queue")
        .select(
          `*,
          profile:profiles!course_match_queue_user_id_fkey (
            id,
            display_name,
            skill_level,
            average_handicap,
            avatar_url,
            interests,
            match_goals,
            personality_traits,
            play_frequency,
            preferred_round_time,
            pace_of_play,
            swing_tendency,
            group_preference,
            business_talk_preference,
            drinks_on_course_preference,
            money_game_preference,
            distraction_tolerance
          )
        `,
        )
        .eq("course_id", courseId)
        .eq("play_date", selectedDate)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Failed to load matchmaking queue", error)
        setMatchmakingError(error.message || "Unable to load course matchmaking queue")
        return
      }

      const myEntry = data?.find((entry: any) => entry.user_id === activeUserId) ?? null
      const normalizedMyGroupSize = Math.min(4, Math.max(1, myEntry?.group_size ?? groupSizeRef.current ?? 1))
      setGroupSize(normalizedMyGroupSize)
      groupSizeRef.current = normalizedMyGroupSize

      const others = (data ?? []).filter(
        (entry: any) => entry.user_id !== activeUserId && entry.status === "searching",
      )

      const enrichedEntries: QueueEntryWithProfile[] = others
        .map((entry: any) => {
          const normalizedGroupSize = Math.min(4, Math.max(1, entry.group_size ?? 1))
          return {
            ...entry,
            group_size: normalizedGroupSize,
            profile: entry.profile,
            compatibility: computeCompatibility(activeProfile, entry.profile),
          } as QueueEntryWithProfile
        })
        .sort(
          (a: QueueEntryWithProfile, b: QueueEntryWithProfile) =>
            (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0),
        )

      setQueueEntry(myEntry)
      setAvailableQueueEntries(enrichedEntries)

      const suggestions = buildMatchSuggestions(enrichedEntries, normalizedMyGroupSize)
      setMatchCandidates(suggestions)
      setMatchmakingError(null)

      if (suggestions.length === 0) {
        setSelectedCandidateIndex(0)
      }
    },
    [supabase, courseId, selectedDate, buildMatchSuggestions],
  )

  useEffect(() => {
    setCourse(null)
    setTeeTimes([])
    setQueueEntry(null)
    setMatchCandidates([])
    setLoading(true)
    setLoadError(null)
    setAvailableQueueEntries([])
    setGroupSize(1)
    userIdRef.current = ""
    profileRef.current = null
    groupSizeRef.current = 1

    let isMounted = true

    async function loadData() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          router.push("/auth/login")
          return
        }

        setCurrentUserId(user.id)
        userIdRef.current = user.id

        const [courseResponse, teeTimesResponse, profileResponse] = await Promise.all([
          supabase.from("courses").select("*").eq("id", courseId).single(),
          supabase
            .from("tee_times")
            .select("*")
            .eq("course_id", courseId)
            .eq("date", selectedDate)
            .order("time"),
          supabase.from("profiles").select("*").eq("id", user.id).single(),
        ])

        if (courseResponse.error) {
          throw courseResponse.error
        }

        if (!courseResponse.data) {
          router.push("/tee-times")
          return
        }

        if (!isMounted) {
          return
        }

        setCourse(courseResponse.data)

        if (teeTimesResponse.error) {
          setLoadError(teeTimesResponse.error.message)
        }
        setTeeTimes(teeTimesResponse.data || [])

        if (profileResponse.error) {
          setLoadError(profileResponse.error.message)
        }
        setCurrentProfile(profileResponse.data)
        profileRef.current = profileResponse.data

        await refreshMatchmaking(profileResponse.data, user.id)
      } catch (error: any) {
        console.error("Failed to load course detail", error)
        setLoadError((prev: string | null) => prev ?? error?.message ?? "Unable to load this course right now.")
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [router, supabase, courseId, selectedDate, refreshMatchmaking])

  useEffect(() => {
    if (matchCandidates.length === 0) {
      setSelectedCandidateIndex(0)
      return
    }

    if (selectedCandidateIndex >= matchCandidates.length) {
      setSelectedCandidateIndex(0)
    }
  }, [matchCandidates.length, selectedCandidateIndex])

  useEffect(() => {
    const candidateKey = selectedCandidate?.id ?? null
    if (
      queueEntry &&
      queueEntry.status === "searching" &&
      showFoundMatch &&
      candidateKey &&
      lastCandidateRef.current !== candidateKey
    ) {
      const score = selectedCandidate.compatibility?.score ?? 0
      const names = selectedCandidate.entries
        .map((entry: QueueEntryWithProfile) => entry.profile?.display_name)
        .filter(Boolean) as string[]
      const nameLabel =
        names.length === 0
          ? "a golfer"
          : names.length === 1
            ? names[0]
            : `${names[0]} +${names.length - 1}`

      setMatchmakingNotice(`We found a ${score}% match with ${nameLabel}.`)
      lastCandidateRef.current = candidateKey
    }

    if (!showFoundMatch) {
      lastCandidateRef.current = null
    }
  }, [queueEntry, selectedCandidate, showFoundMatch])

  useEffect(() => {
    if (!currentUserId) {
      return
    }

    const channel = supabase
      .channel(`course-match-${courseId}-${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_match_queue",
          filter: `course_id=eq.${courseId}`,
        },
        (payload: { new: Record<string, any> | null; old: Record<string, any> | null }) => {
          const next = payload.new as { play_date?: string } | null
          const prev = payload.old as { play_date?: string } | null

          if (next?.play_date === selectedDate || prev?.play_date === selectedDate) {
            refreshMatchmaking()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, courseId, selectedDate, currentUserId, refreshMatchmaking])

  const handleDateChange = (date: string) => {
    router.push(`/tee-times/${courseId}?date=${date}`)
  }

  const handleGroupSizeSelection = (size: number) => {
    if (size === groupSize || size < 1 || size > 3) {
      return
    }

    if (queueEntry) {
      setMatchmakingNotice("Update your queue entry to change group size.")
      return
    }

    setGroupSize(size)
    groupSizeRef.current = size
    lastCandidateRef.current = null

    const nextSuggestions = buildMatchSuggestions(availableQueueEntries, size)
    setMatchCandidates(nextSuggestions)
    setSelectedCandidateIndex(0)
  }

  const handleStartMatchmaking = async () => {
    if (groupSize >= 4) {
      setMatchmakingNotice("Looks like your group is already full.")
      return
    }

    setMatchmakingError(null)
    setMatchmakingNotice(null)
    setMatchmakingLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { error } = await supabase
        .from("course_match_queue")
        .upsert(
          {
            user_id: user.id,
            course_id: courseId,
            play_date: selectedDate,
            status: "searching",
            group_size: groupSize,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,course_id,play_date" },
        )

      if (error) {
        throw error
      }

      groupSizeRef.current = groupSize
      await refreshMatchmaking(profileRef.current, user.id)
      setMatchmakingNotice("We're searching for the best partners at this course.")
    } catch (err: any) {
      console.error("Failed to start matchmaking", err)
      setMatchmakingError(err.message || "Unable to start matchmaking right now")
    } finally {
      setMatchmakingLoading(false)
    }
  }

  const handleCancelMatchmaking = async () => {
    if (!currentUserId) {
      return
    }

    setMatchmakingError(null)
    setMatchmakingNotice(null)
    setMatchmakingLoading(true)

    try {
      const { error } = await supabase
        .from("course_match_queue")
        .delete()
        .eq("user_id", currentUserId)
        .eq("course_id", courseId)
        .eq("play_date", selectedDate)

      if (error) {
        throw error
      }

      setQueueEntry(null)
      setMatchCandidates([])
      setAvailableQueueEntries([])
      setGroupSize(1)
      groupSizeRef.current = 1
      setMatchmakingNotice("You're no longer in the queue for this course.")
    } catch (err: any) {
      console.error("Failed to cancel matchmaking", err)
      setMatchmakingError(err.message || "Unable to cancel matchmaking")
    } finally {
      setMatchmakingLoading(false)
    }
  }

  const handleSkipCandidate = () => {
    if (matchCandidates.length <= 1) {
      return
    }

    setSelectedCandidateIndex((prev: number) => (prev + 1) % matchCandidates.length)
    setMatchmakingNotice("Still searching - we'll keep looking for an even better fit.")
  }

  const handleAcceptCandidate = async () => {
    const candidate = selectedCandidate

    if (!candidate || !currentUserId) {
      return
    }

    setMatchmakingError(null)
    setMatchmakingNotice(null)
    setRequestingMatch(true)

    try {
      const matchedNames: string[] = []
      const matchIds: string[] = []

      for (const entry of candidate.entries) {
        const targetUserId = entry.user_id
        if (!targetUserId) {
          continue
        }

        const { data: existingMatch, error: existingError } = await supabase
          .from("matches")
          .select("id, status")
          .or(
            `and(requester_id.eq.${currentUserId},matched_user_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},matched_user_id.eq.${currentUserId})`,
          )
          .maybeSingle()

        if (existingError) {
          throw existingError
        }

        let matchId = existingMatch?.id

        if (!existingMatch) {
          const matchDate = new Date(`${selectedDate}T12:00:00Z`)

          const { data: insertedMatch, error: matchError } = await supabase
            .from("matches")
            .insert({
              requester_id: currentUserId,
              matched_user_id: targetUserId,
              course_id: courseId,
              match_date: matchDate.toISOString(),
              status: "pending",
            })
            .select()
            .single()

          if (matchError) {
            throw matchError
          }

          matchId = insertedMatch?.id ?? undefined
        }

        if (matchId) {
          matchIds.push(matchId)
        }

        matchedNames.push(entry.profile?.display_name ?? "this player")
      }

      const updatedGroupSize = Math.min(4, groupSize + candidate.totalGroupSize)
      const updatePayload: Record<string, any> = {
        group_size: updatedGroupSize,
        updated_at: new Date().toISOString(),
      }

      if (updatedGroupSize >= 4) {
        updatePayload.status = "matched"
        if (candidate.entries.length === 1) {
          updatePayload.paired_user_id = candidate.entries[0].user_id
          if (matchIds[0]) {
            updatePayload.match_id = matchIds[0]
          }
        }
      }

      const { error: queueUpdateError } = await supabase
        .from("course_match_queue")
        .update(updatePayload)
        .eq("user_id", currentUserId)
        .eq("course_id", courseId)
        .eq("play_date", selectedDate)

      if (queueUpdateError) {
        throw queueUpdateError
      }

      groupSizeRef.current = updatedGroupSize
      setGroupSize(updatedGroupSize)

      const readableNames = matchedNames.filter(Boolean).join(", ") || "your match"
      setMatchmakingNotice(
        `Nice! We've sent match request${matchedNames.length > 1 ? "s" : ""} to ${readableNames}. Check the Requests tab to follow up.`,
      )

      await refreshMatchmaking()
    } catch (err: any) {
      console.error("Failed to accept candidate", err)
      setMatchmakingError(err.message || "Unable to accept this match")
    } finally {
      setRequestingMatch(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh pb-20 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (loadError && !course) {
    return (
      <div className="min-h-svh pb-20 bg-background flex items-center justify-center px-4">
        <div className="max-w-md space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">We couldn't load this course</h1>
            <p className="text-sm text-muted-foreground">{loadError}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => router.refresh()} className="sm:w-auto">
              Try Again
            </Button>
            <Button asChild variant="outline" className="sm:w-auto">
              <Link href="/tee-times">Back to Tee Times</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return null
  }

  return (
    <div className="min-h-svh pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <Button asChild variant="ghost" size="sm">
          <Link href="/tee-times">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </Link>
        </Button>

        {/* Course Header */}
        <div className="space-y-4">
          {loadError && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-200/10 px-4 py-3 text-sm text-amber-900">
              We hit a snag loading a few details: {loadError}
            </div>
          )}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
            <img
              src={course.image_url || "/placeholder.svg?height=400&width=800&query=golf course"}
              alt={course.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-balance">{course.name}</h1>
            <p className="text-muted-foreground">
              {course.location} • {course.city}, {course.province}
            </p>
          </div>
          {course.description && <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Holes:</span> <span className="font-medium">{course.holes}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Par:</span>{" "}
              <span className="font-medium">{course.par || "N/A"}</span>
            </div>
            {course.rating && (
              <div>
                <span className="text-muted-foreground">Rating:</span>{" "}
                <span className="font-medium">{course.rating}</span>
              </div>
            )}
          </div>
          {course.amenities && course.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {course.amenities.map((amenity: string) => (
                <span key={amenity} className="px-3 py-1 rounded-full bg-muted text-sm">
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Date Selector */}
        <Card>
          <CardContent className="pt-6">
            <label className="text-sm font-medium block mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Course Matchmaking */}
        <Card>
          <CardHeader>
            <CardTitle>Find Playing Partners</CardTitle>
            <CardDescription>Match with golfers planning for {friendlyDateLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matchmakingNotice && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
                {matchmakingNotice}
              </div>
            )}
            {matchmakingError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {matchmakingError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">How many golfers are already in your group (including you)?</label>
              {queueEntry ? (
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {groupSize} {groupSize === 1 ? "golfer" : "golfers"} ready •
                  {playersNeeded === 0
                    ? " your foursome is full"
                    : ` looking for ${playersNeeded} more`}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {[1, 2, 3].map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={groupSize === size ? "default" : "outline"}
                        onClick={() => handleGroupSizeSelection(size)}
                      >
                        {size === 1 ? "Just me" : `${size} golfers`}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll look for {playersNeeded} more golfer{playersNeeded === 1 ? "" : "s"} to fill your foursome.
                  </p>
                </>
              )}
            </div>
            {queueEntry ? (
              <div className="space-y-4">
                {queueEntry.status === "matched" ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                      <p className="font-medium text-primary">Match request sent!</p>
                      <p className="mt-1 text-muted-foreground">
                        Check your Requests tab to confirm plans with your new partner.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1">
                        <Link href="/matches?tab=requests">Open Requests</Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelMatchmaking}
                        disabled={matchmakingLoading || requestingMatch}
                      >
                        Leave Queue
                      </Button>
                    </div>
                  </div>
                ) : showFoundMatch && selectedCandidate && primaryCandidateEntry ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {primaryCandidateEntry.profile?.avatar_url ? (
                            <img
                              src={primaryCandidateEntry.profile.avatar_url || "/placeholder.svg"}
                              alt=""
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-semibold text-primary">
                              {primaryCandidateEntry.profile?.display_name?.[0] || "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-base">
                              {primaryCandidateEntry.profile?.display_name ?? "Match Candidate"}
                            </span>
                            <span className="text-sm font-medium text-primary">
                              {selectedCandidate.compatibility.score}% match
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {primaryCandidateEntry.profile?.skill_level && (
                              <span className="capitalize">{primaryCandidateEntry.profile.skill_level}</span>
                            )}
                            {typeof primaryCandidateEntry.profile?.average_handicap === "number" && (
                              <>
                                <span>•</span>
                                <span>Handicap {primaryCandidateEntry.profile.average_handicap.toFixed(1)}</span>
                              </>
                            )}
                            {primaryCandidateEntry.profile?.preferred_round_time && (
                              <>
                                <span>•</span>
                                <span>{formatLabel(primaryCandidateEntry.profile.preferred_round_time)}</span>
                              </>
                            )}
                            {primaryCandidateEntry.profile?.pace_of_play && (
                              <>
                                <span>•</span>
                                <span>{formatLabel(primaryCandidateEntry.profile.pace_of_play)}</span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Brings {selectedCandidate.totalGroupSize} {selectedCandidate.totalGroupSize === 1 ? "golfer" : "golfers"}
                            </span>
                            <span>•</span>
                            <span>
                              {projectedPlayersNeeded === 0
                                ? "Your foursome will be full"
                                : `You'll need ${projectedPlayersNeeded} more ${projectedPlayersNeeded === 1 ? "player" : "players"}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      {additionalCandidateEntries.length > 0 && (
                        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Also includes</p>
                          <div className="space-y-2">
                            {additionalCandidateEntries.map((entry: QueueEntryWithProfile) => (
                              <div key={entry.id} className="flex items-center gap-3 text-sm">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  {entry.profile?.avatar_url ? (
                                    <img
                                      src={entry.profile.avatar_url || "/placeholder.svg"}
                                      alt=""
                                      className="w-10 h-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-primary">
                                      {entry.profile?.display_name?.[0] || "?"}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium truncate">
                                      {entry.profile?.display_name ?? "Partner"}
                                    </span>
                                    <span className="text-xs font-medium text-primary">
                                      {entry.compatibility?.score ?? 0}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Brings {Math.max(1, entry.group_size ?? 1)} {Math.max(1, entry.group_size ?? 1) === 1 ? "golfer" : "golfers"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {candidateBreakdown.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        {candidateBreakdown.map((item: { key: string; value: number }) => {
                          const labelKey = item.key as keyof typeof BREAKDOWN_LABELS
                          return (
                            <div key={item.key} className="rounded-lg bg-muted/60 px-3 py-2 text-xs">
                              <div className="text-muted-foreground">
                                {BREAKDOWN_LABELS[labelKey] ?? formatLabel(item.key)}
                              </div>
                              <div className="text-sm font-semibold text-foreground">{Math.round(item.value)}%</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button className="flex-1" onClick={handleAcceptCandidate} disabled={requestingMatch}>
                        {requestingMatch ? "Sending..." : "Accept Match"}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleSkipCandidate}
                        disabled={matchCandidates.length <= 1 || requestingMatch}
                      >
                        Wait for Better Match
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={handleCancelMatchmaking}
                        disabled={matchmakingLoading || requestingMatch}
                      >
                        Leave Queue
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      We're looking for players at this course. Hang tight and we'll notify you when we find a strong
                      match.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span>Searching for golfers...</span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCancelMatchmaking}
                      disabled={matchmakingLoading || requestingMatch}
                      className="w-full sm:w-auto"
                    >
                      Leave Queue
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {matchCandidates.length > 0
                    ? `${matchCandidates.length} ${matchCandidates.length === 1 ? "golfer is" : "golfers are"} already looking for partners on ${friendlyDateLabel}.`
                    : "Be the first to start a pairing for this course and we'll notify interested players."}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleStartMatchmaking} disabled={matchmakingLoading} className="flex-1">
                    {matchmakingLoading ? "Joining..." : "Start Matchmaking"}
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/matches">Browse Matches</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Tee Times */}
        <Card>
          <CardHeader>
            <CardTitle>Available Tee Times</CardTitle>
            <CardDescription>{friendlyDateLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            {teeTimes.length > 0 ? (
              <div className="space-y-3">
                {teeTimes.map((teeTime) => (
                  <div
                    key={teeTime.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <div>
                      <div className="font-medium">
                        {new Date(`2000-01-01T${teeTime.time}`).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {teeTime.available_spots} {teeTime.available_spots === 1 ? "spot" : "spots"} available
                      </div>
                    </div>
                    <div className="text-right">
                      {teeTime.price && <div className="font-medium text-primary">${teeTime.price.toFixed(2)}</div>}
                      <Button size="sm" asChild>
                        <Link href={`/tee-times/${courseId}/book/${teeTime.id}`}>Book</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No tee times available for this date. Try another date.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Players Looking to Match */}
        {availableQueueEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Players Looking to Match</CardTitle>
              <CardDescription>
                {availableQueueEntries.length === 1
                  ? "1 golfer"
                  : `${availableQueueEntries.length} golfers`} planning for {friendlyDateLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableQueueEntries.slice(0, 5).map((entry: QueueEntryWithProfile) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {entry.profile?.avatar_url ? (
                        <img
                          src={entry.profile.avatar_url || "/placeholder.svg"}
                          alt=""
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-primary">
                          {entry.profile?.display_name?.[0] || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.profile?.display_name}</span>
                        <span className="text-xs font-semibold text-primary">
                            {entry.compatibility?.score ?? 0}% match
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {entry.profile?.skill_level && (
                          <>
                            <span className="capitalize">{entry.profile.skill_level}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>Group of {Math.max(1, entry.group_size ?? 1)}</span>
                        {entry.profile?.preferred_round_time && (
                          <>
                            <span>•</span>
                            <span>{formatLabel(entry.profile.preferred_round_time)}</span>
                          </>
                        )}
                        {entry.profile?.pace_of_play && (
                          <>
                            <span>•</span>
                            <span>{formatLabel(entry.profile.pace_of_play)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/matches/${entry.user_id}`}>View</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/matches/${entry.user_id}/request`}>Connect</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNav />
    </div>
  )
}
