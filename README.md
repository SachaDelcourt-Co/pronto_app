# PRONTO Assistant

A cross-platform mobile personal assistant application built with React Native and Expo.

## Features

- User authentication and profile management
- Task management
- Appointment scheduling
- Reminders and notifications
- Notes and personal organization
- Support chat with administrators
- Motivational content

## Prerequisites

- Node.js (v16+)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode installed
- For Android: Android Studio with an emulator configured

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ProntoApp
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   or
   ```
   yarn dev
   ```

## Running on Devices

### iOS Simulator

### Android Emulator

### Web

### Physical Devices

1. Install the Expo Go app on your iOS or Android device
2. Scan the QR code displayed in your terminal after running `npm run dev`

## Building for Production

### Web

## Project Structure

- `/app`: Main application screens using Expo Router
- `/hooks`: Custom React hooks
- `/services`: Backend services
- `/types`: TypeScript type definitions
- `/utils`: Utility functions
- `/assets`: Static assets like images

## Environment Setup

This project uses Firebase. You'll need to create a `.env` file with your Firebase configuration:
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id


## Troubleshooting

- If you encounter TypeScript errors related to missing types, try running `npm install` to ensure all dependencies are correctly installed.
- For iOS build issues, try clearing the build cache: `cd ios && rm -rf build && cd ..`
- For Android build issues, try: `cd android && ./gradlew clean && cd ..`