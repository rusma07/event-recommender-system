import React from 'react'
// // import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Navbar from './components/Navbar.jsx';
// import Home from './pages/Home.jsx';
// import Login from './components/Login.jsx';
import './App.css';
import Recommendations from './Recommend.jsx';


export default function App() {
  return (
    // <Router>
    //   <Navbar />
    //   <div className="app-container">
    //     <Routes>
    //       <Route path="/" element={<Home />} />
    //       <Route path="/login" element={<Login />} />
    //     </Routes>
    //   </div>
    // </Router>
    <>
      
      <h1>Welcome</h1><Recommendations userId={1}/></>
  )
}
