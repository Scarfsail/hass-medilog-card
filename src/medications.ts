import type { HomeAssistant } from "../hass-frontend/src/types";
import { Medication } from "./models";

/**
 * Container class for medications with fast lookup capabilities.
 * This object is passed by reference, so when medications are updated,
 * all components automatically see the fresh data.
 */
export class Medications {
    private _medications: Medication[] = [];
    private _medicationsMap: Map<string, Medication> = new Map();
    private _hass: HomeAssistant;
    private _onMedicationsFetched: () => void;

    constructor(hass: HomeAssistant, onMedicationsFetched: () => void) {
        this._medications = [];
        this._medicationsMap = new Map();
        this._hass = hass;
        this._onMedicationsFetched = onMedicationsFetched;
    }

    async fetchMedications() {
        if (!this._hass) return;

        try {
            const response = await this._hass.callService('medilog', 'get_medications', {}, {}, true, true);
            if (response && response.response.medications) {
                // Update the Medications object - this preserves the reference
                this.update(response.response.medications as Medication[]);
                // Trigger re-render
                this._onMedicationsFetched();
            }
        } catch (error) {
            console.error("Error fetching medications:", error);
        }
    }
    /**
     * Get all medications as an array
     */
    get all(): Medication[] {
        return this._medications;
    }

    /**
     * Get the medications Map for direct access
     */
    get map(): Map<string, Medication> {
        return this._medicationsMap;
    }

    /**
     * Get a medication by ID with O(1) lookup
     */
    getMedication(id: string | undefined): Medication | undefined {
        if (!id) return undefined;
        return this._medicationsMap.get(id);
    }


    /**
     * Get medication name by ID (convenience method)
     */
    getMedicationName(id: string | undefined): string {
        if (!id) return '';
        return this._medicationsMap.get(id)?.name || '';
    }

    /**
     * Update the medications list and rebuild the Map
     * This preserves the object reference while updating the data
     */
    private update(medications: Medication[]): void {
        this._medications = medications;
        this._medicationsMap = new Map(medications.map(m => [m.id, m]));
    }

    /**
     * Get the count of medications
     */
    get count(): number {
        return this._medications.length;
    }

    /**
     * Check if a medication exists by ID
     */
    has(id: string | undefined): boolean {
        if (!id) return false;
        return this._medicationsMap.has(id);
    }
}
