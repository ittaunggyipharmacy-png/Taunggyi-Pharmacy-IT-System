export interface RenewalRecord {
  id: string;
  serviceName: string;
  shopName: string;
  expireDate: string;
  price: number;
  currency: string;
  billingCycle: "Monthly" | "Quarterly" | "Yearly";
  status: "Active" | "Expiring Soon" | "Expired";
  provider?: string;
  renewalMethod?: string;
  contactPerson?: string;
  contactPhone?: string;
  websiteLink?: string;
  requiredDocuments?: string[];
  wifiId?: string;
  mb?: string;
  ispName?: string;
  phoneNumber?: string;
  credentials?: string;
  location?: string;
  twelveMonthPrice?: number;
  remarks?: string;
  orderIndex?: number;
}
