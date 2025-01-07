'use client'
import Image from "next/image";
import {useState} from "react";
import {useCookies} from "react-cookie";

const Navbar = () => {

  const [cookies, setCookie, removeCookie] = useCookies(['name', 'pfp']);

  return (
    <div className="flex items-center justify-between p-4 bg-white shadow-md">
      {/* User Info & Profile Picture */}
      <div className="flex items-center ml-auto space-x-4">
        {/* User Info */}
        <div className="flex flex-col text-right">
          <span className="text-sm leading-3 font-medium">{cookies.name ?? "Welcome"}</span>
          <span className="text-xs text-gray-500">Scholar</span>
        </div>
        
        {/* Profile Picture */}
        <div className="relative">
          <Image
            src={cookies.pfp ?? "/logo.png"}
            alt="Profile Picture"
            width={36}
            height={36}
            className="rounded-full border border-gray-300" 
          />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
