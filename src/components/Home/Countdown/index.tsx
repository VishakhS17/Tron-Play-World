import { getCountdowns } from '@/get-api-data/countdown';
import CountdownBanner from './CountdownBanner';

const CountDown = async () => {
  const countdown = await getCountdowns();

  return <div>{countdown && <CountdownBanner data={countdown[0]} />}</div>;
};

export default CountDown;
