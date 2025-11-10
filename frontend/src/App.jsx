import React from "react";
import Navbar from "./components/Navbar/Navbar";
import AppRoutes from "./routes/AppRoutes";
import Footer from "./Layout/Footer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AboutUs from "./pages/Aboutus/Aboutus";

const App = () => (
  <>
    <Navbar />
   

    <main>
      <AppRoutes />
    </main>
      {/* <AboutUs/> */}
    <Footer />

    {/*  Toast container should be inside App once */}
    <ToastContainer position="top-right" autoClose={3000} />
  </>
);

export default App;







// import "react-toastify/dist/ReactToastify.css";
// import OnboardingPage from "./components/onboarding/onboardingPage";

//  const App = () => (
//    <>
//      <OnboardingPage/>
//    </>
//  );

// export default App;