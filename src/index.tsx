import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { OrdersProvider } from "./hooks/useOrders";
import { AuthProvider } from "./hooks/useAuth";
import { MenuProvider } from "./hooks/useMenu";
import { FloorPlanProvider } from "./hooks/useFloorPlan";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <OrdersProvider>
        <MenuProvider>
          <FloorPlanProvider>
            <App />
          </FloorPlanProvider>
        </MenuProvider>
      </OrdersProvider>
    </AuthProvider>
  </React.StrictMode>
);