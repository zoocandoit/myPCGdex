"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAcquisition } from "@/lib/actions/deals";
import { SOURCE_PLATFORM_LABELS } from "@/lib/types/trade";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AddDealButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [cardName, setCardName] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [url, setUrl] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [negotiatedPrice, setNegotiatedPrice] = useState("");
  const [feesCost, setFeesCost] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setCardName("");
    setPlatform("");
    setUrl("");
    setAskingPrice("");
    setNegotiatedPrice("");
    setFeesCost("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await createAcquisition({
      card_name: cardName.trim() || undefined,
      source_platform: platform as "danggeun" | "bunjang" | "offline" | "friend" | "ebay" | "other" | undefined,
      source_url: url || undefined,
      asking_price: askingPrice ? Number(askingPrice) : undefined,
      negotiated_price: negotiatedPrice ? Number(negotiatedPrice) : undefined,
      fees_cost: feesCost ? Number(feesCost) : 0,
      notes: notes || undefined,
      status: "candidate",
    });

    if (result.success) {
      toast.success("매입 후보가 등록되었습니다");
      setOpen(false);
      reset();
      router.refresh();
    } else {
      toast.error(result.error ?? "등록 중 오류가 발생했습니다");
    }

    setLoading(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        매물 등록
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>매입 후보 등록</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 카드명 - 가장 중요 */}
            <div className="space-y-1.5">
              <Label htmlFor="card-name">
                카드명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="card-name"
                placeholder="예: 피카츄 ex SAR, 리자몽 AR"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platform">플랫폼</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="플랫폼 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_PLATFORM_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label.ko}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="url">링크 URL (선택)</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="asking">호가 (₩)</Label>
                <Input
                  id="asking"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="negotiated">협의가 (₩)</Label>
                <Input
                  id="negotiated"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={negotiatedPrice}
                  onChange={(e) => setNegotiatedPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fees">부대비용 (₩)</Label>
              <Input
                id="fees"
                type="number"
                min="0"
                placeholder="택배비, 수수료 등"
                value={feesCost}
                onChange={(e) => setFeesCost(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">메모 (선택)</Label>
              <Textarea
                id="notes"
                placeholder="협상 내용, 카드 상태 등"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={loading || !cardName.trim()}>
                {loading ? "등록 중..." : "등록"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
