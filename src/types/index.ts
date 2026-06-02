export type Dish = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
};

export type OrderStatus = "Open" | "Afgehandeld" | "Betaald";

export type OrderItem = {
  dishId: string;
  name: string;
  price: number;
  qty: number;
};

export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  status: OrderStatus;
  waiter: string;     // 👈 nieuw
  timestamp?: number;
  createdAt?: any;
  orderNumber?: string;
};