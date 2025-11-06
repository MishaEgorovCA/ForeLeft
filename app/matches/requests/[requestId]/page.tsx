"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function ReviewRequestPage() {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [request, setRequest] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [message, setMessage] = useState<any>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get match request
      const { data: requestData } = await supabase
        .from("matches")
        .select("*")
        .eq("id", params.requestId)
        .eq("matched_user_id", user.id)
        .single()

      if (!requestData) {
        router.push("/matches")
        return
      }

      setRequest(requestData)

      // Get requester profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", requestData.requester_id)
        .single()

      setProfile(profileData)

      // Get any message
      const { data: messageData } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", requestData.requester_id)
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      setMessage(messageData)
      setLoading(false)
    }

    loadData()
  }, [params, router, supabase])

  const handleAccept = async () => {
    setProcessing(true)

    try {
      const { error } = await supabase.from("matches").update({ status: "accepted" }).eq("id", request.id)

      if (error) throw error

      router.push("/matches?tab=matches")
    } catch (err) {
      console.error("Error accepting request:", err)
      setProcessing(false)
    }
  }

  const handleDecline = async () => {
    setProcessing(true)

    try {
      const { error } = await supabase.from("matches").update({ status: "declined" }).eq("id", request.id)

      if (error) throw error

      router.push("/matches?tab=requests")
    } catch (err) {
      console.error("Error declining request:", err)
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/matches?tab=requests">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Requests
          </Link>
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Match Request</h1>
          <p className="text-muted-foreground">Review this player's profile</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Player Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url || "/placeholder.svg"} alt="" className="w-20 h-20 rounded-full" />
                ) : (
                  <span className="text-3xl font-bold text-primary">{profile?.display_name?.[0] || "?"}</span>
                )}
              </div>
              <div>
                <div className="font-semibold text-xl">{profile?.display_name}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {profile?.skill_level}
                  {profile?.average_handicap && ` • Handicap: ${profile.average_handicap.toFixed(1)}`}
                </div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-medium">{profile?.trust_score} Trust Score</span>
                </div>
              </div>
            </div>

            {profile?.bio && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Bio</div>
                <p className="text-sm leading-relaxed">{profile.bio}</p>
              </div>
            )}

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

            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href={`/matches/${profile?.id}`}>View Full Profile</Link>
            </Button>
          </CardContent>
        </Card>

        {message && (
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{message.content}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleDecline}
            variant="outline"
            size="lg"
            className="flex-1 bg-transparent"
            disabled={processing}
          >
            Decline
          </Button>
          <Button onClick={handleAccept} size="lg" className="flex-1" disabled={processing}>
            {processing ? "Processing..." : "Accept Match"}
          </Button>
        </div>
      </div>
    </div>
  )
}
