import React from "react";
import Navbar from "./components/Navbar/Navbar";
import AppRoutes from "./routes/AppRoutes";
import Footer from "./Layout/Footer";

// import toastify css + container
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => (
  <>
    <Navbar />

    <main>
      <AppRoutes />
    </main>

    <Footer />

    {/* 🔥 Toast container should be inside App once */}
    <ToastContainer position="top-right" autoClose={3000} />
  </>
);

export default App;
