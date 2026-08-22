export interface PurchaseRecord {
  id: string;
  item: string;
  category: string;
  price: number;
  currency: string;
  quantity: number;
  date: string;
  supplier: string;
  supplierContact?: string;
  status: "Ordered" | "Transit" | "Received";
  remarks?: string;
  serialNumber?: string;
  syncToInventory?: boolean;
}
