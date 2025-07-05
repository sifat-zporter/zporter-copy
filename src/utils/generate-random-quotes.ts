import { inspirationalQuotes } from '../common/constants/inspirational-quotes';

export const generateRandomQuotes = () => {
  return inspirationalQuotes[(inspirationalQuotes.length * Math.random()) | 0];
};
