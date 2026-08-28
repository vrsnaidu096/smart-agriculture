import * as Location from 'expo-location';

/**
 * Requests location permissions and retrieves the current GPS coordinates.
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number|null}>}
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access location was denied');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};
