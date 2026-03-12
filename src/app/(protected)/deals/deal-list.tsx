"use client";

import { useState } from "react";
import { ExternalLink, MoreVertical, CheckCircle, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { type Acquisition, SOURCE_PLATFORM_LABELS, ACQUISITION_STATUS_LABELS } from "@/lib/types/trade";
import { updateAcquisition, deleteAcquisition } from "@/lib/actions/deals";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DealListProps {
  deals: Acquisition[];
  status: Acquisition["status"];
}

export function DealList({ deals, status }: DealListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Acquisition | null>(null);

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">
          {status === "candidate"
            ? "등록된 매입 후보가 없습니다.\n링크를 등록해 관심 매물을 추적하세요."
            : status === "bought"
            ? "매입 확정된 거래가 없습니다."
            : "취소된 거래가 없습니다."}
        </p>
      </div>
    );
  }

  async function handleStatusChange(id: string, newStatus: Acquisition["status"]) {
    setLoading(id);
    const result = await updateAcquisition(id, { status: newStatus });
    if (result.success) {
      toast.success(
        newStatus === "bought" ? "매입 확정되었습니다" : "취소 처리되었습니다"
      );
      router.refresh();
    } else {
      toast.error(result.error ?? "처리 중 오류가 발생했습니다");
    }
    setLoading(null);
  }

  async function handleDelete(id: string) {
    setLoading(id);
    const result = await deleteAcquisition(id);
    if (result.success) {
      toast.success("삭제되었습니다");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error ?? "삭제 중 오류가 발생했습니다");
    }
    setLoading(null);
  }

  return (
    <>
      <div className="space-y-3">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            isLoading={loading === deal.id}
            onStatusChange={handleStatusChange}
            onDelete={() => setDeleteTarget(deal)}
          />
        ))}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <Dialog open onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                매물 삭제
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {deleteTarget.card_name ?? "이 매물"}
              </span>
              을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                취소
              </Button>
              <Button
                variant="destructive"
                disabled={loading === deleteTarget.id}
                onClick={() => handleDelete(deleteTarget.id)}
              >
                {loading === deleteTarget.id ? "삭제 중..." : "삭제"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function DealCard({
  deal,
  isLoading,
  onStatusChange,
  onDelete,
}: {
  deal: Acquisition;
  isLoading: boolean;
  onStatusChange: (id: string, status: Acquisition["status"]) => void;
  onDelete: () => void;
}) {
  const platformLabel = deal.source_platform
    ? SOURCE_PLATFORM_LABELS[deal.source_platform]?.ko ?? deal.source_platform
    : "기타";

  const price = deal.negotiated_price ?? deal.asking_price;
  const totalCost = price ? price + (deal.fees_cost ?? 0) : null;

  return (
    <Card className={isLoading ? "opacity-60 pointer-events-none" : ""}>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* 카드명 — 최상단 */}
            {deal.card_name && (
              <p className="font-semibold text-sm mb-1 truncate">{deal.card_name}</p>
            )}

            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs shrink-0">
                {platformLabel}
              </Badge>
              <Badge
                variant={
                  deal.status === "candidate"
                    ? "secondary"
                    : deal.status === "bought"
                    ? "default"
                    : "destructive"
                }
                className="text-xs shrink-0"
              >
                {ACQUISITION_STATUS_LABELS[deal.status]?.ko ?? deal.status}
              </Badge>
            </div>

            {/* URL */}
            {deal.source_url && (
              <a
                href={deal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline truncate mb-1"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{deal.source_url}</span>
              </a>
            )}

            {/* Notes */}
            {deal.notes && (
              <p className="text-xs text-muted-foreground truncate">{deal.notes}</p>
            )}

            {/* Price */}
            <div className="mt-2 flex items-center gap-3 text-sm flex-wrap">
              {deal.asking_price && (
                <span className="text-muted-foreground text-xs">
                  호가: <span className="font-medium text-foreground">₩{deal.asking_price.toLocaleString()}</span>
                </span>
              )}
              {deal.negotiated_price && (
                <span className="text-muted-foreground text-xs">
                  협의가: <span className="font-medium text-foreground">₩{deal.negotiated_price.toLocaleString()}</span>
                </span>
              )}
              {(deal.fees_cost ?? 0) > 0 && (
                <span className="text-muted-foreground text-xs">
                  부대비용: <span className="font-medium text-foreground">+₩{deal.fees_cost.toLocaleString()}</span>
                </span>
              )}
            </div>
            {totalCost && (deal.fees_cost ?? 0) > 0 && (
              <p className="text-xs font-semibold text-primary mt-0.5">
                총 원가: ₩{totalCost.toLocaleString()}
              </p>
            )}
            {totalCost && (deal.fees_cost ?? 0) === 0 && (
              <p className="text-xs font-semibold mt-0.5">
                ₩{totalCost.toLocaleString()}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-1">
              {new Date(deal.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {deal.status === "candidate" && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(deal.id, "bought")}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    매입 확정
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(deal.id, "canceled")}>
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    취소
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
