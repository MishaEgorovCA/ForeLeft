"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
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

      // Get user profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setProfile(profileData)

      // Check if profile is complete
      const isProfileComplete = profileData?.skill_level && profileData?.interests?.length > 0

      if (!isProfileComplete) {
        router.push("/profile/setup")
        return
      }

      // Get recent bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          courses (name, city),
          tee_times (date, time)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3)
      setBookings(bookingsData || [])

      // Get pending matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select(`
          *,
          profiles!matches_matched_user_id_fkey (display_name, avatar_url)
        `)
        .eq("requester_id", user.id)
        .eq("status", "pending")
        .limit(3)
      setMatches(matchesData || [])

      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-svh pb-20 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">Welcome back, {profile?.display_name || "Golfer"}</h1>
          <p className="text-muted-foreground">Ready for your next round?</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.total_rounds || 0}</div>
              <div className="text-xs text-muted-foreground">Total Rounds</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.average_handicap?.toFixed(1) || "N/A"}</div>
              <div className="text-xs text-muted-foreground">Avg Handicap</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">{profile?.trust_score || 100}</div>
              <div className="text-xs text-muted-foreground">Trust Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/tee-times">Find Tee Times</Link>
            </Button>
            <Button asChild className="w-full bg-transparent" size="lg" variant="outline">
              <Link href="/matches">Find Playing Partners</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        {bookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Your upcoming tee times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">{booking.courses?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.tee_times?.date} at {booking.tee_times?.time}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-primary">{booking.status}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Matches */}
        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Matches</CardTitle>
              <CardDescription>Waiting for response</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {matches.map((match: any) => (
                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {match.profiles?.avatar_url ? (
                        <img
                          src={match.profiles.avatar_url || "/placeholder.svg"}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <span className="text-primary font-medium">{match.profiles?.display_name?.[0] || "?"}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{match.profiles?.display_name}</div>
                      <div className="text-sm text-muted-foreground">Match request sent</div>
                    </div>
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
