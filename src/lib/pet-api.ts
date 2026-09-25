import { createHmac } from "node:crypto";
import { getEnv } from "./env";

export async function postSupplierApi(
  payload: Record<string, unknown>,
): Promise<Response> {
  const { petAppUrl, hmacSecret, shopDomain } = getEnv();
  const body = {
    shop: shopDomain,
    ...payload,
  };
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", hmacSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return fetch(`${petAppUrl}/api/supplier`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Supplier-Timestamp": timestamp,
      "X-Supplier-Signature": signature,
    },
    body: rawBody,
  });
}
