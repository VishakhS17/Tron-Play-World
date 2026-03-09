// components/ui/Tooltip.tsx
"use client";

import { useState, useRef } from "react";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
}

const Tooltip = ({ content, children, placement = "top" }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 100);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const getPositionClasses = () => {
    switch (placement) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
    }
  };

  const getArrowPosition = () => {
    switch (placement) {
      case "top":
        return "-bottom-1 left-1/2 -translate-x-1/2";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 rotate-180";
      case "left":
        return "left-full top-1/2 -translate-y-1/2 -rotate-90";
      case "right":
        return "right-full top-1/2 -translate-y-1/2 rotate-90";
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 ${getPositionClasses()} pointer-events-none`}
        >
          <div className="relative px-2 py-2 text-xs font-medium bg-white rounded-md shadow-xs text-dark whitespace-nowrap">
            {content}
            <div
              className={`absolute 
                 w-2.5 h-2.5 bg-white rotate-45 ${getArrowPosition()}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
