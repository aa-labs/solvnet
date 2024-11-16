import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, LogOut, Network, Wallet } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Link, useLocation } from "react-router-dom";
import { useSmartAccount } from "@/hooks/useSmartAccount";

const Navbar = () => {
  const { authenticated, login } = usePrivy();
  const { accountAddress, logoutSmartAccount } = useSmartAccount();
  const location = useLocation();

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

          {accountAddress ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  {accountAddress?.slice(0, 6)}...
                  {accountAddress?.slice(-4)}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(accountAddress || "")
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logoutSmartAccount}>
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
