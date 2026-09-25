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
  latestNoteCount: number;
  placedAt: string;
  trackingCompany?: string | null;
  trackingNumber?: string | null;
};

export const MAX_PORTRAIT_VERSIONS = 3;

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
      return "待交首版";
    case "supplier_modification":
      return "客户要求修改";
    case "prepare_shipment":
      return "待发货";
    case "portrait_review":
      return "等待客户确认";
    case "shipped":
      return "已发货";
    default:
      return status;
  }
}

export function primaryActionLabel(status: string): string {
  switch (status) {
    case "order_placed":
      return "上传成品";
    case "supplier_modification":
      return "按意见修改";
    case "prepare_shipment":
      return "填写物流";
    default:
      return "查看";
  }
}

/** One-line queue summary, e.g. 「客户提交了 3 条修改 · 第 2 版」. */
export function statusSentence(order: SupplierOrderListItem): string {
  switch (order.businessStatus) {
    case "order_placed":
      return "还没有交过成品";
    case "supplier_modification":
      return `客户提交了 ${order.latestNoteCount} 条修改 · 第 ${order.versionCount} 版`;
    case "prepare_shipment":
      return `客户已批准第 ${order.versionCount} 版，可以发货`;
    case "portrait_review":
      return `已提交第 ${order.versionCount} 版，等待客户确认`;
    case "shipped":
      return [order.trackingCompany, order.trackingNumber].filter(Boolean).join(" · ") || "已发货";
    default:
      return "";
  }
}
