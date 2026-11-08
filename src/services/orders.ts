/**
 * Order store. Production would be the order-management API; the prototype keeps orders in this browser
 * so the back-office screen can show applications made in the owner app.
 */
import type { Order } from "../engine/orders";
import { readList, writeList } from "./store";

const KEY = "udyam-digital.orders.v1";

export const loadOrders = () => readList<Order>(KEY);
export const findOrder = (id: string) => loadOrders().find((o) => o.id === id);

export function saveOrder(o: Order) {
  writeList(KEY, [o, ...loadOrders().filter((x) => x.id !== o.id)]);
}
