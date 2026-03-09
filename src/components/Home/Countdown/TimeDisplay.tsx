interface TimeDisplayProps {
  value: number;
  label: string;
}

const TimeDisplay = ({ value, label }: TimeDisplayProps) => (
  <div>
    <span className="flex items-center justify-center w-16 h-16 px-4 mb-2 text-xl font-semibold bg-white rounded-lg lg:text-3xl text-dark shadow-2">
      {value < 10 ? `0${value}` : value}
    </span>
    <span className="block text-center text-custom-sm text-dark">{label}</span>
  </div>
);

export default TimeDisplay;
