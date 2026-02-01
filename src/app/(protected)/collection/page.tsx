import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CollectionPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">My Collection</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your Cards</CardTitle>
          <CardDescription>
            View and manage your Pokemon card collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No cards in your collection yet. Start by scanning your first card!
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
