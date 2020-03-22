import { AsyncStorage } from 'react-native';

export interface LocalTableDef {
    name: string;
    nextId: number;
    indexes: { [name: string]: LocalIndexDef; }
}

export interface LocalIndexDef {
    ascending?: boolean;
    numerical?: boolean;
    values?: LocalIndexKey[]; 
}

export interface LocalIndexKey {
    id: string;
    value: any;
}

export interface StorageResults {
    items: object[];
    continuation?: string;
}

/**
 * ensures that a table has been defined in local storage.
 * @param name Name of the table.
 * @param indexes (Optional) indexes to define.
 */
export async function defineTable(name: string, indexes?: { [name: string]: LocalIndexDef; }): Promise<void> {
    let table = await AsyncStorage.getItem(name);
    if (!table) {
        // Create table on first call.
        table = JSON.stringify({
            name: name,
            nextId: 1,
            indexes: indexes || {}
        } as LocalTableDef);
        await AsyncStorage.setItem(name, table);
    }
}

/**
 * Opens a previously defined table.
 * @param name Name of the existing table to open.
 */
export async function openTable(name: string): Promise<LocalTableDef> {
    let table = await AsyncStorage.getItem(name);
    if (!table) { throw new Error(`A table named '${name}' couldn't be found.`) }

    return JSON.parse(table);
}

/**
 * Returns an item from a table.
 * @remarks
 * `undefined` is returned if the item isn't found.
 * @param table Table to use.
 * @param id ID of item to get.
 */
export async function getItem(table: LocalTableDef, id: string): Promise<object> {
    const key = `${table.name}|${id}`;
    const item = await AsyncStorage.getItem(key);
    return item ? JSON.parse(item) : undefined;
}

/**
 * Saves an item to a table.
 * @remarks
 * If the item does not contain a populated 'id' field and id will be automatically
 * assigned. Additionally, the tables indexes will be automatically updated based upon
 * the indexed fields.
 * @param table Table to use.
 * @param item Item to save.
 */
export async function setItem(table: LocalTableDef, item: object): Promise<void> {
    // Assign ID if needed
    let saveTableDef = false;
    if (!item['id']) {
        item['id'] = table.nextId++;
        saveTableDef = true;
    }

    // Update table indexes
    if (updateTableIndexes(table, item)) {
        saveTableDef = true;
    }

    // Save item and optionally updated table def
    const rows: string[][] = [];
    rows.push([`${table.name}|${item['id']}`, JSON.stringify(item)]);
    if (saveTableDef) {
        rows.push([table.name, JSON.stringify(table)]);
    }
    await AsyncStorage.multiSet(rows);
}

/**
 * Deletes an item from a table.
 * @remarks
 * Any of the tables indexes will be updated. 
 * @param table Table to use.
 * @param id ID of the item to delete.
 */
export async function removeItem(table: LocalTableDef, id: string): Promise<void> {
    // Update table indexes
    let modified = false;
    for (const field in table.indexes) {
        const index = table.indexes[field];
        if (Array.isArray(index.values)) {
            for (let i = 0; i < index.values.length; i++) {
                if (index.values[i].id == id) {
                    index.values.splice(i, 1);
                    modified = true;
                    break;
                }
            }
        }
    }

    // Save updated table def
    if (modified) {
        await AsyncStorage.setItem(table.name, JSON.stringify(table));
    }

    // Delete item
    await AsyncStorage.removeItem(`${table.name}|${id}`);
}

/**
 * Fetches sorted pages of items from a table. 
 * @param table Table to use.
 * @param indexName Name of index to use for sorting.
 * @param count (Optional) number of items to retrieve. Defaults to 10.
 * @param continuation (Optional) continuation token used to fetch the next page of items.
 * @returns A results object which includes the page of items and an optional continuation token if there are additional items to retrieve.  
 */
export async function listItems(table: LocalTableDef, indexName: string, count = 10, continuation?: string): Promise<StorageResults> {
    const results: StorageResults = { items: [] };
    const startIndex = continuation ? parseInt(continuation) : 0;
    const index = table.indexes[indexName];
    if (!index) { throw new Error(`An index named '${indexName}' could not be found.`) }
    
    // Fetch next page of results
    if (Array.isArray(index.values) && startIndex < index.values.length) {
        // Build list of keys to fetch.
        const keys: string[] = [];
        let i = startIndex;
        while (i < index.values.length && count > 0) {
            keys.push(`${table.name}|${index.values[i].id}`);
            i++;
            count--;
        }

        // Fetch and deserialize items.
        const r = await AsyncStorage.multiGet(keys);
        r.forEach(v => results.items.push(JSON.parse(v[1])));

        // Add continuation token
        if (i < index.values.length) {
            results.continuation = i.toString();
        }
    }
    
    return results;
}

function updateTableIndexes(table: LocalTableDef, item: object): boolean {
    let modified = false;
    for (const field in table.indexes) {
        const index = table.indexes[field];
        let id: string = item['id'];
        let value: any = item['field'];
        const numerical = !!index.numerical;
        if (numerical && typeof value != 'number') { value = 0 }
        let newEntry = true, changed = false;
        if (Array.isArray(index.values)) {
            // Modify index if existing object            
            for (let i = 0; i < index.values.length; i++) {
                if (index.values[i].id == id) {
                    const curVal = index.values[i].value;
                    if (curVal !== value) {
                        index.values[i].value = value;
                        changed = true;
                    }
                    newEntry = false;
                    break;
                }
            }
        } else {
            index.values = [];
        }
        if (newEntry) { 
            index.values.push({ id: id, value: value });
            changed = true;
        }

        // sort index
        if (changed) {
            const ascending = !!index.ascending;
            if (numerical) {
                if (ascending) {
                    index.values = index.values.sort((a, b) => a.value - b.value);
                } else {
                    index.values = index.values.sort((a, b) => b.value - a.value);
                }
            } else {
                if (ascending) {
                    index.values = index.values.sort((a, b) => (a.value as string).localeCompare(b.value));
                } else {
                    index.values = index.values.sort((a, b) => (b.value as string).localeCompare(a.value));
                }
            }
    
            modified = true;
        }
    }

    return modified;
}