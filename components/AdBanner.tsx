import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';

/**
 * A placeholder banner component that can be safely used without causing errors.
 * When you're ready to implement real ads, replace this with the actual AdMob implementation.
 */
const AdBanner: React.FC = () => {
  // For web or during development, just render a placeholder
  return <View style={styles.placeholder} />;
};

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    height: 50, // Standard banner height
    backgroundColor: 'transparent',
  },
});

export default AdBanner; 