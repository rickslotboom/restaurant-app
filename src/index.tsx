import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { OrdersProvider } from "./hooks/useOrders";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <OrdersProvider>
      <App />
    </OrdersProvider>
  </React.StrictMode>
);
