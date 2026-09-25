export type BusinessStatus =
  | "order_placed"
  | "portrait_review"
  | "supplier_modification"
  | "prepare_shipment"
  | "shipped";

export type SupplierOrderListItem = {
  id: string;
  orderName: string;
  email: string | null;
  businessStatus: BusinessStatus | string;
  versionCount: number;
  modificationCount: number;
  placedAt: string;
  trackingCompany?: string | null;
  trackingNumber?: string | null;
};

export type ModificationNote = {
  id: string;
  index?: number;
  text: string;
  selection: { x: number; y: number; width: number; height: number };
};

export type SupplierOrderDetail = {
  id: string;
  gid: string;
  name: string;
  email: string | null;
  createdAt: string;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  total?: { amount: string; currencyCode: string } | null;
  shippingAddress?: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    country?: string | null;
    phone?: string | null;
  } | null;
  lineItems: Array<{
    title?: string | null;
    variantTitle?: string | null;
    quantity?: number;
    customAttributes?: Array<{ key: string; value?: string | null }> | null;
  }>;
  originalPhotoUrl?: string | null;
  paintingUrl?: string | null;
  paintingStyle?: string | null;
  giftMessage?: string | null;
  businessStatus: BusinessStatus | string;
  versionCount: number;
  modificationCount: number;
  trackingCompany?: string | null;
  trackingNumber?: string | null;
  versions: Array<{
    versionNumber: number;
    imageUrl?: string | null;
    videoUrl?: string | null;
    createdAt?: string;
  }>;
  modificationRequests: Array<{
    againstVersion: number;
    createdAt?: string;
    notes: ModificationNote[];
  }>;
};

export function statusLabel(status: string): string {
  switch (status) {
    case "order_placed":
      return "Needs first portrait";
    case "supplier_modification":
      return "Customer requested changes";
    case "prepare_shipment":
      return "Ready to ship";
    case "portrait_review":
      return "Waiting on customer";
    case "shipped":
      return "Shipped";
    default:
      return status;
  }
}

export function primaryActionLabel(status: string): string {
  switch (status) {
    case "order_placed":
      return "Upload artwork";
    case "supplier_modification":
      return "Upload revision";
    case "prepare_shipment":
      return "Enter tracking";
    default:
      return "View";
  }
}
