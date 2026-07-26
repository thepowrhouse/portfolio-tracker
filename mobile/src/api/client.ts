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
}

export interface PortfolioState {
  holdings: Holding[];
  net_worth_inr?: number;
  net_worth_usd?: number;
  net_worth?: number;
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
