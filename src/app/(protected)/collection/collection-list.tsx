"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Loader2,
  Filter,
  ArrowUpDown,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Download,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
} from "lucide-react";
import { getCollection, deleteCard, type CollectionSortBy } from "@/lib/actions/collection";
import type { CollectionCard, CardCondition, CardLanguage } from "@/lib/types/collection";
import { CONDITION_LABELS } from "@/lib/types/collection";
import { CardImage } from "@/components/card-image";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  condition: string;
  language: string;
  graded: "all" | "graded" | "raw";
  sortBy: CollectionSortBy;
}

interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  condition: "",
  language: "",
  graded: "all",
  sortBy: "date_desc",
};

const VIEWS_KEY = "pcgdex_collection_views";

const SORT_LABELS: Record<CollectionSortBy, string> = {
  date_desc: "최신순",
  date_asc: "오래된순",
  price_desc: "원가 높은순",
  price_asc: "원가 낮은순",
  name_asc: "이름 A→Z",
  name_desc: "이름 Z→A",
};

const CONDITION_OPTIONS: Array<{ value: CardCondition; label: string }> = [
  { value: "mint", label: "민트" },
  { value: "near_mint", label: "니어민트" },
  { value: "lightly_played", label: "LP" },
  { value: "moderately_played", label: "MP" },
  { value: "heavily_played", label: "HP" },
];

const LANGUAGE_OPTIONS: Array<{ value: CardLanguage; label: string }> = [
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CollectionList() {
  const [allCards, setAllCards] = useState<CollectionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Load cards
  useEffect(() => {
    async function loadCards() {
      const result = await getCollection({ limit: 500 });
      if (result.success && result.data) setAllCards(result.data);
      setIsLoading(false);
    }
    loadCards();
  }, []);

  // Load saved views from localStorage (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEWS_KEY);
      if (stored) setSavedViews(JSON.parse(stored));
    } catch {}
  }, []);

  // Client-side filter + sort
  const filteredCards = useMemo(() => {
    let result = [...allCards];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.pokemon_name.toLowerCase().includes(q) ||
          c.card_number.toLowerCase().includes(q) ||
          (c.set_name ?? "").toLowerCase().includes(q)
      );
    }

    if (filters.condition) result = result.filter((c) => c.condition === filters.condition);
    if (filters.language) result = result.filter((c) => c.language === filters.language);
    if (filters.graded === "graded") result = result.filter((c) => c.is_graded);
    else if (filters.graded === "raw") result = result.filter((c) => !c.is_graded);

    switch (filters.sortBy) {
      case "date_asc":
        result.sort(
          (a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
        );
        break;
      case "price_desc":
        result.sort((a, b) => (b.purchase_price ?? 0) - (a.purchase_price ?? 0));
        break;
      case "price_asc":
        result.sort((a, b) => (a.purchase_price ?? 0) - (b.purchase_price ?? 0));
        break;
      case "name_asc":
        result.sort((a, b) => a.pokemon_name.localeCompare(b.pokemon_name));
        break;
      case "name_desc":
        result.sort((a, b) => b.pokemon_name.localeCompare(a.pokemon_name));
        break;
      default: // date_desc
        result.sort(
          (a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime()
        );
    }

    return result;
  }, [allCards, search, filters]);

  const hasActiveFilters =
    !!filters.condition || !!filters.language || filters.graded !== "all";

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
  }, []);

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  }, [filteredCards, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    let success = 0;
    for (const id of selectedIds) {
      const res = await deleteCard(id);
      if (res.success) success++;
    }
    setAllCards((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setIsBulkDeleting(false);
    setIsDeleteConfirmOpen(false);
    toast.success(`${success}장 삭제되었습니다`);
  }, [selectedIds]);

  // Export CSV
  const handleExport = useCallback(() => {
    const toExport =
      selectedIds.size > 0 ? filteredCards.filter((c) => selectedIds.has(c.id)) : filteredCards;

    const rows = [
      [
        "이름",
        "번호",
        "세트",
        "언어",
        "컨디션",
        "원가",
        "시세",
        "등급여부",
        "등급",
        "인증번호",
        "추가일",
      ],
      ...toExport.map((c) => [
        c.pokemon_name,
        c.card_number,
        c.set_name ?? "",
        c.language,
        CONDITION_LABELS[c.condition]?.ko ?? c.condition,
        c.purchase_price ?? "",
        c.market_price ?? "",
        c.is_graded ? "O" : "X",
        c.grade ?? "",
        c.cert_number ?? "",
        new Date(c.collected_at).toLocaleDateString("ko-KR"),
      ]),
    ];

    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${toExport.length}장 내보내기 완료`);
  }, [filteredCards, selectedIds]);

  // Saved views
  const handleSaveView = useCallback(() => {
    if (!newViewName.trim()) return;
    const view: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      filters: { ...filters },
    };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(updated));
    setNewViewName("");
    setIsSaveViewOpen(false);
    toast.success(`"${view.name}" 뷰 저장됨`);
  }, [newViewName, filters, savedViews]);

  const handleDeleteView = useCallback(
    (id: string) => {
      const updated = savedViews.filter((v) => v.id !== id);
      setSavedViews(updated);
      localStorage.setItem(VIEWS_KEY, JSON.stringify(updated));
    },
    [savedViews]
  );

  const handleApplyView = useCallback((view: SavedView) => {
    setFilters(view.filters);
    setSearch("");
    toast(`"${view.name}" 뷰 적용됨`);
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAllSelected = filteredCards.length > 0 && selectedIds.size === filteredCards.length;

  return (
    <div className="space-y-3">
      {/* ── Search bar ───────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="포켓몬 이름, 번호, 세트 검색…"
          className="pl-9 pr-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Filter + Sort row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Condition filter */}
        <Select
          value={filters.condition || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, condition: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue placeholder="컨디션" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 컨디션</SelectItem>
            {CONDITION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Language filter */}
        <Select
          value={filters.language || "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, language: v === "all" ? "" : v }))}
        >
          <SelectTrigger className="h-8 w-[96px] text-xs">
            <SelectValue placeholder="언어" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 언어</SelectItem>
            {LANGUAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Graded filter */}
        <Select
          value={filters.graded}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, graded: v as FilterState["graded"] }))
          }
        >
          <SelectTrigger className="h-8 w-[88px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="graded">등급</SelectItem>
            <SelectItem value="raw">언그레이드</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => setFilters((f) => ({ ...f, sortBy: v as CollectionSortBy }))}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <ArrowUpDown className="mr-1 h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as CollectionSortBy[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" />
            필터 초기화
          </Button>
        )}

        {/* Saved views dropdown */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Bookmark className="mr-1 h-3 w-3" />
                뷰 저장{savedViews.length > 0 && ` (${savedViews.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setIsSaveViewOpen(true)}>
                <BookmarkPlus className="mr-2 h-4 w-4" />
                현재 필터를 뷰로 저장
              </DropdownMenuItem>
              {savedViews.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {savedViews.map((v) => (
                    <div key={v.id} className="flex items-center justify-between px-2 py-1.5">
                      <button
                        className="flex-1 text-left text-sm hover:text-primary"
                        onClick={() => handleApplyView(v)}
                      >
                        {v.name}
                      </button>
                      <button
                        onClick={() => handleDeleteView(v.id)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Count + bulk action bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <button onClick={selectAll} className="flex items-center gap-1 hover:text-foreground">
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
          <span>
            {search || hasActiveFilters
              ? `${filteredCards.length} / ${allCards.length}장`
              : `총 ${allCards.length}장`}
          </span>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary">{selectedIds.size}개 선택됨</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleExport}
            >
              <Download className="mr-1 h-3 w-3" />
              CSV
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              삭제
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {selectedIds.size === 0 && filteredCards.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleExport}>
            <Download className="mr-1 h-3 w-3" />
            CSV 내보내기
          </Button>
        )}
      </div>

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {filteredCards.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {allCards.length === 0
                ? "아직 컬렉션이 비어 있습니다."
                : "검색 조건에 맞는 카드가 없습니다."}
            </p>
            {(search || hasActiveFilters) && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
                필터 초기화
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Card grid ─────────────────────────────────────────────────── */}
      {filteredCards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => {
            const isSelected = selectedIds.has(card.id);
            return (
              <div key={card.id} className="relative">
                {/* Selection checkbox overlay */}
                <button
                  onClick={() => toggleSelect(card.id)}
                  className={`absolute left-2 top-2 z-10 rounded p-0.5 transition-opacity ${
                    isSelected
                      ? "opacity-100"
                      : "opacity-0 hover:opacity-100 group-hover:opacity-100"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-primary drop-shadow" />
                  ) : (
                    <Square className="h-5 w-5 text-white drop-shadow" />
                  )}
                </button>

                <Link href={`/collection/${card.id}`}>
                  <Card
                    className={`group overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50 ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="relative aspect-[2.5/3.5] overflow-hidden rounded-md bg-muted">
                        <CardImage
                          tcgImageUrl={card.tcg_image_url}
                          storagePath={card.front_image_path}
                          alt={card.pokemon_name}
                        />
                        {card.is_graded && card.grade && (
                          <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                            {card.grading_company} {card.grade}
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="flex items-start justify-between gap-1">
                          <p className="truncate font-medium leading-tight">{card.pokemon_name}</p>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {CONDITION_LABELS[card.condition]?.ko ?? card.condition}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {card.card_number}
                          {card.set_name && ` · ${card.set_name}`}
                          {card.language !== "ko" && (
                            <span className="ml-1 uppercase">[{card.language}]</span>
                          )}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          {card.purchase_price ? (
                            <span className="text-muted-foreground">
                              원가{" "}
                              <span className="font-medium text-foreground">
                                ₩{card.purchase_price.toLocaleString()}
                              </span>
                            </span>
                          ) : (
                            <span />
                          )}
                          {card.market_price && (
                            <span className="font-medium text-green-600">
                              ${card.market_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bulk delete confirm dialog ────────────────────────────────── */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {selectedIds.size}장 삭제
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            선택한 <span className="font-semibold text-foreground">{selectedIds.size}장</span>을
            컬렉션에서 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
            >
              {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isBulkDeleting ? "삭제 중…" : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save view dialog ──────────────────────────────────────────── */}
      <Dialog open={isSaveViewOpen} onOpenChange={setIsSaveViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>현재 필터를 뷰로 저장</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="뷰 이름 (예: 한국어 민트)"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveViewOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveView} disabled={!newViewName.trim()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
