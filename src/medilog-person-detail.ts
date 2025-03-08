import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, MedilogRecordsGroupByTime, PersonInfo, PersonInfoRaw } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecordDetailDialogParams } from "./medilog-record-detail-dialog";
import { getLocalizeFunction } from "./localize/localize";
import "./medilog-records"
import { showMedilogRecordDetailDialog } from "./medilog-records-table";
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
    @state() private _records?: {
        all: MedilogRecord[]
        grouped: MedilogRecordsGroupByTime[]
    };

    connectedCallback() {
        super.connectedCallback();
        this.fetchRecords();
    }

    private async fetchRecords(): Promise<void> {
        if (!this.hass) return;

        try {
            if (!this._person || !this._person.entity) {
                console.warn("Cannot fetch records: person is undefined or missing entity_id");
                return;
            }

            const response = await this.hass.callService('medilog', 'get_records', { person_id: this._person.entity }, {}, true, true);
            if (response && response.response.records) {
                const records = (response.response.records as MedilogRecordRaw[]).map(record => convertMedilogRecordRawToMedilogRecord(record)!).sort((a, b) => b.datetime.diff(a.datetime));

                this._records = {
                    all: records,
                    grouped: groupRecordsByPeriods(records)
                }

            }
        } catch (error) {
            console.error("Error fetching records:", error);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    static styles = css`
       
        
        ha-button {
            margin-top: 8px;
        }
        ha-expansion-panel {
            margin: 4px;
            margin-bottom: 8px;
        }
    `

    render() {
        if (!this._person) {
            return "Person is not defined";
        }
        if (!this._records) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
        }

        const localize = getLocalizeFunction(this.hass!);
        return html`
            <ha-button @click=${this.addNewRecord}>${localize('actions.add_record')}</ha-button>
            ${this._records.grouped.map((group, idx) => html`
                <ha-expansion-panel .outlined=${true} .expanded=${idx == 0} header=${group.from ? `${group.from.format('D. M. YYYY')} - ${group.to.format('D. M. YYYY')}` : group.to.format('D. M. YYYY')}>
                    <medilog-records .records=${group.records} .hass=${this.hass} .person=${this._person} @records-changed=${() => this.fetchRecords()}></medilog-records>
                </ha-expansion-panel>
            `)}
            
        `
        //<medilog-records .records=${this._records.all} .hass=${this.hass} .person=${this._person} @records-changed=${() => this.fetchRecords()}></medilog-records>
    }

    private addNewRecord() {
        showMedilogRecordDetailDialog(this, {
            personId: this._person?.entity || '',
            closed: (changed) => {
                if (changed) {
                    this.fetchRecords();
                }
            },
            record: {
                datetime: dayjs(),
                temperature: undefined,
                medication: '',
                note: ''
            }
        })

    }
}



function groupRecordsByPeriods(records: MedilogRecord[]): MedilogRecordsGroupByTime[] {
    const groups: MedilogRecordsGroupByTime[] = [];
    let prevTime: dayjs.Dayjs | null = null;
    for (const record of records) {
        const recordTime = dayjs(record.datetime);
        if (prevTime == null || prevTime.diff(recordTime, "days") > 1) {
            groups.push({
                from: null,
                to: recordTime,
                records: []
            })
        }
        const lastGroup = groups[groups.length - 1]
        if (prevTime != null && prevTime.day() != recordTime.day() && lastGroup.records.length > 0) {
            lastGroup.records.push(null);
        }
        prevTime = recordTime;
        lastGroup.records.push(record);
        lastGroup.from = prevTime;
    }

    return groups;
}

export function convertMedilogRecordRawToMedilogRecord(record: MedilogRecordRaw|null): MedilogRecord|null {
    if (!record)
        return null;

    return {
        ...record,
        datetime: dayjs(record.datetime)
    } as MedilogRecord
}