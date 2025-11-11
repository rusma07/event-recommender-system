import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./App";
import "./main.css";
import AuthProvider from "./context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { store } from "./store";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}yes> 
            <App />
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
