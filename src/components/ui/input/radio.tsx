import { type HTMLProps, useId } from 'react';

type PropsType = Omit<HTMLProps<HTMLInputElement>, 'label'> & {
  label: React.ReactNode;
  spacing?: number;
};

export function RadioInput({ label, spacing = 0.875, ...rest }: PropsType) {
  const id = useId();

  return (
    <div>
      <label
        htmlFor={id}
        className="flex cursor-pointer select-none items-center gap-3.5"
      >
        <input type="radio" className="peer sr-only" {...rest} id={id} />

        <span className="flex size-4 items-center justify-center rounded-full border border-gray-4 peer-checked:border-4 peer-checked:border-blue dark:border-dark-3" />

        {label}
      </label>
    </div>
  );
}
