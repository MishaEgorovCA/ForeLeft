"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ChangeEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/client"
import { BREAKDOWN_LABELS, computeCompatibility, formatLabel } from "@/lib/matchmaking"
import type { CompatibilityBreakdownKey } from "@/lib/matchmaking"

type SpotlightBreakdownItem = {
  key: CompatibilityBreakdownKey
  value: number
}

const MATCHES_TAB_KEYS = new Set<string>(["discover", "requests", "matches", "queues"])

export default function MatchesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [potentialMatches, setPotentialMatches] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])
  const [acceptedMatches, setAcceptedMatches] = useState<any[]>([])
  const [queueEntries, setQueueEntries] = useState<any[]>([])
  const [allInterests, setAllInterests] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const sortedInterests = useMemo(() => Array.from(allInterests.values()).sort(), [allInterests])

  const selectedSkill = searchParams.get("skill") || "all"
  const selectedInterest = searchParams.get("interest") || "all"
  const rawTab = searchParams.get("tab") || "discover"
  const selectedTab = MATCHES_TAB_KEYS.has(rawTab) ? rawTab : "discover"

  const fetchQueueEntries = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("course_match_queue")
        .select(
          `*,
          course:courses (
            id,
            name,
            city,
            province
          )
        `,
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Failed to load queue entries", error)
        return
      }

      setQueueEntries(data || [])
    },
    [supabase],
  )

  const fetchMatchStatus = useCallback(
    async (userId: string) => {
      const { data: incomingData, error: incomingError } = await supabase
        .from("matches")
        .select(`
          *,
          profiles!matches_requester_id_fkey (display_name, skill_level, avatar_url, interests, trust_score)
        `)
        .eq("matched_user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (incomingError) {
        console.error("Failed to load incoming match requests", incomingError)
      }

      setIncomingRequests(incomingData || [])

      const { data: outgoingData, error: outgoingError } = await supabase
        .from("matches")
        .select(`
          *,
          profiles!matches_matched_user_id_fkey (display_name, skill_level, avatar_url, interests, trust_score)
        `)
        .eq("requester_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (outgoingError) {
        console.error("Failed to load outgoing match requests", outgoingError)
      }

      setOutgoingRequests(outgoingData || [])

      const { data: acceptedData, error: acceptedError } = await supabase
        .from("matches")
        .select(`
          *,
          requester:profiles!matches_requester_id_fkey (display_name, skill_level, avatar_url, interests),
          matched:profiles!matches_matched_user_id_fkey (display_name, skill_level, avatar_url, interests)
        `)
        .or(`requester_id.eq.${userId},matched_user_id.eq.${userId}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(10)

      if (acceptedError) {
        console.error("Failed to load accepted matches", acceptedError)
      }

      setAcceptedMatches(acceptedData || [])
    },
    [supabase],
  )

  const fetchPotentialMatches = useCallback(
    async (userId: string) => {
      const { data: currentProfileData } = await supabase.from("profiles").select("*").eq("id", userId).single()

      let matchesQuery = supabase
        .from("profiles")
        .select("*")
        .neq("id", userId)
        .not("skill_level", "is", null)
        .order("trust_score", { ascending: false })

      if (selectedSkill !== "all") {
        matchesQuery = matchesQuery.eq("skill_level", selectedSkill)
      }

      const { data: matchesData, error: matchesError } = await matchesQuery

      if (matchesError) {
        console.error("Failed to load potential matches", matchesError)
        setPotentialMatches([])
        setAllInterests(new Set())
        return
      }

      let filteredMatches = matchesData || []
      if (selectedInterest !== "all" && filteredMatches.length > 0) {
        filteredMatches = filteredMatches.filter((profile: any) => profile.interests?.includes(selectedInterest))
      }

      const enrichedMatches = filteredMatches.map((profile: any) => ({
        ...profile,
        compatibility: computeCompatibility(currentProfileData, profile),
      }))

      enrichedMatches.sort((a: any, b: any) => (b.compatibility?.score || 0) - (a.compatibility?.score || 0))

      setPotentialMatches(enrichedMatches)
      setActiveIndex(0)

      const interests = new Set<string>()
      matchesData?.forEach((profile: any) => {
        profile.interests?.forEach((interest: string) => interests.add(interest))
      })
      setAllInterests(interests)
    },
    [supabase, selectedSkill, selectedInterest],
  )

  const pushWithParams = (params: URLSearchParams) => {
    const query = params.toString()
    router.push(query ? `/matches?${query}` : "/matches")
  }

  const handleTabChange = (value: string) => {
    if (!MATCHES_TAB_KEYS.has(value)) {
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    if (value === "discover") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    pushWithParams(params)
  }

  useEffect(() => {
    if (potentialMatches.length === 0) {
      setActiveIndex(0)
      return
    }

    if (activeIndex >= potentialMatches.length) {
      setActiveIndex(0)
    }
  }, [potentialMatches.length, activeIndex])

  const handlePass = () => {
    if (potentialMatches.length <= 1) {
      return
    }
    setActiveIndex((prev: number) => (prev + 1) % potentialMatches.length)
  }

  const activeMatch = potentialMatches[activeIndex]

  const otherMatches = useMemo(
    () => potentialMatches.filter((_: any, index: number) => index !== activeIndex),
    [potentialMatches, activeIndex],
  )

  const spotlightBreakdown = useMemo<SpotlightBreakdownItem[]>(() => {
    if (!activeMatch?.compatibility?.breakdown) {
      return []
    }

    return Object.entries(activeMatch.compatibility.breakdown)
      .map(([key, value]) => ({ key: key as CompatibilityBreakdownKey, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
  }, [activeMatch])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      if (!isMounted) {
        return
      }

      setCurrentUserId(user.id)

      await Promise.all([fetchPotentialMatches(user.id), fetchMatchStatus(user.id), fetchQueueEntries(user.id)])

      if (isMounted) {
        setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [router, supabase, fetchPotentialMatches, fetchMatchStatus, fetchQueueEntries])

  useEffect(() => {
    if (!currentUserId) {
      return
    }

    const queueChannel = supabase
      .channel(`match-queues-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_match_queue",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          fetchQueueEntries(currentUserId).catch((error) => console.error("Queue refresh failed", error))
        },
      )
      .subscribe()

    const matchesChannel = supabase
      .channel(`match-status-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `requester_id=eq.${currentUserId}`,
        },
        () => {
          fetchMatchStatus(currentUserId).catch((error) => console.error("Match refresh failed", error))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `matched_user_id=eq.${currentUserId}`,
        },
        () => {
          fetchMatchStatus(currentUserId).catch((error) => console.error("Match refresh failed", error))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(queueChannel)
      supabase.removeChannel(matchesChannel)
    }
  }, [supabase, currentUserId, fetchQueueEntries, fetchMatchStatus])

  const handleSkillChange = (skill: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (skill === "all") {
      params.delete("skill")
    } else {
      params.set("skill", skill)
    }
    pushWithParams(params)
  }

  const handleInterestChange = (interest: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (interest === "all") {
      params.delete("interest")
    } else {
      params.set("interest", interest)
    }
    pushWithParams(params)
  }

  if (loading) {
    return (
      <div className="min-h-svh pb-20 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">Find Partners</h1>
          <p className="text-muted-foreground">Connect with golfers who share your passion</p>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {incomingRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                  {incomingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="matches">Matches</TabsTrigger>
            <TabsTrigger value="queues">
              Queues
              {queueEntries.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                  {queueEntries.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            {activeMatch ? (
              <Card>
                <CardHeader>
                  <CardTitle>Match Spotlight</CardTitle>
                  <CardDescription>We ranked golfers by how well they fit your vibe</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="w-20 h-20 rounded-full border-4 border-primary/40 flex items-center justify-center shrink-0">
                      <span className="text-2xl font-bold text-primary">{activeMatch.compatibility?.score ?? 0}%</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-xl font-semibold">{activeMatch.display_name}</h3>
                        <span className="text-sm font-medium text-primary">
                          {activeMatch.compatibility?.score ?? 0}% match
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="capitalize">{activeMatch.skill_level}</span>
                        {activeMatch.average_handicap && (
                          <>
                            <span>•</span>
                            <span>Handicap: {activeMatch.average_handicap.toFixed(1)}</span>
                          </>
                        )}
                        {activeMatch.pace_of_play && (
                          <>
                            <span>•</span>
                            <span>Pace: {formatLabel(activeMatch.pace_of_play)}</span>
                          </>
                        )}
                        {activeMatch.preferred_round_time && (
                          <>
                            <span>•</span>
                            <span>Tee time: {formatLabel(activeMatch.preferred_round_time)}</span>
                          </>
                        )}
                        {activeMatch.play_frequency && (
                          <>
                            <span>•</span>
                            <span>Plays: {formatLabel(activeMatch.play_frequency)}</span>
                          </>
                        )}
                      </div>
                      {activeMatch.match_goals && activeMatch.match_goals.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {activeMatch.match_goals.slice(0, 3).map((goal: string) => (
                            <span key={goal} className="px-2 py-1 rounded-md bg-primary/5 text-primary text-xs">
                              {formatLabel(goal)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {spotlightBreakdown.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {spotlightBreakdown.map((item: SpotlightBreakdownItem) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground">
                            {BREAKDOWN_LABELS[item.key] ?? formatLabel(item.key)}
                          </span>
                          <span className="font-semibold text-foreground">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="ghost"
                      className="sm:w-28"
                      onClick={handlePass}
                      disabled={potentialMatches.length <= 1}
                    >
                      Pass
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={`/matches/${activeMatch.id}`}>View Profile</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href={`/matches/${activeMatch.id}/request`}>Connect</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <p className="text-muted-foreground">We need a bit more info to find your golf crew.</p>
                  <p className="text-sm text-muted-foreground">
                    Try updating your profile preferences or broadening your filters.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill Level</label>
                  <select
                    value={selectedSkill}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleSkillChange(e.target.value)}
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Interest</label>
                  <select
                    value={selectedInterest}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleInterestChange(e.target.value)}
                  >
                    <option value="all">All Interests</option>
                    {sortedInterests.map((interest) => (
                      <option key={interest} value={interest}>
                        {formatLabel(interest)}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {otherMatches.length > 0 ? (
              <div className="space-y-4">
                {otherMatches.map((match: any) => (
                  <Card key={match.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {match.avatar_url ? (
                            <img
                              src={match.avatar_url || "/placeholder.svg"}
                              alt={match.display_name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-primary">{match.display_name?.[0] || "?"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-lg">{match.display_name}</h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="capitalize">{match.skill_level}</span>
                                {match.average_handicap && (
                                  <>
                                    <span>•</span>
                                    <span>Handicap: {match.average_handicap.toFixed(1)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-sm font-medium text-primary">
                              {match.compatibility?.score ?? 0}% match
                            </div>
                          </div>
                          {match.bio && (
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{match.bio}</p>
                          )}
                          {match.interests && match.interests.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {match.interests.slice(0, 3).map((interest: string) => (
                                <span
                                  key={interest}
                                  className="px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs"
                                >
                                  {formatLabel(interest)}
                                </span>
                              ))}
                            </div>
                          )}
                          {match.match_goals && match.match_goals.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {match.match_goals.slice(0, 2).map((goal: string) => (
                                <span key={goal} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                                  {formatLabel(goal)}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button asChild size="sm" className="flex-1">
                              <Link href={`/matches/${match.id}`}>View Profile</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="flex-1 bg-transparent">
                              <Link href={`/matches/${match.id}/request`}>Send Request</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : activeMatch ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  You&apos;ve seen your top match. Tap pass or adjust filters for new faces.
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Incoming Requests</CardTitle>
                <CardDescription>Players who want to match with you</CardDescription>
              </CardHeader>
              <CardContent>
                {incomingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {incomingRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {request.profiles?.avatar_url ? (
                              <img
                                src={request.profiles.avatar_url || "/placeholder.svg"}
                                alt=""
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <span className="text-lg font-bold text-primary">
                                {request.profiles?.display_name?.[0] || "?"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{request.profiles?.display_name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {request.profiles?.skill_level}
                            </div>
                          </div>
                        </div>
                        <Button asChild size="sm">
                          <Link href={`/matches/requests/${request.id}`}>Review</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No incoming requests</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sent Requests</CardTitle>
                <CardDescription>Waiting for response</CardDescription>
              </CardHeader>
              <CardContent>
                {outgoingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {outgoingRequests.map((request: any) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            {request.profiles?.avatar_url ? (
                              <img
                                src={request.profiles.avatar_url || "/placeholder.svg"}
                                alt=""
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <span className="text-lg font-bold text-primary">
                                {request.profiles?.display_name?.[0] || "?"}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{request.profiles?.display_name}</div>
                            <div className="text-sm text-muted-foreground">Pending</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No sent requests</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Matches</CardTitle>
                <CardDescription>Players you've connected with</CardDescription>
              </CardHeader>
              <CardContent>
                {acceptedMatches.length > 0 ? (
                  <div className="space-y-3">
                    {acceptedMatches.map((match: any) => {
                      const otherProfile = match.requester_id === currentUserId ? match.matched : match.requester
                      return (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              {otherProfile?.avatar_url ? (
                                <img
                                  src={otherProfile.avatar_url || "/placeholder.svg"}
                                  alt=""
                                  className="w-12 h-12 rounded-full"
                                />
                              ) : (
                                <span className="text-lg font-bold text-primary">
                                  {otherProfile?.display_name?.[0] || "?"}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{otherProfile?.display_name}</div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {otherProfile?.skill_level}
                              </div>
                            </div>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/matches/${match.requester_id === currentUserId ? match.matched_user_id : match.requester_id}`}
                            >
                              View
                            </Link>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No matches yet. Start connecting with other golfers!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queues Tab */}
          <TabsContent value="queues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Course Queues</CardTitle>
                <CardDescription>Track where you're waiting to be paired</CardDescription>
              </CardHeader>
              <CardContent>
                {queueEntries.length > 0 ? (
                  <div className="space-y-3">
                    {queueEntries.map((entry: any) => {
                      const course = entry.course
                      const groupSize = Math.min(4, Math.max(1, entry.group_size ?? 1))
                      const playersNeeded = Math.max(0, 4 - groupSize)
                      const status = (entry.status || "searching") as string
                      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1)
                      const playDate = entry.play_date
                        ? new Date(entry.play_date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "Any date"
                      const updatedAt = entry.updated_at
                        ? new Date(entry.updated_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : ""

                      return (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                              <span>{course?.name ?? "Course unavailable"}</span>
                              <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wide">
                                {statusLabel}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {course?.city && course?.province
                                ? `${course.city}, ${course.province}`
                                : "Location pending"}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {playDate} • Group of {groupSize} • {playersNeeded === 0 ? "Foursome full" : `Need ${playersNeeded} more`}
                            </div>
                            {updatedAt && (
                              <div className="text-xs text-muted-foreground">Updated {updatedAt}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/tee-times/${entry.course_id}?date=${entry.play_date ?? ""}`}>
                                View Course
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    You're not in any course queues right now.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <MobileNav />
    </div>
  )
}
