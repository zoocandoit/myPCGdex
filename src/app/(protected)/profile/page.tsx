import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" className="w-full">
            Sign In
          </Button>
          <Button variant="outline" className="w-full">
            Create Account
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
