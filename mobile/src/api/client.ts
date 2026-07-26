import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In development, you might use your local machine's IP address if testing on a physical device.
// e.g., 'http://172.16.9.3:8000'
// You can also use an ngrok URL here if you prefer.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface Holding {
  id: string;
  ticker: string;
  company_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl_absolute: number;
  pnl_percent: number;
  day_change_absolute: number;
  day_change_percent: number;
  asset_class: string;
  broker: string;
  xirr?: number;
}

export interface OtherAsset {
  id: string;
  category: string;
  name: string;
  value: number;
  currency: string;
  invested_value?: number;
  pnl_absolute?: number;
  pnl_percent?: number;
  xirr?: number;
}

export interface PortfolioState {
  holdings: Holding[];
  other_assets?: OtherAsset[];
  net_worth_inr?: number;
  net_worth_usd?: number;
  net_worth?: number;
  usd_to_inr?: number;
  day_change?: number;
  total_pnl?: number;
  day_change_percent?: number;
  total_pnl_percent?: number;
}

export const fetchPortfolio = async (email: string): Promise<PortfolioState> => {
  const response = await apiClient.get(`/portfolio/state?email=${encodeURIComponent(email)}`);
  return response.data;
};

export const loginWithGoogleToken = async (idToken: string): Promise<any> => {
  const response = await apiClient.post('/activity/auth/google', {
    id_token: idToken,
  });
  return response.data;
};

// Analysis Types
export interface TechnicalIndicators {
  return_1d?: number;
  return_1w?: number;
  return_1m?: number;
  return_1y?: number;
  trend?: string;
  rsi_14_daily?: number;
  sma_50?: number;
  sma_200?: number;
}

export interface FundamentalMetrics {
  pe_ratio?: number;
  sector?: string;
  industry?: string;
  intrinsic_value_estimate?: number;
  margin_of_safety?: number;
}

export interface SentimentAnalysis {
  overall_grade: string;
  news_grade: string;
  social_grade: string;
}

export interface VerdictRationale {
  pillar: string;
  points: string[];
}

export interface HorizonVerdict {
  horizon: string;
  recommendation: "BUY" | "HOLD" | "SELL";
  confidence_score: number;
  trend?: string;
  rationale: VerdictRationale[];
  overall_summary: string;
}

export interface StockRecommendation {
  ticker: string;
  company_name: string;
  technical: TechnicalIndicators;
  fundamental: FundamentalMetrics;
  sentiment: SentimentAnalysis;
  horizons: Record<string, HorizonVerdict>;
}

export const fetchRecommendations = async (): Promise<StockRecommendation[]> => {
  const response = await apiClient.get('/analysis/batch');
  return response.data;
};
