import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function EmailConfirmedPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-background via-muted/20 to-primary/10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-4xl font-bold text-primary">ForeLeft</h1>
            <p className="text-sm text-muted-foreground">Email Confirmation</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Email confirmed</CardTitle>
              <CardDescription>Your account is ready to go</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Thanks for confirming your email. You can now sign in and finish setting up your profile to start finding golf partners.
              </p>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/login">Go to Login</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
