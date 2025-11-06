"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CourseDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const courseId = params.courseId as string

  const [course, setCourse] = useState<any>(null)
  const [teeTimes, setTeeTimes] = useState<any[]>([])
  const [lookingToMatch, setLookingToMatch] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const selectedDate = searchParams.get("date") || new Date().toISOString().split("T")[0]

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

      // Get course details
      const { data: courseData } = await supabase.from("courses").select("*").eq("id", courseId).single()

      if (!courseData) {
        router.push("/tee-times")
        return
      }

      setCourse(courseData)

      // Get tee times for this course and date
      const { data: teeTimesData } = await supabase
        .from("tee_times")
        .select("*")
        .eq("course_id", courseId)
        .eq("date", selectedDate)
        .order("time")

      setTeeTimes(teeTimesData || [])

      // Get users looking to match at this course
      const { data: matchData } = await supabase
        .from("matches")
        .select(`
          *,
          profiles!matches_requester_id_fkey (display_name, skill_level, avatar_url)
        `)
        .eq("course_id", courseId)
        .eq("status", "pending")
        .limit(5)

      setLookingToMatch(matchData || [])

      setLoading(false)
    }

    loadData()
  }, [router, courseId, selectedDate])

  const handleDateChange = (date: string) => {
    router.push(`/tee-times/${courseId}?date=${date}`)
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

        {/* Available Tee Times */}
        <Card>
          <CardHeader>
            <CardTitle>Available Tee Times</CardTitle>
            <CardDescription>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
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
        {lookingToMatch.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Players Looking to Match</CardTitle>
              <CardDescription>
                {lookingToMatch.length} {lookingToMatch.length === 1 ? "player" : "players"} looking for partners at
                this course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lookingToMatch.map((match: any) => (
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
                      <div className="text-sm text-muted-foreground capitalize">{match.profiles?.skill_level}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/matches?user=${match.requester_id}`}>View</Link>
                  </Button>
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
