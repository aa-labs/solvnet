import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const { authenticated, user, login, logout } = usePrivy();
  const location = useLocation();

  return (
    <nav className="bg-[#f6fefd] border-b-2 border-[#88AB8E] h-16 shadow-md">
      <div className="container mx-auto px-4 h-full flex justify-between items-center">
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <img
              src="/placeholder.svg"
              alt="SolvNet Logo"
              className="h-8 w-8"
            />
            <span className="text-xl font-bold">SolvNet</span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {authenticated && (
            <>
              <Link
                to="/"
                className={`text-sm font-bold ${
                  location.pathname === "/" ? "border-b border-primary" : ""
                }`}
              >
                User
              </Link>
              <Link
                to="/solver"
                className={`text-sm font-bold ${
                  location.pathname === "/solver"
                    ? "border-b border-primary"
                    : ""
                }`}
              >
                Solver
              </Link>
            </>
          )}

          {authenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {user?.wallet?.address?.slice(0, 6)}...
                  {user?.wallet?.address?.slice(-4)}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(user?.wallet?.address || "")
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={login}>Connect Wallet</Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
