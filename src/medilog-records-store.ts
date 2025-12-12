import type { HomeAssistant } from "../hass-frontend/src/types";
import { PersonInfo } from "./models";
import { MedilogPersonRecordsStore } from "./medilog-person-records-store";

/**
 * Container class for medilog records with lazy loading per person.
 * Returns MedilogPersonRecordsStore instances that handle their own CRUD operations.
 * This object is passed by reference, so when records are updated,
 * all components automatically see the fresh data.
 */
export class MedilogRecords {
    private _storesByPerson: Map<string, MedilogPersonRecordsStore> = new Map();
    private _hass: HomeAssistant;
    private _onRecordsChanged: () => void;

    constructor(hass: HomeAssistant, onRecordsChanged: () => void) {
        this._storesByPerson = new Map();
        this._hass = hass;
        this._onRecordsChanged = onRecordsChanged;
    }

    /**
     * Get the person records store for a specific person.
     * Lazy loads if not already cached, otherwise returns cached store.
     * Always returns a store (either freshly created or existing).
     */
    async getStoreForPerson(person: PersonInfo): Promise<MedilogPersonRecordsStore> {
        // If store exists, check if it has data
        let store = this._storesByPerson.get(person.entity);
        
        if (!store) {
            // Create new store
            store = new MedilogPersonRecordsStore(person.entity, this._hass, this._onRecordsChanged);
            await store.fetch();
            this._storesByPerson.set(person.entity, store);
        }
                
        return store;
    }

    /**
     * Get a store if already loaded, undefined otherwise.
     * Does not trigger a fetch.
     */
    getCachedStore(personEntity: string): MedilogPersonRecordsStore | undefined {
        return this._storesByPerson.get(personEntity);
    }
}
