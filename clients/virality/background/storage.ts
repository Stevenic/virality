import * as LocalStorage from './localStorage';
import * as Location from './location';
import * as ExpoLocation from 'expo-location';

// Table names
const APPLICATION_TABLE = 'application';
const LOCATION_LOG_TABLE = 'location-log';

// Cached table handles
let _applicationTable: LocalStorage.LocalTableDef;
let _locationLog: LocalStorage.LocalTableDef;

// Default settings
let _defaultSettings: ApplicationSettings;

export interface LocationLogEntry extends Location.LocationInfo {
    /**
     * Records unique ID within the log.
     */
    id: string;

    /**
     * Name of the location.
     */
    where: string;

    /**
     * (Optional) who were you with?
     */
    with?: string;
}

export interface ApplicationSettings {
    /**
     * ID of the settings record in storage.
     */
    id: string;

    /**
     * If `true`, location tracking will be used to automatically create log
     * entries for the user in the background. Defaults to a value of 'false'. 
     */
    trackingEnabled: boolean;
}

/**
 * Initializes the storage system and starts listening for location changes.
 * @param defaultSettings The default settings to use for a new user.
 */
export async function start(defaultSettings: ApplicationSettings): Promise<void> {
    _defaultSettings = defaultSettings;

    // Define local tables
    await LocalStorage.defineTable(APPLICATION_TABLE);
    await LocalStorage.defineTable(LOCATION_LOG_TABLE, { 
        'timestamp': { ascending: false }
    });

    // Open local tables
    _applicationTable = await LocalStorage.openTable(APPLICATION_TABLE);
    _locationLog = await LocalStorage.openTable(LOCATION_LOG_TABLE);

    // Subscribe to location changes
    Location.subscribeToChanges(async (location) => await handleLocationChanged(location));
}

/**
 * Returns the apps current settings.
 * @remarks
 * This will get automatically updated with default values should new settings
 * be added in the future.
 */
export async function getSettings(): Promise<ApplicationSettings> {
    // Return a merge of the currently persisted settings (if any) with the 
    // defaults. This will ensure that new settings added during application updates
    // won't get dropped.
    const settings = await LocalStorage.getItem(_applicationTable, _defaultSettings.id);
    return Object.assign({}, _defaultSettings, settings);
}

/**
 * Saves any changes to the apps settings to storage.
 * @param settings Current settings to persist.
 */
export async function updateSettings(settings: ApplicationSettings): Promise<void> {
    await LocalStorage.setItem(_applicationTable, settings);
}

/**
 * Returns a paginated list of location log entries to the UI.
 * @param count Number of items per page.
 * @param continuation (Optional) continuation token.
 */
export async function listLog(count: number, continuation?: string): Promise<LocalStorage.StorageResults<LocationLogEntry>> {
    return await LocalStorage.listItems(_locationLog, 'timestamp', count, continuation);
}

/**
 * Inserts or replaces an entry in the log.
 * @remarks
 * For new entries a unique ID will be automatically assigned.
 * @param entry Log entry to save.
 */
export async function upsertLogEntry(entry: Partial<LocationLogEntry>): Promise<void> {
    // Ensure required fields populated
    if (entry.timestamp == undefined) { entry.timestamp = new Date().getTime() }
    return await LocalStorage.setItem(_locationLog, entry);
}

/**
 * Gets an existing entry from the log given it's ID.
 * @param id ID of the entry to fetch.
 */
export async function getLogEntry(id: string): Promise<LocationLogEntry> {
    return await LocalStorage.getItem(_locationLog, id);
}

/**
 * Removes an existing entry from the log.
 * @param id ID of the entry to remove.
 */
export async function removeLogEntry(id: string): Promise<void> {
    return await LocalStorage.removeItem(_locationLog, id);
}

async function handleLocationChanged(location: Location.LocationInfo): Promise<void> {
    // We could be just starting so lets make sure the initial location
    // reported to us isn't a duplicate of where we think we already are.
    // - The exception to this rule is that allow the creation of a new entry
    //   after 24 hours.
    const entries = await listLog(1);
    if (entries.items.length == 1) {
        const cur = entries.items[0];
        if (Location.compareLocations(cur, location)) {
            const timeDelta = location.timestamp - cur.timestamp;
            if (timeDelta < 1000 * 60 * 60 * 24) {
                // Ignore change
                return;
            }
        }
    }

    // Populate where field
    let where: string = '';
    const address = location.address || {} as ExpoLocation.Address ;
    if (address.name) {
        where = `${address.name}`;
    } else if (address.street) {
        where = `${address.street}`;
    } else {
        where = '<unknown location>';
    }
    if (address.city) {
        where += `, ${address.city}`;
    }
    if (address.region) {
        where += `, ${address.region.toUpperCase()}`;
    }

    // Add new entry to log
    const entry: Partial<LocationLogEntry> = Object.assign({ where: where }, location);
    await upsertLogEntry(entry);
}
