# Setup Guide

How to get the entire stack running locally on your dev machine.

## 1. Backend API
The Node.js backend that orchestrates everything.
```bash
cd backend
npm install
npm start
```

## 2. ML Sidecar
The python ML service that runs inference.
```bash
cd ml
pip install -r requirements.txt
python app.py
```

## 3. Mobile App (React Native / Expo)
The cross-platform mobile application.

First, install standard dependencies:
```bash
cd mobile
npm install
```

Next, ensure native dependencies are installed properly for Expo:
```bash
npx expo install react-native-svg @react-native-async-storage/async-storage
```

**Configuration:**
You must point the mobile app to your local backend. Open `mobile/app.json` and ensure `expo.extra.apiBaseUrl` points to your dev machine's local network IP address (e.g., `http://192.168.1.100:3000`). Do not use `localhost` if you are testing on a physical device.

Finally, start the Expo bundler:
```bash
npm start
```
Scan the QR code with Expo Go on your phone to run the app.
