// AdBanner.tsx
import React from 'react';
import { Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AdBanner: React.FC = () => {
  const adUnitId = Platform.select({
    ios: 'ca-app-pub-7230381744219330/3300187380',
    android: 'ca-app-pub-7230381744219330/1959185553',
  });

  return (
    <BannerAd
      unitId={__DEV__ ? TestIds.BANNER : adUnitId!}
      size={BannerAdSize.FULL_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: false, // set to true if needed for GDPR
      }}
      onAdFailedToLoad={(error) => {
        console.log('Ad load error:', error);
      }}
    />
  );
};

export default AdBanner;
