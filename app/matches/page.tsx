"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export default function MatchesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [potentialMatches, setPotentialMatches] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])
  const [acceptedMatches, setAcceptedMatches] = useState<any[]>([])
  const [allInterests, setAllInterests] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const selectedSkill = searchParams.get("skill") || "all"
  const selectedInterest = searchParams.get("interest") || "all"

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setCurrentUserId(user.id)

      // Get potential matches (exclude current user)
      let matchesQuery = supabase
        .from("profiles")
        .select("*")
        .neq("id", user.id)
        .not("skill_level", "is", null)
        .order("trust_score", { ascending: false })

      if (selectedSkill !== "all") {
        matchesQuery = matchesQuery.eq("skill_level", selectedSkill)
      }

      const { data: matchesData } = await matchesQuery

      // Filter by interest if selected
      let filteredMatches = matchesData || []
      if (selectedInterest !== "all" && filteredMatches.length > 0) {
        filteredMatches = filteredMatches.filter((profile: any) => profile.interests?.includes(selectedInterest))
      }

      setPotentialMatches(filteredMatches)

      // Get all unique interests for filter
      const interests = new Set<string>()
      matchesData?.forEach((profile: any) => {
        profile.interests?.forEach((interest: string) => interests.add(interest))
      })
      setAllInterests(interests)

      // Get incoming match requests
      const { data: incomingData } = await supabase
        .from("matches")
        .select(`
          *,
          profiles!matches_requester_id_fkey (display_name, skill_level, avatar_url, interests, trust_score)
        `)
        .eq("matched_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      setIncomingRequests(incomingData || [])

      // Get outgoing match requests
      const { data: outgoingData } = await supabase
        .from("matches")
        .select(`
          *,
          profiles!matches_matched_user_id_fkey (display_name, skill_level, avatar_url, interests, trust_score)
        `)
        .eq("requester_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      setOutgoingRequests(outgoingData || [])

      // Get accepted matches
      const { data: acceptedData } = await supabase
        .from("matches")
        .select(`
          *,
          requester:profiles!matches_requester_id_fkey (display_name, skill_level, avatar_url, interests),
          matched:profiles!matches_matched_user_id_fkey (display_name, skill_level, avatar_url, interests)
        `)
        .or(`requester_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(10)

      setAcceptedMatches(acceptedData || [])

      setLoading(false)
    }

    loadData()
  }, [router, selectedSkill, selectedInterest])

  const handleSkillChange = (skill: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (skill === "all") {
      params.delete("skill")
    } else {
      params.set("skill", skill)
    }
    router.push(`/matches?${params.toString()}`)
  }

  const handleInterestChange = (interest: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (interest === "all") {
      params.delete("interest")
    } else {
      params.set("interest", interest)
    }
    router.push(`/matches?${params.toString()}`)
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
        <Tabs defaultValue="discover" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill Level</label>
                  <select
                    value={selectedSkill}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                    onChange={(e) => handleSkillChange(e.target.value)}
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
                    onChange={(e) => handleInterestChange(e.target.value)}
                  >
                    <option value="all">All Interests</option>
                    {Array.from(allInterests)
                      .sort()
                      .map((interest) => (
                        <option key={interest} value={interest}>
                          {interest}
                        </option>
                      ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Potential Matches */}
            <div className="space-y-4">
              {potentialMatches.length > 0 ? (
                potentialMatches.map((profile: any) => (
                  <Card key={profile.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url || "/placeholder.svg"}
                              alt=""
                              className="w-16 h-16 rounded-full"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-primary">{profile.display_name?.[0] || "?"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-lg">{profile.display_name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="capitalize">{profile.skill_level}</span>
                                {profile.average_handicap && (
                                  <>
                                    <span>•</span>
                                    <span>Handicap: {profile.average_handicap.toFixed(1)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="font-medium">{profile.trust_score}</span>
                            </div>
                          </div>
                          {profile.bio && (
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                              {profile.bio}
                            </p>
                          )}
                          {profile.interests && profile.interests.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {profile.interests.slice(0, 3).map((interest: string) => (
                                <span
                                  key={interest}
                                  className="px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-4">
                            <Button asChild size="sm" className="flex-1">
                              <Link href={`/matches/${profile.id}`}>View Profile</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline" className="flex-1 bg-transparent">
                              <Link href={`/matches/${profile.id}/request`}>Send Request</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No matches found. Try adjusting your filters.</p>
                  </CardContent>
                </Card>
              )}
            </div>
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
        </Tabs>
      </div>

      <MobileNav />
    </div>
  )
}
