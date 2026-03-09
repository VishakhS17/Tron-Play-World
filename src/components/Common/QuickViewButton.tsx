// components/QuickViewButton.tsx

import { EyeIcon } from "@/assets/icons";
import Tooltip from "./Tooltip";

const QuickViewButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Tooltip content="Quick View" placement="top">
      <button
        onClick={onClick}
        className="flex items-center justify-center h-[38px] w-[38px] rounded-lg border border-gray-200 bg-white text-dark hover:text-blue transition"
      >
        <EyeIcon />
      </button>
    </Tooltip>
  );
};

export default QuickViewButton;
