import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { Medication, MedilogRecord, MedilogRecordRaw, MedilogRecordsGroupByTime, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecordDetailDialogParams } from "./medilog-record-detail-dialog";
import { Utils } from "./utils";
import { getLocalizeFunction } from "./localize/localize";
import { sharedTableStyles } from "./shared-styles";
import { DataStore } from "./data-store";

@customElement("medilog-records-table")
export class MedilogRecordsTable extends LitElement {
    // Static styles
    static styles = [sharedTableStyles, css`
        .record-table tbody tr:not(.day-separator) td:first-child {
            border-bottom: none;
        }
        
        .day-separator {
            cursor: default;
            height: 32px;
        }
        
        .day-separator td {
            padding: 24px 0;
            cursor: default;
            position: relative;
            border-bottom: none;
        }
        
        .day-separator td:first-child {
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        }
        
        .day-separator td:not(:first-child) {
            border-bottom: none;
        }
        
        .day-separator td:not(:first-child):before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--divider-color) 0%, var(--divider-color) 70%, transparent 100%);
            border-radius: 2px;
        }
        
        .day-separator hr {
            display: none;
        }
        
        .day-separator:hover {
            background-color: transparent !important;
            color: inherit !important;
        }
        
        .date-header {
            background-color: var(--secondary-background-color);
            font-weight: bold;
            text-align: center;
            padding: 12px 16px;
            border-top: 2px solid var(--primary-color);
            border-bottom: 1px solid var(--divider-color);
            color: var(--primary-text-color);
        }
        
        .date-header:hover {
            background-color: var(--secondary-background-color) !important;
            color: var(--primary-text-color) !important;
        }
        
        .record-table tbody tr:first-child .date-header {
            border-top: none;
        }

        .temperature-cell {
            position: relative;
            padding: 0 !important;
        }

        .temperature-content {
            position: relative;
            z-index: 1;
            padding: 12px 16px;
            font-weight: 500;
        }

        .temperature-bar {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            border-radius: 2px;
            opacity: 0.3;
            transition: width 0.3s ease;
        }

        .temp-green { background-color: #4caf50; }
        .temp-orange { background-color: #ff9800; }
        .temp-light-red { background-color: #ff5722; }
        .temp-dark-red { background-color: #d32f2f; }

        .medication-content {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .antipyretic-icon {
            color: var(--primary-color);
            flex-shrink: 0;
        }

        .antipyretic-medication {
            font-weight: 500;
            color: var(--primary-color);
        }

        .record-table tbody tr:hover .antipyretic-icon,
        .record-table tbody tr:hover .antipyretic-medication {
            color: var(--text-primary-color);
        }
    `]

    // Public properties
    @property({ attribute: false }) public person?: PersonInfo
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public records?: (MedilogRecord | null)[];
    @property({ attribute: false }) public dataStore!: DataStore;

    // Render method
    render() {
        if (!this.person) {
            return "Person is not defined";
        }

        if (!this.records) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
        }

        if (!this.dataStore) {
            return "Data store is not defined";
        }
        const localize = getLocalizeFunction(this.hass!);
        const columnCount = 5; // Number of columns in the table

        return html`
            <table class="record-table"> 
               <thead>
                <tr>
                    <th><ha-icon icon="mdi:calendar"></ha-icon></th>
                    <th><ha-icon icon="mdi:clock"></ha-icon></th>
                    <th><ha-icon icon="mdi:timer-sand"></ha-icon></th>
                    <th><ha-icon icon="mdi:pill"></ha-icon></th>
                    <th><ha-icon icon="mdi:thermometer"></ha-icon></th>
                </tr>
            </thead>
                <tbody>
                    ${this.records.map((record, index) => {
                        if (record === null) {
                            return html`
                                <tr class="day-separator">
                                    <td colspan="${columnCount}">
                                        <hr />
                                    </td>
                                </tr>
                            `;
                        }
                        
                        // Check if this is the first record of the day
                        const isFirstOfDay = index === 0 || 
                            this.records![index - 1] === null || 
                            !record.datetime.isSame(this.records![index - 1]?.datetime, 'day');
                        
                        return html`
                            <tr @click=${() => this.showRecordDetailsDialog(record)}>
                                <td>${isFirstOfDay ? Utils.formatDate(record.datetime,true, false) : ''}</td>
                                <td>${record.datetime.format('HH:mm')}</td>
                                <td>${Utils.formatDurationFromTo(record.datetime)}</td>
                                <td>${this._renderMedication(record)}</td>
                                <td class="temperature-cell">
                                    ${record.temperature ? html`
                                        <div class="temperature-bar ${this._getTemperatureColorClass(record.temperature)}" 
                                             style="width: ${this._getTemperatureBarWidth(record.temperature)}%"></div>
                                        <div class="temperature-content">
                                            ${record.temperature} °C
                                        </div>
                                    ` : html`<div class="temperature-content">-</div>`}
                                </td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        `
    }

    // Private helper methods
    private getMedicationName(record: MedilogRecord): string {
        return this.dataStore.medications.getMedicationName(record.medication_id);
    }

    private _renderMedication(record: MedilogRecord) {
        const medicationName = this.getMedicationName(record);
        if (!medicationName) {
            return '-';
        }

        const medication = record.medication_id 
            ? this.dataStore.medications.getMedication(record.medication_id)
            : null;
        const isAntipyretic = medication?.is_antipyretic ?? false;
        const amount = record.medication_amount && record.medication_amount > 1 
            ? ` (${record.medication_amount})` 
            : '';

        if (isAntipyretic) {
            return html`
                <div class="medication-content">
                    <ha-icon class="antipyretic-icon" icon="mdi:thermometer-chevron-down"></ha-icon>
                    <span class="antipyretic-medication">${medicationName}${amount}</span>
                </div>
            `;
        }

        return `${medicationName}${amount}`;
    }

    private showRecordDetailsDialog(record: MedilogRecord) {
        const personStore = this.dataStore.records.getCachedStore(this.person!.entity);
        if (!personStore) {
            console.error("Person store not found for", this.person?.entity);
            return;
        }
        
        showMedilogRecordDetailDialog(this, {
            record: record,
            personStore: personStore,
            medications: this.dataStore.medications
        });
    }

    private _getTemperatureColorClass(temperature: number): string {
        if (temperature < 37) return 'temp-green';
        if (temperature < 38) return 'temp-orange';
        if (temperature < 39) return 'temp-light-red';
        return 'temp-dark-red';
    }

    private _getTemperatureBarWidth(temperature: number): number {
        const minTemp = 36.5;
        const maxTemp = 40;
        const clampedTemp = Math.max(minTemp, Math.min(maxTemp, temperature));
        const width = ((clampedTemp - minTemp) / (maxTemp - minTemp)) * 100;
        return Math.max(3, width); // Always show at least 3% bar width
    }
}

export function showMedilogRecordDetailDialog(element: HTMLElement, params: MedilogRecordDetailDialogParams) {
    const event = new CustomEvent("show-dialog", {
        bubbles: true,
        composed: true,
        detail: {
            dialogTag: "medilog-record-detail-dialog",
            dialogImport: () => import("./medilog-record-detail-dialog"),
            dialogParams: params
        }
    });
    element.dispatchEvent(event);
}
