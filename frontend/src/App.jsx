import React from 'react';
import Navbar from './components/Navbar/Navbar';
import AppRoutes from './routes/AppRoutes';
import Footer from './Layout/Footer';


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
