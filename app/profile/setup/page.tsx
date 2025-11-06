"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner", description: "New to golf or learning the basics" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with fundamentals" },
  { value: "advanced", label: "Advanced", description: "Consistent player with good technique" },
  { value: "expert", label: "Expert", description: "Low handicap, competitive player" },
]

const INTERESTS = [
  "Competitive Play",
  "Casual Rounds",
  "Social Networking",
  "Skill Improvement",
  "Course Exploration",
  "Tournament Play",
  "Business Networking",
  "Weekend Warrior",
]

export default function ProfileSetupPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    skill_level: "",
    average_handicap: "",
    interests: [] as string[],
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (profile) {
        setFormData({
          display_name: profile.display_name || "",
          bio: profile.bio || "",
          skill_level: profile.skill_level || "",
          average_handicap: profile.average_handicap?.toString() || "",
          interests: profile.interests || [],
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [router, supabase])

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: formData.display_name,
          bio: formData.bio,
          skill_level: formData.skill_level,
          average_handicap: formData.average_handicap ? Number.parseFloat(formData.average_handicap) : null,
          interests: formData.interests,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (error) throw error

      router.push("/dashboard")
    } catch (error) {
      console.error("Error updating profile:", error)
    } finally {
      setSaving(false)
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-primary">Complete Your Profile</h1>
          <p className="text-muted-foreground">Help us match you with the perfect golf partners</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us a bit about yourself and your golf journey..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skill Level */}
          <Card>
            <CardHeader>
              <CardTitle>Skill Level</CardTitle>
              <CardDescription>Select your current skill level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, skill_level: level.value })}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    formData.skill_level === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className="text-sm text-muted-foreground">{level.description}</div>
                </button>
              ))}
              <div className="space-y-2 pt-4">
                <Label htmlFor="handicap">Average Handicap (optional)</Label>
                <Input
                  id="handicap"
                  type="number"
                  step="0.1"
                  value={formData.average_handicap}
                  onChange={(e) => setFormData({ ...formData, average_handicap: e.target.value })}
                  placeholder="e.g., 15.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
              <CardDescription>Select all that apply (at least one required)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.interests.includes(interest)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={saving || !formData.skill_level || formData.interests.length === 0}
          >
            {saving ? "Saving..." : "Complete Profile"}
          </Button>
        </form>
      </div>
    </div>
  )
}
