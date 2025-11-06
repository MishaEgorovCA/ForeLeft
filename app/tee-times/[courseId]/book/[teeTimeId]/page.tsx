"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function BookTeeTimePage() {
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [course, setCourse] = useState<any>(null)
  const [teeTime, setTeeTime] = useState<any>(null)
  const [numPlayers, setNumPlayers] = useState(1)
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

      // Get course
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", params.courseId).single()

      setCourse(courseData)

      // Get tee time
      const { data: teeTimeData } = await supabase.from("tee_times").select("*").eq("id", params.teeTimeId).single()

      setTeeTime(teeTimeData)
      setLoading(false)
    }

    loadData()
  }, [params, router, supabase])

  const handleBooking = async () => {
    setBooking(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      if (numPlayers > teeTime.available_spots) {
        throw new Error("Not enough spots available")
      }

      const totalPrice = teeTime.price ? teeTime.price * numPlayers : 0

      const { error: bookingError } = await supabase.from("bookings").insert({
        user_id: user.id,
        tee_time_id: teeTime.id,
        course_id: course.id,
        booking_date: new Date(`${teeTime.date}T${teeTime.time}`).toISOString(),
        num_players: numPlayers,
        total_price: totalPrice,
        status: "confirmed",
      })

      if (bookingError) throw bookingError

      // Update available spots
      const { error: updateError } = await supabase
        .from("tee_times")
        .update({
          available_spots: teeTime.available_spots - numPlayers,
        })
        .eq("id", teeTime.id)

      if (updateError) throw updateError

      router.push("/dashboard?booking=success")
    } catch (err: any) {
      setError(err.message || "Failed to book tee time")
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!course || !teeTime) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground">Tee time not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tee-times/${course.id}`}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Book Tee Time</h1>
          <p className="text-muted-foreground">Confirm your booking details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Course</div>
              <div className="font-medium">{course.name}</div>
              <div className="text-sm text-muted-foreground">
                {course.city}, {course.province}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date & Time</div>
              <div className="font-medium">
                {new Date(teeTime.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="font-medium">
                {new Date(`2000-01-01T${teeTime.time}`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Available Spots</div>
              <div className="font-medium">{teeTime.available_spots}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Number of Players</CardTitle>
            <CardDescription>How many players will be in your group?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="numPlayers">Players (max {Math.min(4, teeTime.available_spots)})</Label>
              <select
                id="numPlayers"
                value={numPlayers}
                onChange={(e) => setNumPlayers(Number.parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {Array.from({ length: Math.min(4, teeTime.available_spots) }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? "player" : "players"}
                  </option>
                ))}
              </select>
            </div>
            {teeTime.price && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <span className="font-medium">Total Price</span>
                <span className="text-2xl font-bold text-primary">${(teeTime.price * numPlayers).toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <Button onClick={handleBooking} size="lg" className="w-full" disabled={booking}>
          {booking ? "Booking..." : "Confirm Booking"}
        </Button>
      </div>
    </div>
  )
}
