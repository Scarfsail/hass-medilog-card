import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import "./medilog-record-detail"
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

    @state() private _selectedRecord?: MedilogRecord;

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
        .record-list {
            list-style: none;
            padding: 0;
        }
        
        .record-item {
            cursor: pointer;
            padding: 8px;
            margin-bottom: 8px;
            border: 1px solid #eee;
            border-radius: 4px;
        }
        
        .record-item:hover {
            background-color: var(--primary-color);
        }

    `
    render() {
        if (!this._person) {
            return "Person is not defined";
        }


        return html`
            <div>Total Records: ${this._records.length}</div>
            <ul class="record-list">
                ${this._records.map(record => html`
                    <li class="record-item" @click=${() => this._showRecordDetails(record)}>
                        ${record.datetime} - ${record.pill || 'No medication'}
                    </li>
                `)}
            </ul>

            <medilog-record-detail .record=${this._selectedRecord} .personId=${this._person.entity_id} .hass=${this.hass} @closed=${(e: CustomEvent) => this.dialogClosed(e.detail.changed)}></medilog-record-detail>                
            <ha-button @click=${this.addNewRecord}>Add New Record</ha-button>
        `
    }
    private dialogClosed(changed: boolean) {
        this._selectedRecord = undefined;
        if (changed) {
            this.fetchRecords();
        }
    }

    private addNewRecord() {
        this._selectedRecord = {
            datetime: dayjs(),    
            temperature: 36.7,
            pill: '',
            note: ''
        };
    }
    private _showRecordDetails(record: MedilogRecord) {
        this._selectedRecord = record;
    }

}