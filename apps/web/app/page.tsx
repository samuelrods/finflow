import Link from "next/link";
import {
  ArrowRight,
  PieChart,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="font-bold tracking-tight">Finance Tracker</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-sm font-medium">
                Log In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="text-sm font-medium">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 sm:py-32 lg:pb-32 lg:pt-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="mx-auto max-w-4xl font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl">
              Take control of your{" "}
              <span className="text-primary">financial future</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-muted-foreground sm:text-xl">
              Track your expenses, analyze your spending habits, and achieve
              your financial goals with our intuitive and powerful finance
              tracker.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Tracking for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base"
                >
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 sm:py-32 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to manage your money
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Our platform provides all the tools you need to stay on top of
                your finances and make informed decisions.
              </p>
            </div>
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:max-w-none lg:grid-cols-3">
              <Card className="flex flex-col border-none shadow-md">
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <PieChart className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Detailed Analytics</CardTitle>
                  <CardDescription>
                    Understand exactly where your money goes with beautiful,
                    interactive charts and insights.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1" />
              </Card>

              <Card className="flex flex-col border-none shadow-md">
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Smart Budgeting</CardTitle>
                  <CardDescription>
                    Set budgets for different categories and track your progress
                    throughout the month.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1" />
              </Card>

              <Card className="flex flex-col border-none shadow-md">
                <CardHeader>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Secure & Private</CardTitle>
                  <CardDescription>
                    Your financial data is encrypted and securely stored. We
                    never sell your personal information.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1" />
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-background py-8">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col items-center justify-between gap-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Finance Tracker
            </span>
          </div>
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            &copy; {new Date().getFullYear()} Finance Tracker. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
