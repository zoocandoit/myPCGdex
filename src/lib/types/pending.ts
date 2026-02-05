export type PendingCardStatus = "pending" | "processing" | "failed";

export interface PendingCard {
  id: string;
  user_id: string;
  front_image_path: string;
  back_image_path: string | null;
  queued_at: string;
  status: PendingCardStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

export interface PendingCardInsert {
  front_image_path: string;
  back_image_path?: string | null;
}
