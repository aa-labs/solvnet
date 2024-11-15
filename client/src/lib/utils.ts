import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateAddress(address: string, length: number = 4) {
  return address.slice(0, length) + "..." + address.slice(-length);
}

export function formatSeconds(seconds: number): string {
  const units = [
    { value: 86400, label: 'day' },
    { value: 3600, label: 'hr' },
    { value: 60, label: 'min' },
    { value: 1, label: 'sec' }
  ];
 
  for (const { value, label } of units) {
    if (seconds >= value) {
      const amount = Math.floor(seconds / value);
      return `${amount} ${label}${amount > 1 ? 's' : ''}`;
    }
  }
  
  return '0 secs';
 }
