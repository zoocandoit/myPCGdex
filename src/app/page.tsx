import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, FolderOpen, TrendingUp } from "lucide-react";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function HomePage() {
  return (
    <div className="min-h-screen pb-16">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">PokeScan</h1>
          <p className="mt-2 text-muted-foreground">
            Scan, identify, and manage your Pokemon cards
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Quick Scan
              </CardTitle>
              <CardDescription>
                Take a photo of your card to identify it instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/scan">
                <Button className="w-full">Start Scanning</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                My Collection
              </CardTitle>
              <CardDescription>
                View and manage your card collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/collection">
                <Button variant="outline" className="w-full">
                  View Collection
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Prices
              </CardTitle>
              <CardDescription>
                Check current market values for your cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
