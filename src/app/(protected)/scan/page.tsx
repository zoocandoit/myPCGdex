import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScanTabs } from "./scan-tabs";

export default function ScanPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Scan Card</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Pokemon Card</CardTitle>
          <CardDescription>
            Take a photo on your phone or upload an image of your Pokemon card
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanTabs />
        </CardContent>
      </Card>
    </main>
  );
}
