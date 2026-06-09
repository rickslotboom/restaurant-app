export type Modifier = {
  id: string;
  name: string;
  price: number; // extra prijs bovenop basisprijs (0 = gratis optie)
};

export type Dish = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  modifiers?: Modifier[]; // optioneel — alleen voor gerechten met keuzes
};

export type OrderStatus = "Open" | "Afgehandeld" | "Betaald";

export type DiscountPercentage = 0 | 30 | 50 | 100;

export type OrderItem = {
  dishId: string;
  name: string;
  price: number;
  qty: number;
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

  // NIEUW
  discount?: DiscountPercentage;
};