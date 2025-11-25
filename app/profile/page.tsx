"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { formatLabel } from "@/lib/matchmaking"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const {
        data: { user: userData },
      } = await supabase.auth.getUser()

      if (!userData) {
        router.push("/auth/login")
        return
      }

      setUser(userData)

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userData.id).single()
      setProfile(profileData)

      setLoading(false)
    }

    loadData()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

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

  return (
    <div className="min-h-svh pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url || "/placeholder.svg"} alt="" className="w-24 h-24 rounded-full" />
            ) : (
              <span className="text-4xl font-bold text-primary">
                {profile?.display_name?.[0] || user?.email?.[0] || "?"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.display_name || "Golfer"}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/profile/edit">Edit Profile</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.total_rounds || 0}</div>
              <div className="text-xs text-muted-foreground">Rounds</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.average_handicap?.toFixed(1) || "N/A"}</div>
              <div className="text-xs text-muted-foreground">Handicap</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.trust_score || 100}</div>
              <div className="text-xs text-muted-foreground">Trust</div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.bio && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Bio</div>
                <p className="text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Skill Level</div>
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium capitalize">
                {profile?.skill_level || "Not set"}
              </div>
            </div>
            {profile?.interests && profile.interests.length > 0 && (
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
            {(profile?.play_frequency || profile?.preferred_round_time || profile?.pace_of_play || profile?.swing_tendency ||
              profile?.group_preference || profile?.business_talk_preference || profile?.drinks_on_course_preference ||
              profile?.money_game_preference || profile?.distraction_tolerance) && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">On-course preferences</div>
                <dl className="space-y-2 text-sm">
                  {profile?.play_frequency && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Play frequency</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.play_frequency)}</dd>
                    </div>
                  )}
                  {profile?.preferred_round_time && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Tee time</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.preferred_round_time)}</dd>
                    </div>
                  )}
                  {profile?.pace_of_play && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Pace</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.pace_of_play)}</dd>
                    </div>
                  )}
                  {profile?.swing_tendency && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Swing tendency</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.swing_tendency)}</dd>
                    </div>
                  )}
                  {profile?.group_preference && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Group size</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.group_preference)}</dd>
                    </div>
                  )}
                  {profile?.business_talk_preference && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Business & politics</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.business_talk_preference)}</dd>
                    </div>
                  )}
                  {profile?.drinks_on_course_preference && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">On-course drinks</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.drinks_on_course_preference)}</dd>
                    </div>
                  )}
                  {profile?.money_game_preference && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Money games</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.money_game_preference)}</dd>
                    </div>
                  )}
                  {profile?.distraction_tolerance && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Distraction tolerance</dt>
                      <dd className="font-medium text-right">{formatLabel(profile.distraction_tolerance)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Button onClick={handleSignOut} variant="destructive" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <MobileNav />
    </div>
  )
}
