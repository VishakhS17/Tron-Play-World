export function calculateDiscountPercentage(
    discountedPrice: number,
    originalPrice: number
  ): number {
    if (originalPrice <= 0 || discountedPrice < 0) return 0;
  
    const discount = ((originalPrice - discountedPrice) / originalPrice) * 100;
    return Math.round(discount); // Returns whole number like 30 for 30%
  }
  