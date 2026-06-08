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

export type OrderItem = {
  dishId: string;       // let op: bij modifier-combo's is dit de lineId (dishId|mod1|mod2)
  name: string;         // inclusief modifier-namen, bijv. "Tosti (Tomaat, Spek)"
  price: number;        // prijs inclusief geselecteerde modifiers
  qty: number;
  modifiers?: { id: string; name: string; price: number }[]; // gekozen modifiers
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
};