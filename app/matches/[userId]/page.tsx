"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [profile, setProfile] = useState<any>(null)
  const [handicaps, setHandicaps] = useState<any[]>([])
  const [existingMatch, setExistingMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

      // Get user profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (!profileData) {
        router.push("/matches")
        return
      }

      setProfile(profileData)

      // Get user's handicaps
      const { data: handicapsData } = await supabase
        .from("user_handicaps")
        .select(`
          *,
          courses (name, city)
        `)
        .eq("user_id", userId)
        .order("rounds_played", { ascending: false })
        .limit(5)

      setHandicaps(handicapsData || [])

      // Check if there's an existing match request
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .or(
          `and(requester_id.eq.${user.id},matched_user_id.eq.${userId}),and(requester_id.eq.${userId},matched_user_id.eq.${user.id})`,
        )
        .single()

      setExistingMatch(matchData)

      setLoading(false)
    }

    loadData()
  }, [router, userId])

  if (loading) {
    return (
      <div className="min-h-svh pb-20 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-svh pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <Button asChild variant="ghost" size="sm">
          <Link href="/matches">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Matches
          </Link>
        </Button>

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url || "/placeholder.svg"} alt="" className="w-24 h-24 rounded-full" />
            ) : (
              <span className="text-4xl font-bold text-primary">{profile.display_name?.[0] || "?"}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.display_name}</h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground mt-1">
              <span className="capitalize">{profile.skill_level}</span>
              {profile.average_handicap && (
                <>
                  <span>•</span>
                  <span>Handicap: {profile.average_handicap.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>
          {userId !== currentUserId && !existingMatch && (
            <Button asChild size="lg">
              <Link href={`/matches/${userId}/request`}>Send Match Request</Link>
            </Button>
          )}
          {existingMatch && existingMatch.status === "pending" && (
            <div className="px-4 py-2 rounded-lg bg-muted text-muted-foreground">Match request pending</div>
          )}
          {existingMatch && existingMatch.status === "accepted" && (
            <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium">You're matched!</div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile.total_rounds || 0}</div>
              <div className="text-xs text-muted-foreground">Rounds</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile.completed_rounds || 0}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile.trust_score || 100}</div>
              <div className="text-xs text-muted-foreground">Trust</div>
            </CardContent>
          </Card>
        </div>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.bio && (
              <div>
                <p className="text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Interests</div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string) => (
                    <span key={interest} className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Handicaps */}
        {handicaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Course Handicaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {handicaps.map((handicap: any) => (
                  <div key={handicap.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">{handicap.courses?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {handicap.rounds_played} {handicap.rounds_played === 1 ? "round" : "rounds"}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-primary">{handicap.handicap.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNav />
    </div>
  )
}
