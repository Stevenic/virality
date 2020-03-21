import * as Permissions from 'expo-permissions';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Task } from 'react-native';

const subscriptions: Map<Symbol, LocationSubscriptionCallback> = new Map();
let lastLocation: Location.LocationData = undefined;

export type LocationSubscriptionCallback = (location: Location.LocationData, error: Error) => void;
export type CancelLocationSubscription = () => void;

export const TASK_HANDLER: Task = async ({ data, error }) => {
    // Notify subscribers
    if (!data) { data = {} }
    const locations: Location.LocationData[] = data['locations'] || [];
    if (locations.length > 0) { lastLocation = locations[0] }
    subscriptions.forEach(subscriber => {
        subscriber(lastLocation, error ? new Error(error.message) : undefined);
    });
}

export async function start(taskName: string): Promise<boolean> {
    // Prompt user for background location access
    const { status, permissions } = await Permissions.askAsync(Permissions.LOCATION);
    if (status != 'granted' || (Platform.OS == 'ios' && permissions.location.ios.scope != 'always')) {
        return false;
    }
    
    // Start location tracking
    await Location.startLocationUpdatesAsync(taskName, {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 10,
        pausesUpdatesAutomatically: true,
        activityType: Location.ActivityType.Other
    });
}

export function subscribe(callback: LocationSubscriptionCallback): CancelLocationSubscription {
    const key = Symbol('subscription');
    subscriptions.set(key, callback);
    if (lastLocation) {
        callback(lastLocation, undefined);
    }
    return () => {
        subscriptions.delete(key);
    }
}





