// AdBanner.tsx
import React from 'react';
import { Platform, View } from 'react-native';

let BannerAd: any, BannerAdSize: any, TestIds: any;
if (Platform.OS !== 'web') {
  const googleAds = require('react-native-google-mobile-ads');
  BannerAd = googleAds.BannerAd;
  BannerAdSize = googleAds.BannerAdSize;
  TestIds = googleAds.TestIds;
}

const AdBanner: React.FC = () => {
  if (Platform.OS === 'web') {
    // Optionally show a placeholder on web
    return <View style={{ height: 50 }} />;
  }

  const adUnitId = Platform.select({
    ios: 'ca-app-pub-7230381744219330/3300187380',
    android: 'ca-app-pub-7230381744219330/1959185553',
  });

  return (
    <BannerAd
      unitId={__DEV__ ? TestIds.BANNER : adUnitId!}
      size={BannerAdSize.FULL_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: false,
      }}
      onAdFailedToLoad={(error: any) => {
        console.log('Ad load error:', error);
      }}
    />
  );
};

export default AdBanner;
