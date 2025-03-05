import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecordDetailDialogParams } from "./medilog-record-detail-dialog";
import { Utils } from "./utils";
dayjs.extend(duration);



@customElement("medilog-person-detail")
export class MedilogPersonDetail extends LitElement {
    private _person?: PersonInfo
    @property({ attribute: false }) public set person(value: PersonInfo) {
        const prevPerson = this._person;
        this._person = value;
        if (prevPerson !== value)
            this.fetchRecords();
    }
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _records: MedilogRecord[] = [];

    connectedCallback() {
        super.connectedCallback();
        this.fetchRecords();
    }

    private async fetchRecords(): Promise<void> {
        if (!this.hass) return;

        try {
            if (!this._person || !this._person.entity_id) {
                console.warn("Cannot fetch records: person is undefined or missing entity_id");
                return;
            }

            const response = await this.hass.callService('medilog', 'get_records', { person_id: this._person.entity_id }, {}, true, true);
            if (response && response.response.records) {
                this._records = (response.response.records as MedilogRecordRaw[]).map(record => ({
                    ...record,
                    datetime: dayjs(record.datetime)
                })).sort((a, b) => b.datetime.diff(a.datetime));
            }
        } catch (error) {
            console.error("Error fetching records:", error);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    static styles = css`
        .record-table {
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        
        .record-table th {
            text-align: left;
            padding: 8px 16px;
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
            color: var(--secondary-text-color);
            font-weight: 500;
        }
        
        .record-table td {
            padding: 8px 16px;
            border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        }
        
        .record-table tbody tr {
            cursor: pointer;
        }
        
        .record-table tbody tr:hover {
            background-color: var(--primary-color);
            color: var(--text-primary-color);
        }
        
        ha-button {
            margin-top: 8px;
        }
    `
    
    render() {
        if (!this._person) {
            return "Person is not defined";
        }

        return html`
            <table class="record-table">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Before</th>
                        <th>Temperature</th>
                        <th>Medication</th>
                    </tr>
                </thead>
                <tbody>
                    ${this._records.map(record => html`
                        <tr @click=${() => this.showRecordDetailsDialog(record)}>
                            <td>${record.datetime.format('YYYY-MM-DD HH:mm')}</td>
                            <td>${Utils.formatDurationFromTo(record.datetime)}</td>
                            <td>${record.temperature ? `${record.temperature} °C` : '-'}</td>
                            <td>${record.pill || 'None'}</td>
                        </tr>
                    `)}
                </tbody>
            </table>

            <ha-button @click=${this.addNewRecord}>Add New Record</ha-button>
        `
    }

    private dialogClosed(changed: boolean) {
        if (changed) {
            this.fetchRecords();
        }
    }

    private addNewRecord() {
        this.showRecordDetailsDialog({
            datetime: dayjs(),
            temperature: 36.7,
            pill: '',
            note: ''
        });
    }

    private showRecordDetailsDialog(record: MedilogRecord) {
        showMedilogRecordDetailDialog(this, {
            record: record,
            personId: this._person?.entity_id || '',
            closed: this.dialogClosed.bind(this)
        });
    }

}

function showMedilogRecordDetailDialog(element: HTMLElement, params: MedilogRecordDetailDialogParams) {
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