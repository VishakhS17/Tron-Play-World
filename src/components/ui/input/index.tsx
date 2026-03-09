import cn from "@/utils/cn";
import { useId, type HTMLProps } from "react";

type PropsType = Omit<HTMLProps<HTMLInputElement>, "label"> & {
  label: string;
  required?: boolean;
  errorMessage?: string;
  error?: boolean;
};

export function InputGroup({
  label,
  className,
  error,
  errorMessage,
  ...props
}: PropsType) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-normal text-gray-6 mb-1.5"
      >
        {label} {props?.required && <span className="text-red">*</span>}
      </label>

      <input
        id={id}
        {...props}
        className={cn(
          "rounded-lg border placeholder:text-sm text-sm placeholder:font-normal border-gray-3 h-11  focus:border-blue focus:outline-0  placeholder:text-dark-5 w-full  py-2.5 px-4 duration-200  focus:ring-0",
          className,
          {
            "border-red": error,
          }
        )}
      />

      {error && <p className="text-sm text-red mt-1.5">{errorMessage}</p>}
    </div>
  );
}
