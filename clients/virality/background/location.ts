import * as Permissions from 'expo-permissions';
import * as ExpoLocation from 'expo-location';
import { Platform, Task } from 'react-native';
import { getDistance } from 'geolib';

const changeSubscriptions: Map<Symbol, LocationChangeCallback> = new Map();
const errorSubscriptions: Map<Symbol, LocationErrorCallback> = new Map();
let trackingOptions: LocationTrackingOptions = undefined;
let currentLocation: LocationInfo = undefined;
let locationCache: LocationInfo[] = [];

export type LocationChangeCallback = (location: LocationInfo) => void;
export type LocationErrorCallback = (error: Error) => void;
export type CancelLocationSubscription = () => void;

export interface LocationInfo extends ExpoLocation.LocationData {
    address: ExpoLocation.Address;
}

export interface LocationTrackingOptions {
    accuracy?: ExpoLocation.Accuracy;
    timeInterval?: number;
    distanceInterval?: number;
    dwellTime?: number;
    cacheSize?: number;
    apiKey?: string;
}

export const TASK_HANDLER: Task = async ({ data, error }) => {
    if (error) {
        // Notify error subscribers
        const err = new Error(error.message);
        errorSubscriptions.forEach(callback => callback(err));
        return;
    }

    // Find address for location
    const info = data && Array.isArray(data.locations) && data.locations.length > 0 ? await findAddress(data.locations[0]) : undefined;

    // Check for change
    if (info && info.address && !compareLocations(info, currentLocation)) {
        if (currentLocation) {
            // Wait for user to dwell
            currentLocation = info;
            setTimeout(() => {
                if (compareLocations(info, currentLocation)) {
                    // Notify subscribers
                    changeSubscriptions.forEach(callback => callback(currentLocation));
                }
            }, trackingOptions.dwellTime);
        } else {
            // Notify subscribers immediately
            currentLocation = info;
            changeSubscriptions.forEach(callback => callback(currentLocation));
        }
    }
}

export async function start(taskName: string, options?: LocationTrackingOptions): Promise<boolean> {
    // Initialize options
    trackingOptions = Object.assign({
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 10,
        dwellTime: 1000 * 60 * 1,
        cacheSize: 100
    } as LocationTrackingOptions, options);

    // Update geocoding api key
    if (trackingOptions.apiKey) {
        ExpoLocation.setApiKey(trackingOptions.apiKey);
    }

    // Prompt user for background location access
    const { status, permissions } = await Permissions.askAsync(Permissions.LOCATION);
    if (status != 'granted' || (Platform.OS == 'ios' && permissions.location.ios.scope != 'always')) {
        return false;
    }

    // Start location tracking
    await ExpoLocation.startLocationUpdatesAsync(taskName, {
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 10,
        pausesUpdatesAutomatically: true,
        activityType: ExpoLocation.ActivityType.Other
    });
}

export function subscribeToChanges(callback: LocationChangeCallback): CancelLocationSubscription {
    const key = Symbol('subscription');
    changeSubscriptions.set(key, callback);
    if (currentLocation) {
        callback(currentLocation);
    }
    return () => {
        changeSubscriptions.delete(key);
    }
}

export function subscribeToErrors(callback: LocationErrorCallback): CancelLocationSubscription {
    const key = Symbol('errorSubscription');
    errorSubscriptions.set(key, callback);
    return () => {
        errorSubscriptions.delete(key);
    }
}

export function compareLocations(l1: Partial<LocationInfo>, l2: Partial<LocationInfo>): boolean {
    if (!l1 || !l2 || !l1.address || !l2.address) {
        return false;
    }
    if (l1.address.name !== l2.address.name) {
        return false;
    }
    if (l1.address.street !== l2.address.street) {
        return false;
    }
    if (l1.address.city !== l2.address.city) {
        return false;
    }
    if (l1.address.region !== l2.address.region) {
        return false;
    }
    if (l1.address.country !== l2.address.country) {
        return false;
    }

    return true;
}
async function findAddress(location: ExpoLocation.LocationData): Promise<LocationInfo> {
    // Consult location cache first
    const radius = Math.floor(trackingOptions.distanceInterval / 2);
    for (let i = 0; i < locationCache.length; i++) {
        const entry = locationCache[i];
        if (getDistance(location.coords, entry.coords) <= radius) {
            return entry;
        }
    }

    // Reverse geocode location
    const info: LocationInfo = Object.assign({ address: undefined }, location);
    const addresses = await ExpoLocation.reverseGeocodeAsync({ 
        latitude: info.coords.latitude,
        longitude: info.coords.longitude
    });
    if (Array.isArray(addresses) && addresses.length > 0) {
        info.address = addresses[0];
    }

    // Add to cache
    locationCache.push(info);
    if (locationCache.length > trackingOptions.cacheSize) {
        // Purge cache
        locationCache.shift();
    }
    return info;
}
