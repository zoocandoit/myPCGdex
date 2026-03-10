import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  label: string;
  sublabel: string;
  value: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
}

interface RecentActivityProps {
  title: string;
  href: string;
  items: ActivityItem[];
  emptyLabel: string;
}

export function RecentActivity({ title, href, items, emptyLabel }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          전체보기
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.label}</p>
                {item.sublabel && (
                  <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold">{item.value}</span>
                <Badge variant={item.badgeVariant} className="text-xs py-0 px-1.5">
                  {item.badge}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
