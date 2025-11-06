"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { MobileNav } from "@/components/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface TeeTimeWithCourse {
  id: string
  date: string
  time: string
  price: number
  available_spots: number
  course: {
    id: string
    name: string
    city: string
    province: string
    image_url: string
    holes: number
    par: number
  }
}

export default function TeeTimesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [teeTimes, setTeeTimes] = useState<TeeTimeWithCourse[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const selectedCity = searchParams.get("city") || "all"

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

      console.log("[v0] Fetching tee times...")

      const today = new Date().toISOString().split("T")[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      let teeTimesQuery = supabase
        .from("tee_times")
        .select(`
          id,
          date,
          time,
          price,
          available_spots,
          course:courses (
            id,
            name,
            city,
            province,
            image_url,
            holes,
            par
          )
        `)
        .gte("date", today)
        .lte("date", nextWeek)
        .gt("available_spots", 0)
        .order("date")
        .order("time")
        .limit(50)

      if (selectedCity !== "all") {
        const { data: coursesInCity } = await supabase.from("courses").select("id").eq("city", selectedCity)

        const courseIds = coursesInCity?.map((c) => c.id) || []
        if (courseIds.length > 0) {
          teeTimesQuery = teeTimesQuery.in("course_id", courseIds)
        }
      }

      const { data: teeTimesData, error } = await teeTimesQuery

      console.log("[v0] Tee times fetched:", teeTimesData?.length || 0, "Error:", error)

      setTeeTimes((teeTimesData as any) || [])

      // Get unique cities for filter
      const { data: allCourses } = await supabase.from("courses").select("city").order("city")
      const uniqueCities = Array.from(new Set(allCourses?.map((c) => c.city) || []))
      setCities(uniqueCities)

      setLoading(false)
    }

    loadData()
  }, [router, selectedCity])

  const handleCityChange = (city: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (city === "all") {
      params.delete("city")
    } else {
      params.set("city", city)
    }
    router.push(`/tee-times?${params.toString()}`)
  }

  const groupedTeeTimes = teeTimes.reduce(
    (acc, teeTime) => {
      const date = teeTime.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(teeTime)
      return acc
    },
    {} as Record<string, TeeTimeWithCourse[]>,
  )

  if (loading) {
    return (
      <div className="min-h-svh pb-20 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tee times...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh pb-20 bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-balance">Upcoming Tee Times</h1>
          <p className="text-muted-foreground">Book your next round at top BC courses</p>
        </div>

        {/* City Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by City</label>
              <select
                value={selectedCity}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                onChange={(e) => handleCityChange(e.target.value)}
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {Object.keys(groupedTeeTimes).length > 0 ? (
            Object.entries(groupedTeeTimes).map(([date, times]) => (
              <div key={date} className="space-y-3">
                <h2 className="text-lg font-semibold sticky top-0 bg-background py-2">
                  {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h2>
                <div className="space-y-3">
                  {times.map((teeTime) => (
                    <Card key={teeTime.id} className="overflow-hidden">
                      <div className="flex gap-4">
                        <div className="w-32 h-32 flex-shrink-0 bg-gradient-to-br from-primary/20 to-secondary/20">
                          <img
                            src={`/lush-golf-course.png?key=vpzjd&height=200&width=200&query=golf course ${teeTime.course.name}`}
                            alt={teeTime.course.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 py-4 pr-4 flex flex-col justify-between">
                          <div>
                            <h3 className="font-semibold text-balance leading-tight">{teeTime.course.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {teeTime.course.city}, {teeTime.course.province}
                            </p>
                            <div className="mt-2 flex items-center gap-4 text-sm">
                              <span className="font-medium text-primary">
                                {new Date(`2000-01-01T${teeTime.time}`).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                              <span className="text-muted-foreground">
                                {teeTime.available_spots} {teeTime.available_spots === 1 ? "spot" : "spots"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-lg font-bold text-secondary">
                              ${teeTime.price?.toFixed(2) || "N/A"}
                            </span>
                            <Button size="sm" asChild>
                              <Link href={`/tee-times/${teeTime.course.id}/book/${teeTime.id}`}>Book Now</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No Tee Times Found</h3>
                  <p className="text-muted-foreground">
                    {selectedCity !== "all"
                      ? "No tee times available in this city. Try selecting a different city or run the seed scripts to populate the database."
                      : "The database appears to be empty. Please run the seed scripts to populate courses and tee times."}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-lg p-4 text-left max-w-md mx-auto">
                  <p className="text-sm font-medium mb-2">To populate the database:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open the Scripts panel in v0</li>
                    <li>
                      Run <code className="text-xs bg-muted px-1 py-0.5 rounded">003_seed_courses.sql</code>
                    </li>
                    <li>
                      Run <code className="text-xs bg-muted px-1 py-0.5 rounded">004_seed_tee_times.sql</code>
                    </li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
