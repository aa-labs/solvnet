import { BrowserRouter, Route, Switch } from "react-router-dom";
import Navbar from "@/components/main/Navbar";
import Footer from "@/components/main/Footer";
import User from "./pages/User";
import Solver from "./pages/Solver";
import { Toaster } from "@/components/ui/toaster";

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f6fefd]">
        <Navbar />
        <Switch>
          <Route exact path="/" component={User} />
          <Route path="/solver" component={Solver} />
        </Switch>
        <Footer />
        <Toaster />
      </div>
    </BrowserRouter>
  );
};

export default App;
