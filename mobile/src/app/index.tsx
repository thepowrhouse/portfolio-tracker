import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { loginWithGoogleToken } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '1041866669271-gqio6aj9664bvtu9tetsckpedtjfbjk5.apps.googleusercontent.com',
    iosClientId: '1041866669271-kn9491jkgn2oqc334umgis5n27qrojs1.apps.googleusercontent.com',
  });

  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleLogin(id_token);
    } else if (response?.type === 'error') {
      Alert.alert('Authentication error', response.error?.message || 'Something went wrong');
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const data = await loginWithGoogleToken(idToken);
      
      // Store the JWT token securely
      await AsyncStorage.setItem('jwt_token', data.access_token);
      await AsyncStorage.setItem('user_email', data.email);
      
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Login Failed', error.response?.data?.detail || 'Unable to connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#111] items-center justify-center p-6">
      <View className="w-full max-w-sm bg-[#1A1A1A] rounded-3xl p-8 border border-white/10 items-center">
        <Text className="text-3xl font-bold text-white mb-2 text-center">Portfolio Tracker</Text>
        <Text className="text-gray-400 mb-8 text-center">Sign in to sync your assets</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <TouchableOpacity 
            onPress={() => promptAsync()}
            disabled={!request}
            className="bg-white rounded-xl py-4 px-6 items-center justify-center flex-row w-full"
          >
            <Text className="text-black font-semibold text-lg">Sign in with Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
