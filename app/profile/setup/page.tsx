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

const MATCH_GOALS = [
  { value: "meet new people", label: "Meet new people" },
  { value: "relax outdoors", label: "Relax outdoors" },
  { value: "stay active", label: "Stay active" },
  { value: "learn fundamentals", label: "Learn fundamentals" },
  { value: "sharpen skills", label: "Sharpen skills" },
  { value: "compete seriously", label: "Compete seriously" },
  { value: "mentor others", label: "Mentor others" },
  { value: "host clients", label: "Host clients" },
]

const PERSONALITY_TRAITS = [
  { value: "competitive", label: "Competitive" },
  { value: "easygoing", label: "Easygoing" },
  { value: "supportive", label: "Supportive" },
  { value: "focused", label: "Focused" },
  { value: "strategic", label: "Strategic" },
  { value: "patient", label: "Patient" },
  { value: "sociable", label: "Sociable" },
  { value: "energetic", label: "Energetic" },
  { value: "encouraging", label: "Encouraging" },
  { value: "disciplined", label: "Disciplined" },
  { value: "confident", label: "Confident" },
  { value: "analytical", label: "Analytical" },
]

const PLAY_FREQUENCIES = [
  { value: "multiple_per_week", label: "Multiple times per week" },
  { value: "weekly", label: "Weekly" },
  { value: "twice_per_month", label: "2-3 times per month" },
  { value: "monthly", label: "Monthly" },
]

const ROUND_TIMES = [
  { value: "dawn", label: "Dawn / first light" },
  { value: "morning", label: "Morning" },
  { value: "midday", label: "Midday" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Twilight / evening" },
]

const PACE_OPTIONS = [
  { value: "fast", label: "Fast (keep it moving)" },
  { value: "steady", label: "Steady (comfortable pace)" },
  { value: "relaxed", label: "Relaxed (take our time)" },
]

const SWING_TENDENCIES = [
  { value: "left", label: "Miss left" },
  { value: "straight", label: "Pretty straight" },
  { value: "right", label: "Miss right" },
]

const GROUP_PREFERENCES = [
  { value: "twosome", label: "Prefer twosomes" },
  { value: "threesome", label: "Prefer threesomes" },
  { value: "foursome", label: "Prefer foursomes" },
  { value: "flexible", label: "Flexible on group size" },
]

const BUSINESS_TALK_OPTIONS = [
  { value: "love_it", label: "Love discussing business & politics" },
  { value: "open", label: "Open if others bring it up" },
  { value: "avoid", label: "Prefer to avoid those topics" },
]

const DRINKS_ON_COURSE_OPTIONS = [
  { value: "never", label: "Prefer to stay dry" },
  { value: "occasional", label: "Open to a casual drink" },
  { value: "always", label: "Enjoy having a few" },
]

const MONEY_GAME_OPTIONS = [
  { value: "no_bets", label: "No money games" },
  { value: "friendly", label: "Friendly low-stakes games" },
  { value: "competitive", label: "Serious stakes welcome" },
]

const DISTRACTION_TOLERANCE_OPTIONS = [
  { value: "not_bothered", label: "Hardly notice talking" },
  { value: "somewhat_distracted", label: "Prefer some courtesy" },
  { value: "easily_distracted", label: "Need quiet while swinging" },
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
    match_goals: [] as string[],
    personality_traits: [] as string[],
    play_frequency: "",
    preferred_round_time: "",
    pace_of_play: "",
    swing_tendency: "",
    group_preference: "",
    business_talk_preference: "",
    drinks_on_course_preference: "",
    money_game_preference: "",
    distraction_tolerance: "",
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
          match_goals: profile.match_goals || [],
          personality_traits: profile.personality_traits || [],
          play_frequency: profile.play_frequency || "",
          preferred_round_time: profile.preferred_round_time || "",
          pace_of_play: profile.pace_of_play || "",
          swing_tendency: profile.swing_tendency || "",
          group_preference: profile.group_preference || "",
          business_talk_preference: profile.business_talk_preference || "",
          drinks_on_course_preference: profile.drinks_on_course_preference || "",
          money_game_preference: profile.money_game_preference || "",
          distraction_tolerance: profile.distraction_tolerance || "",
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

  const toggleMatchGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      match_goals: prev.match_goals.includes(goal)
        ? prev.match_goals.filter((g) => g !== goal)
        : [...prev.match_goals, goal],
    }))
  }

  const toggleTrait = (trait: string) => {
    setFormData((prev) => ({
      ...prev,
      personality_traits: prev.personality_traits.includes(trait)
        ? prev.personality_traits.filter((t) => t !== trait)
        : [...prev.personality_traits, trait],
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
          match_goals: formData.match_goals,
          personality_traits: formData.personality_traits,
          play_frequency: formData.play_frequency,
          preferred_round_time: formData.preferred_round_time,
          pace_of_play: formData.pace_of_play,
          swing_tendency: formData.swing_tendency,
          group_preference: formData.group_preference,
          business_talk_preference: formData.business_talk_preference,
          drinks_on_course_preference: formData.drinks_on_course_preference,
          money_game_preference: formData.money_game_preference,
          distraction_tolerance: formData.distraction_tolerance,
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

          {/* Match Goals */}
          <Card>
            <CardHeader>
              <CardTitle>Match Goals</CardTitle>
              <CardDescription>Select at least one focus for your rounds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {MATCH_GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleMatchGoal(goal.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.match_goals.includes(goal.value)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personality Traits */}
          <Card>
            <CardHeader>
              <CardTitle>On-Course Personality</CardTitle>
              <CardDescription>Pick the traits that best describe you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {PERSONALITY_TRAITS.map((trait) => (
                  <button
                    key={trait.value}
                    type="button"
                    onClick={() => toggleTrait(trait.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.personality_traits.includes(trait.value)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {trait.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Play Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Play Preferences</CardTitle>
              <CardDescription>Help us find golfers with a similar rhythm</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="play_frequency">How often do you play?</Label>
                <select
                  id="play_frequency"
                  value={formData.play_frequency}
                  onChange={(e) => setFormData({ ...formData, play_frequency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Select frequency
                  </option>
                  {PLAY_FREQUENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_round_time">Preferred tee time</Label>
                <select
                  id="preferred_round_time"
                  value={formData.preferred_round_time}
                  onChange={(e) => setFormData({ ...formData, preferred_round_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Select time of day
                  </option>
                  {ROUND_TIMES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pace_of_play">Preferred pace</Label>
                <select
                  id="pace_of_play"
                  value={formData.pace_of_play}
                  onChange={(e) => setFormData({ ...formData, pace_of_play: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Select pace of play
                  </option>
                  {PACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="swing_tendency">Swing tendency</Label>
                <select
                  id="swing_tendency"
                  value={formData.swing_tendency}
                  onChange={(e) => setFormData({ ...formData, swing_tendency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Select your usual miss
                  </option>
                  {SWING_TENDENCIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group_preference">Preferred group size</Label>
                <select
                  id="group_preference"
                  value={formData.group_preference}
                  onChange={(e) => setFormData({ ...formData, group_preference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Select group size
                  </option>
                  {GROUP_PREFERENCES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_talk_preference">Business & politics chat?</Label>
                <select
                  id="business_talk_preference"
                  value={formData.business_talk_preference}
                  onChange={(e) => setFormData({ ...formData, business_talk_preference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Choose what feels right
                  </option>
                  {BUSINESS_TALK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drinks_on_course_preference">Enjoy beverages while playing?</Label>
                <select
                  id="drinks_on_course_preference"
                  value={formData.drinks_on_course_preference}
                  onChange={(e) => setFormData({ ...formData, drinks_on_course_preference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Choose your comfort level
                  </option>
                  {DRINKS_ON_COURSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="money_game_preference">Playing for money?</Label>
                <select
                  id="money_game_preference"
                  value={formData.money_game_preference}
                  onChange={(e) => setFormData({ ...formData, money_game_preference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    Select your comfort level
                  </option>
                  {MONEY_GAME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distraction_tolerance">Talking while you swing?</Label>
                <select
                  id="distraction_tolerance"
                  value={formData.distraction_tolerance}
                  onChange={(e) => setFormData({ ...formData, distraction_tolerance: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  required
                >
                  <option value="" disabled>
                    How much chatter is okay?
                  </option>
                  {DISTRACTION_TOLERANCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              saving ||
              !formData.skill_level ||
              formData.interests.length === 0 ||
              formData.match_goals.length === 0 ||
              formData.personality_traits.length === 0 ||
              !formData.play_frequency ||
              !formData.preferred_round_time ||
              !formData.pace_of_play ||
              !formData.swing_tendency ||
              !formData.group_preference ||
              !formData.business_talk_preference ||
              !formData.drinks_on_course_preference ||
              !formData.money_game_preference ||
              !formData.distraction_tolerance
            }
          >
            {saving ? "Saving..." : "Complete Profile"}
          </Button>
        </form>
      </div>
    </div>
  )
}
