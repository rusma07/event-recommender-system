import React from 'react';
import AppRoutes from './routes/AppRoutes';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';


const App = () => (
  <>
    <Navbar />
    
    <main>
      <AppRoutes />
    </main>
    <Footer />
  </>
);

export default App;