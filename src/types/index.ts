export type Dish = {
  id: string;
  name: string;
  image: string;
  price: number;
};

// Elk order bestaat uit items (welk gerecht + aantal)
export type OrderItem = {
  dishId: string;
  qty: number;
};

// Status van een bestelling
export type OrderStatus = "in voorbereiding" | "klaar" | "geserveerd";

// Een bestelling (tafelnummer + gerechten + status)
export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  status: OrderStatus;
  timestamp: number;
};
