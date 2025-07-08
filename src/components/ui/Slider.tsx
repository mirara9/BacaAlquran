import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  max = 100,
  min = 0,
  step = 1,
  className,
  disabled = false
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = parseFloat(event.target.value);
    onValueChange([newValue]);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div
          className="absolute h-2 bg-blue-500 rounded-full transition-all duration-150"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full -top-1 transition-all duration-150 cursor-pointer hover:scale-110"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </div>
  );
};