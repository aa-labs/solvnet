import { Network } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="bg-[#FBF8EF] border-b-2 border-[#78B3CE] h-16 shadow-md">
      <div className="container mx-auto px-4 h-full flex justify-between items-center">
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <Network className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">SolvNet</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <a href="/">Dashboard</a>
          <a href="/" className="text-[#F96E2A] underline">
            Explorer
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
