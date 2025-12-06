import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, MedilogRecordsGroupByTime, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecordDetailDialogParams } from "./medilog-record-detail-dialog";
import { Utils } from "./utils";
import { getLocalizeFunction } from "./localize/localize";

@customElement("medilog-records-table")
export class MedilogRecordsTable extends LitElement {
    @property({ attribute: false }) public person?: PersonInfo
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public allRecords?: MedilogRecord[]
    @property({ attribute: false }) public records?: (MedilogRecord | null)[];

    static styles = css`
        .record-table {
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        
        .record-table th {
            text-align: center;
            padding: 8px 16px;
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
            color: var(--secondary-text-color);
            font-weight: 500;
        }
        
        .record-table td {
            padding: 8px 16px;
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
            text-align: center;
        }
        
        .record-table tbody tr:not(.day-separator) td:first-child {
            border-bottom: none;
        }
        
        .record-table tbody tr {
            cursor: pointer;
        }
        
        .record-table tbody tr:hover {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
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
    `

    render() {
        if (!this.person) {
            return "Person is not defined";
        }

        if (!this.records) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
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
                                <td>${record.medication ? `${record.medication}${record.medication_amount && record.medication_amount > 1 ? ` (${record.medication_amount})` : ''}` : '-'}</td>
                                <td>${record.temperature ? `${record.temperature} °C` : '-'}</td>
                            </tr>
                        `;
                    })}
                </tbody>
            </table>
        `
    }

    private showRecordDetailsDialog(record: MedilogRecord) {
        showMedilogRecordDetailDialog(this, {
            record: record,
            personId: this.person?.entity || '',
            allRecords: this.allRecords,
            closed: this.dialogClosed.bind(this)
        });
    }

    private dialogClosed(changed: boolean) {
        if (changed) {
            // Fire a custom event to notify parent components that records have been changed
            this.dispatchEvent(new CustomEvent("records-changed", {
                bubbles: true,
                composed: true,
                detail: { personId: this.person?.entity }
            }));

        }
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
