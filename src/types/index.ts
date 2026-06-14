export type Modifier = {
  id: string;
  name: string;
  price: number;
};

export type VatRate = 9 | 21;

export type Dish = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  vatRate?: VatRate;
  modifiers?: Modifier[];
};

export type OrderStatus = "Open" | "Afgehandeld" | "Betaald";

export type DiscountPercentage = 0 | 30 | 50 | 100;

export type OrderItem = {
  dishId: string;
  name: string;
  price: number;
  qty: number;
  vatRate?: VatRate;
  modifiers?: {
    id: string;
    name: string;
    price: number;
  }[];
  discount?: DiscountPercentage;
};

export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  status: OrderStatus;
  waiter: string;
  timestamp?: number;
  createdAt?: any;
  orderNumber?: string;
  discount?: DiscountPercentage;
};