"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function SendMatchRequestPage() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
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

      // Get target user profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", params.userId).single()

      setProfile(profileData)

      // Check for existing match
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("*")
        .or(
          `and(requester_id.eq.${user.id},matched_user_id.eq.${params.userId}),and(requester_id.eq.${params.userId},matched_user_id.eq.${user.id})`,
        )
        .single()

      if (existingMatch) {
        router.push(`/matches/${params.userId}`)
        return
      }

      setLoading(false)
    }

    loadData()
  }, [params, router, supabase])

  const handleSendRequest = async () => {
    setSending(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create match request
      const { error: matchError } = await supabase.from("matches").insert({
        requester_id: user.id,
        matched_user_id: params.userId,
        status: "pending",
      })

      if (matchError) throw matchError

      // Send message if provided
      if (message.trim()) {
        await supabase.from("messages").insert({
          sender_id: user.id,
          recipient_id: params.userId,
          content: message,
        })
      }

      router.push("/matches?tab=requests")
    } catch (err: any) {
      setError(err.message || "Failed to send match request")
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">User not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/matches/${params.userId}`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Send Match Request</h1>
          <p className="text-muted-foreground">Connect with {profile.display_name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Player Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url || "/placeholder.svg"} alt="" className="w-16 h-16 rounded-full" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{profile.display_name?.[0] || "?"}</span>
                )}
              </div>
              <div>
                <div className="font-semibold text-lg">{profile.display_name}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {profile.skill_level}
                  {profile.average_handicap && ` • Handicap: ${profile.average_handicap.toFixed(1)}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Introduction Message</CardTitle>
            <CardDescription>Optional: Introduce yourself and suggest when you'd like to play</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'd love to play a round together. I'm usually free on weekends..."
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <Button onClick={handleSendRequest} size="lg" className="w-full" disabled={sending}>
          {sending ? "Sending..." : "Send Match Request"}
        </Button>
      </div>
    </div>
  )
}
