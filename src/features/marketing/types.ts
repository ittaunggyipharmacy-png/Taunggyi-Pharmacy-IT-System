export interface ContentPlan {
  id: string;
  platform: "Facebook" | "Viber" | "TikTok";
  productName: string;
  price: string;
  promotionPeriod: string;
  content: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Posted";
  reviewer?: string;
}
