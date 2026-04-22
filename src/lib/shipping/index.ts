import { bookShipmozoShipmentForOrder } from "@/lib/shipping/shipmozo";

export async function bookShipmentForOrder(orderId: string): Promise<void> {
  await bookShipmozoShipmentForOrder(orderId);
}
