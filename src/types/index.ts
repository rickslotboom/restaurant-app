export type Dish = {
  image: string;
  id: string;
  name: string;
  price: number;
};

export type OrderStatus = "Open" | "Afgehandeld" ;

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