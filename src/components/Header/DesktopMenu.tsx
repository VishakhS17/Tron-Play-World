"use client";

import Link from "next/link";
import { useState } from "react";
import type { MenuItem } from "./types";
import { usePathname } from "next/navigation";

interface DesktopMenuProps {
  menuData: MenuItem[];
}

const DesktopMenu = ({ menuData }: DesktopMenuProps) => {
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const pathname = usePathname();

  const handleMouseEnter = (index: number) => {
    setActiveDropdown(index);
  };

  const handleMouseLeave = () => {
    setActiveDropdown(null);
  };

  return (
    <nav>
      <ul className="flex items-center gap-6">
        {menuData.map((menuItem, i) => (
          <li
            key={i}
            className="relative group"
            onMouseEnter={() => handleMouseEnter(i)}
            onMouseLeave={handleMouseLeave}
          >
            {menuItem.submenu ? (
              <>
                <button
                  className={`flex items-center gap-1 hover:text-blue font-medium py-4 relative text-sm font-medium ${menuItem.submenu?.some(subItem => pathname === subItem.path) ? "text-blue" : "text-dark"}`}
                >
                  {menuItem.title}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 ${activeDropdown === i ? "rotate-180" : ""
                      }`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute left-0 border border-gray-2 top-full bg-white shadow-lg rounded-lg p-2 min-w-[220px] z-50 transform transition-all duration-200 ${activeDropdown === i
                      ? "opacity-100 translate-y-0 visible"
                      : "opacity-0 translate-y-2 invisible"
                    }`}
                >
                  {menuItem.submenu.map((subItem, j) => (
                    <Link
                      key={j}
                      href={subItem.path || "#"}
                      className={`block px-4 py-2 text-sm font-medium rounded-lg hover:text-blue hover:bg-gray-2 ${subItem.path && pathname.split('?')[0] === subItem.path.split('?')[0] ? "text-blue" : "text-dark"}`}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <Link
                href={menuItem.path || "#"}
                className={`hover:text-blue font-medium py-4 block relative text-sm ${menuItem.path && pathname.split('?')[0] === menuItem.path.split('?')[0] ? "text-blue" : "text-dark"}`}
              >
                {menuItem.title}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default DesktopMenu;
