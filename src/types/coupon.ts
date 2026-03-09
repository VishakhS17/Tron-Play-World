export type Coupon = {
  _id: string;
  name: string;
  code: string;
  discount: number;
  maxRedemptions: number;
  timesRedemed: number;
};
