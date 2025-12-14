
import { useNavigate } from "react-router-dom";
import Recommendatons from "../HomeEventShow/EventExample";

const Home = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/login");
  };

  return (
    <>
      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center text-center pt-20 bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 relative overflow-hidden">
        <img
          src="/assets/Tech_events__1_-removebg-preview.png"
          alt="Tech Events"
          className="h-52 w-52 mb-6"
        />
        <h1 className="text-4xl md:text-5xl font-semibold mb-4 text-sky-500 tracking-wide">
          Your Next Meetup Awaits!
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mb-8 text-slate-300">
          Be part of 100+ local events and communities. Connect, learn, and
          engage with fellow innovators and enthusiasts.
        </p>
        <button
          onClick={handleGetStarted}
          className="px-6 py-1 text-lg font-semibold bg-green-500 text-slate-900 rounded-lg shadow-md hover:bg-green-600 hover:text-white transition duration-300"
        >
          Get Started
        </button>
      </section>

      {/* Events Demo Section */}
      <section id="about" className=" bg-slate-50 text-slate-900">
       <Recommendatons userId={1} />
      </section>
    </>
  );
};

export default Home;
