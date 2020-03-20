# Virality
Mobile app to assist with tracking the spread of viruses like COVID-19.

## Running Client
The client uses a service called [Expo](http://expo.io) to automate the building, packaging, and deployment of Virality for iOS & Android.  To get started install the latest version of [Node.js](http://https://nodejs.org) and run the following commands from your preferred source directory:

```
npm install git -g
npm install expo-cli -g
npm install yarn -g
git clone https://github.com/Stevenic/virality.git
cd virality/clients/virality
yarn install
yarn start
```

This will establish a tunnel between your desktop machine and the Expo build server. A QR code will be displayed which you can scan using your phones camera to deploy the app to your phone.
