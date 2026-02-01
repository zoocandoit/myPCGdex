import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";

export default function ScanPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Scan Card</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Pokemon Card</CardTitle>
          <CardDescription>
            Take a photo or upload an image of your Pokemon card
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button className="h-24 w-full" variant="outline">
            <Camera className="mr-2 h-6 w-6" />
            Take Photo
          </Button>
          <Button className="h-24 w-full" variant="outline">
            <Upload className="mr-2 h-6 w-6" />
            Upload Image
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
