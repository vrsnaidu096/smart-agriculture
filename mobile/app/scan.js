import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { getCurrentLocation } from '../services/location';
import { analyzeCrop } from '../services/api';

export default function ScanScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState([]); // Changed to array
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && cameraReady && photos.length < 4) {
      const options = { quality: 0.7, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhotos([...photos, data]);
    }
  };

  const retakePictures = () => {
    setPhotos([]);
  };

  const handleAnalyze = async () => {
    if (photos.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const location = await getCurrentLocation();
      
      const payload = {
        images: photos.map(p => `data:image/jpeg;base64,${p.base64}`),
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        farmId: 1, 
        cropName: selectedCrop,
        language: 'en'
      };

      const result = await analyzeCrop(payload);
      setIsAnalyzing(false);

      if (result.data?.error) {
        Alert.alert('Invalid Images', result.data.message);
        return;
      }
      
      Alert.alert('Analysis Complete', `Crop: ${result.data?.disease?.crop}\nDisease: ${result.data?.disease?.disease || 'Unknown'}\nRisk Level: ${result.data?.risk?.riskLevel || 'N/A'}\n\nAdvice: ${result.data?.recommendation}`);
      
    } catch (error) {
      setIsAnalyzing(false);
      Alert.alert('Error', 'Failed to analyze crops. Please ensure backend is running.');
      console.error(error);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cropSelector}>
        <TouchableOpacity 
          style={[styles.cropButton, selectedCrop === 'Rice' && styles.cropButtonActive]} 
          onPress={() => setSelectedCrop('Rice')}
        >
          <Text style={styles.cropButtonText}>Rice</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.cropButton, selectedCrop === 'Sugarcane' && styles.cropButtonActive]} 
          onPress={() => setSelectedCrop('Sugarcane')}
        >
          <Text style={styles.cropButtonText}>Sugarcane</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing="back" 
          ref={cameraRef}
          onCameraReady={() => setCameraReady(true)}
        >
          <View style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.photoCount}>{photos.length}/4 Captured</Text>
            {photos.length < 4 && (
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      </View>

      {photos.length > 0 && (
        <View style={styles.bottomControls}>
          <View style={styles.thumbnails}>
            {photos.map((p, index) => (
              <Image key={index} source={{ uri: p.uri }} style={styles.thumbnailImg} />
            ))}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={retakePictures}>
              <Text style={styles.buttonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleAnalyze} disabled={isAnalyzing}>
              <Text style={styles.buttonText}>{isAnalyzing ? 'Analyzing...' : `Analyze ${photos.length}`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#27AE60',
    backgroundColor: 'transparent',
    marginBottom: 50,
  },
  captureButton: {
    position: 'absolute',
    bottom: 50,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  preview: {
    flex: 1,
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#27AE60',
    padding: 15,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#95A5A6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cropSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 50,
    paddingBottom: 20,
  },
  cropButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'white',
  },
  cropButtonActive: {
    backgroundColor: '#27AE60',
    borderColor: '#27AE60',
  },
  cropButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
  },
  photoCount: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    top: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 10,
  },
  bottomControls: {
    backgroundColor: 'white',
    padding: 20,
  },
  thumbnails: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  thumbnailImg: {
    width: 60,
    height: 60,
    marginHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#27AE60',
  }
});
