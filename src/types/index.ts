export type Modifier = {
  id: string;
  name: string;
  price: number;
};

export type ModifierGroup = {
  id: string;
  name: string;           // bv. "Broodkeuze", "Eiwitbron"
  required: boolean;      // true = moet gekozen worden voor je kunt toevoegen
  type: "single" | "multiple"; // single = radio (kies 1), multiple = checkbox (kies meerdere)
  options: Modifier[];
};

export type VatRate = 9 | 21;

export type Dish = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  vatRate?: VatRate;
  modifiers?: Modifier[];         // legacy: enkelvoudige optionele modifiers (checkbox)
  modifierGroups?: ModifierGroup[]; // nieuw: gegroepeerde modifiers met verplicht/type
};

export type OrderStatus = "Open" | "Afgehandeld" | "Betaald";

export type DiscountPercentage = 0 | 30 | 50 | 100;

export type OrderItem = {
  dishId: string;
  name: string;
  price: number;
  qty: number;
  vatRate?: VatRate;
  note?: string;
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
  paymentMethod?: "cash" | "pin";
  tip?: number;
  paidTotal?: number;
  paidAt?: number;
  discountAmount?: number;
};