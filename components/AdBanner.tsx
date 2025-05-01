import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { AdMobBanner } from 'expo-ads-admob';

// AdMob test IDs
const TEST_BANNER_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';

// Replace these with your actual AdMob IDs when you're ready to publish
const PRODUCTION_BANNER_ID_ANDROID = 'YOUR_PRODUCTION_ANDROID_BANNER_ID';
const PRODUCTION_BANNER_ID_IOS = 'YOUR_PRODUCTION_IOS_BANNER_ID';

// Determine if we're in production mode (you may need to adjust this logic)
const isProduction = process.env.NODE_ENV === 'production';

interface AdBannerProps {
  // You can add props if needed
}

const AdBanner: React.FC<AdBannerProps> = () => {
  const [adUnitID, setAdUnitID] = useState<string>('');

  useEffect(() => {
    // Set the appropriate ad unit ID based on platform and environment
    if (Platform.OS === 'ios') {
      setAdUnitID(isProduction ? PRODUCTION_BANNER_ID_IOS : TEST_BANNER_ID_IOS);
    } else if (Platform.OS === 'android') {
      setAdUnitID(isProduction ? PRODUCTION_BANNER_ID_ANDROID : TEST_BANNER_ID_ANDROID);
    }
  }, []);

  const handleError = (error: any) => {
    console.error('AdMob Banner error: ', error);
  };

  return (
    <View style={styles.container}>
      {adUnitID ? (
        <AdMobBanner
          bannerSize="smartBannerPortrait"
          adUnitID={adUnitID}
          servePersonalizedAds={true}
          onDidFailToReceiveAdWithError={handleError}
          style={styles.banner}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  banner: {
    width: '100%',
  },
});

export default AdBanner; 