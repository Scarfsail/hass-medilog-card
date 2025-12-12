import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecord, MedilogRecordRaw, MedilogRecordsGroupByTime } from "./models";
import { Utils } from "./utils";
import dayjs from "dayjs";

/**
 * Container class for medilog records for a specific person.
 * Maintains both the flat list and grouped views of records.
 * Handles CRUD operations and automatically refreshes data.
 */
export class MedilogPersonRecordsStore {
    private _all: MedilogRecord[] = [];
    private _grouped: MedilogRecordsGroupByTime[] = [];
    private _personEntity: string;
    private _hass: HomeAssistant;
    private _onRecordsChanged: () => void;

    constructor(personEntity: string, hass: HomeAssistant, onRecordsChanged: () => void) {
        this._personEntity = personEntity;
        this._hass = hass;
        this._onRecordsChanged = onRecordsChanged;
    }

    /**
     * Get all records as a flat array
     */
    get all(): MedilogRecord[] {
        return this._all;
    }

    /**
     * Get records grouped by time periods
     */
    get grouped(): MedilogRecordsGroupByTime[] {
        return this._grouped;
    }

    /**
     * Get the person entity this store is for
     */
    get personEntity(): string {
        return this._personEntity;
    }

    /**
     * Fetch records from the backend and update the store
     */
    async fetch(): Promise<void> {
        try {
            const response = await this._hass.callService('medilog', 'get_records', 
                { person_id: this._personEntity }, 
                {}, 
                true, 
                true
            );
            
            if (response && response.response.records) {
                const records = (response.response.records as MedilogRecordRaw[])
                    .map(record => Utils.convertMedilogRecordRawToMedilogRecord(record)!)
                    .sort((a, b) => b.datetime.diff(a.datetime));

                this._updateRecords(records);
            }
        } catch (error) {
            console.error(`Error fetching records for person ${this._personEntity}:`, error);
        }
    }

    /**
     * Add a new record for this person
     */
    async addRecord(record: MedilogRecord): Promise<void> {
        try {
            await this._hass.callService('medilog', 'add_or_update_record', {
                id: undefined,
                datetime: record.datetime.toISOString(),
                temperature: record.temperature,
                medication_id: record.medication_id,
                medication_amount: record.medication_amount,
                note: record.note?.trim(),
                person_id: this._personEntity
            } as MedilogRecordRaw, {}, true, false);
            
            // Refresh data after successful add
            await this.fetch();
        } catch (error) {
            console.error(`Error adding record for person ${this._personEntity}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing record for this person
     */
    async updateRecord(record: MedilogRecord): Promise<void> {
        try {
            await this._hass.callService('medilog', 'add_or_update_record', {
                id: record.id,
                datetime: record.datetime.toISOString(),
                temperature: record.temperature,
                medication_id: record.medication_id,
                medication_amount: record.medication_amount,
                note: record.note?.trim(),
                person_id: this._personEntity
            } as MedilogRecordRaw, {}, true, false);
            
            // Refresh data after successful update
            await this.fetch();
        } catch (error) {
            console.error(`Error updating record for person ${this._personEntity}:`, error);
            throw error;
        }
    }

    /**
     * Delete a record for this person
     */
    async deleteRecord(recordId: string): Promise<void> {
        try {
            await this._hass.callService('medilog', 'delete_record', {
                person_id: this._personEntity,
                id: recordId,
            }, {}, true, false);
            
            // Refresh data after successful delete
            await this.fetch();
        } catch (error) {
            console.error(`Error deleting record for person ${this._personEntity}:`, error);
            throw error;
        }
    }

    /**
     * Update the internal records and rebuild grouped view
     */
    private _updateRecords(records: MedilogRecord[]): void {
        this._all = records;
        this._grouped = this._groupRecordsByPeriods(records);
        this._onRecordsChanged();
    }

    /**
     * Group records by time periods (multi-day gaps create new groups)
     */
    private _groupRecordsByPeriods(records: MedilogRecord[]): MedilogRecordsGroupByTime[] {
        const groups: MedilogRecordsGroupByTime[] = [];
        let prevTime: dayjs.Dayjs | null = null;
        
        for (const record of records) {
            const recordTime = dayjs(record.datetime);
            
            // Create a new group if this is the first record or there's a gap of more than 1 day
            if (prevTime == null || prevTime.diff(recordTime, "days") > 1) {
                groups.push({
                    from: null,
                    to: recordTime,
                    records: []
                })
            }
            
            const lastGroup = groups[groups.length - 1]
            
            // Add a day separator (null) if the day changes within a group
            if (prevTime != null && prevTime.day() != recordTime.day() && lastGroup.records.length > 0) {
                lastGroup.records.push(null);
            }
            
            prevTime = recordTime;
            lastGroup.records.push(record);
            lastGroup.from = prevTime;
        }

        return groups;
    }

}
