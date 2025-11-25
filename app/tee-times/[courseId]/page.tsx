"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BREAKDOWN_LABELS, computeCompatibility, formatLabel } from "@/lib/matchmaking"

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
  const [matchCandidates, setMatchCandidates] = useState<any[]>([])
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
      const others = (data ?? []).filter((entry: any) => entry.user_id !== activeUserId && entry.status === "searching")

      const enriched = others
        .map((entry: any) => ({
          ...entry,
          profile: entry.profile,
          compatibility: computeCompatibility(activeProfile, entry.profile),
        }))
        .sort((a: any, b: any) => (b.compatibility?.score ?? 0) - (a.compatibility?.score ?? 0))

      setQueueEntry(myEntry)
      setMatchCandidates(enriched)
      setMatchmakingError(null)

      if (enriched.length === 0) {
        setSelectedCandidateIndex(0)
      }
    },
    [supabase, courseId, selectedDate],
  )

  useEffect(() => {
    setCourse(null)
    setTeeTimes([])
    setQueueEntry(null)
    setMatchCandidates([])
    setLoading(true)
    setLoadError(null)
    userIdRef.current = ""
    profileRef.current = null

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
    const candidateId = selectedCandidate?.user_id ?? null
    if (
      queueEntry &&
      queueEntry.status === "searching" &&
      showFoundMatch &&
      candidateId &&
      lastCandidateRef.current !== candidateId
    ) {
      const score = selectedCandidate.compatibility?.score ?? 0
      const name = selectedCandidate.profile?.display_name ?? "a golfer"
      setMatchmakingNotice(`We found a ${score}% match with ${name}.`)
      lastCandidateRef.current = candidateId
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

  const handleStartMatchmaking = async () => {
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
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,course_id,play_date" },
        )

      if (error) {
        throw error
      }

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
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id, status")
        .or(
          `and(requester_id.eq.${currentUserId},matched_user_id.eq.${candidate.user_id}),and(requester_id.eq.${candidate.user_id},matched_user_id.eq.${currentUserId})`,
        )
        .maybeSingle()

      let matchId = existingMatch?.id

      if (!existingMatch) {
        const matchDate = new Date(`${selectedDate}T12:00:00Z`)

        const { data: insertedMatch, error: matchError } = await supabase
          .from("matches")
          .insert({
            requester_id: currentUserId,
            matched_user_id: candidate.user_id,
            course_id: courseId,
            match_date: matchDate.toISOString(),
            status: "pending",
          })
          .select()
          .single()

        if (matchError) {
          throw matchError
        }

        matchId = insertedMatch?.id
      }

      const { error: queueUpdateError } = await supabase
        .from("course_match_queue")
        .update({
          status: "matched",
          paired_user_id: candidate.user_id,
          match_id: matchId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", currentUserId)
        .eq("course_id", courseId)
        .eq("play_date", selectedDate)

      if (queueUpdateError) {
        throw queueUpdateError
      }

      setMatchmakingNotice(
        `Nice! We've sent ${candidate.profile?.display_name ?? "this player"} a match request - check the Requests tab to follow up.`,
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
                ) : showFoundMatch && selectedCandidate ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {selectedCandidate.profile?.avatar_url ? (
                          <img
                            src={selectedCandidate.profile.avatar_url || "/placeholder.svg"}
                            alt=""
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-semibold text-primary">
                            {selectedCandidate.profile?.display_name?.[0] || "?"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-base">{selectedCandidate.profile?.display_name}</span>
                          <span className="text-sm font-medium text-primary">
                            {selectedCandidate.compatibility?.score ?? 0}% match
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          {selectedCandidate.profile?.skill_level && (
                            <span className="capitalize">{selectedCandidate.profile.skill_level}</span>
                          )}
                          {typeof selectedCandidate.profile?.average_handicap === "number" && (
                            <>
                              <span>•</span>
                              <span>Handicap {selectedCandidate.profile.average_handicap.toFixed(1)}</span>
                            </>
                          )}
                          {selectedCandidate.profile?.preferred_round_time && (
                            <>
                              <span>•</span>
                              <span>{formatLabel(selectedCandidate.profile.preferred_round_time)}</span>
                            </>
                          )}
                          {selectedCandidate.profile?.pace_of_play && (
                            <>
                              <span>•</span>
                              <span>{formatLabel(selectedCandidate.profile.pace_of_play)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {candidateBreakdown.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-3">
                        {candidateBreakdown.map((item) => {
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
        {matchCandidates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Players Looking to Match</CardTitle>
              <CardDescription>
                {matchCandidates.length === 1 ? "1 golfer" : `${matchCandidates.length} golfers`} planning for {friendlyDateLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {matchCandidates.slice(0, 5).map((entry: any) => (
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
                        {entry.profile?.skill_level && <span className="capitalize">{entry.profile.skill_level}</span>}
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
