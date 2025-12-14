import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, MedilogRecordsGroupByTime, PersonInfo, PersonInfoRaw, Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { MedilogRecordDetailDialogParams } from "./medilog-record-detail-dialog";
import { getLocalizeFunction } from "./localize/localize";
import "./medilog-records"
import "./medilog-records-medications"
import { showMedilogRecordDetailDialog } from "./medilog-records-table";
import { Utils } from "./utils";
import { DataStore } from "./data-store";
import { MedilogPersonRecordsStore } from "./medilog-person-records-store";
dayjs.extend(duration);

@customElement("medilog-person-detail")
export class MedilogPersonDetail extends LitElement {
    // Static styles
    static styles = css`
        .controls {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            align-items: center;
        }
        
        .view-toggle {
            display: flex;
            gap: 4px;
            flex: 1;
        }
        
        ha-button {
            margin-top: 8px;
        }
        ha-expansion-panel {
            margin: 4px;
            margin-bottom: 8px;
        }
    `

    // Private properties
    private _person?: PersonInfo
    private _personStore?: MedilogPersonRecordsStore

    // Public properties
    @property({ attribute: false }) public set person(value: PersonInfo) {
        const prevPerson = this._person;
        this._person = value;
        if (prevPerson !== value)
            this.loadPersonStore();
    }
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public dataStore!: DataStore;

    // State properties
    @state() private viewMode: 'timeline' | 'medications' = 'timeline';

    // Lifecycle methods
    connectedCallback() {
        super.connectedCallback();
        this.loadPersonStore();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    // Render method
    render() {
        if (!this._person) {
            return "Person is not defined";
        }
        if (!this._personStore) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
        }

        const localize = getLocalizeFunction(this.hass!);
        return html`
            <div class="controls">
                <div class="view-toggle">
                    <ha-button .appearance=${this.viewMode === 'timeline' ? 'accent' : 'plain'} @click=${() => this.viewMode = 'timeline'}>
                        <ha-icon icon="mdi:timeline-clock"></ha-icon>
                    </ha-button>
                    <ha-button .appearance=${this.viewMode === 'medications' ? 'accent' : 'plain'} @click=${() => this.viewMode = 'medications'}>
                        <ha-icon icon="mdi:pill-multiple"></ha-icon>
                    </ha-button>
                </div>
                <ha-button @click=${this.addNewRecord} appearance='plain'>
                    <ha-icon icon="mdi:plus"></ha-icon> 
                </ha-button>
            </div>
            
            ${this.viewMode === 'timeline' ? html`
                ${this._personStore.grouped.map((group, idx) => html`
                    <ha-expansion-panel .outlined=${true} .expanded=${idx == 0} header=${group.from ? `${Utils.formatDate(group.from)} - ${Utils.formatDate(group.to)}` : Utils.formatDate(group.to)}>
                        <medilog-records .records=${group.records} .hass=${this.hass} .person=${this._person} .dataStore=${this.dataStore}></medilog-records>
                    </ha-expansion-panel>
                `)}
            ` : html`
                <medilog-records-medications .records=${this._personStore.all} .hass=${this.hass} .person=${this._person} .dataStore=${this.dataStore}></medilog-records-medications>
            `}
        `
    }

    // Private helper methods
    private async loadPersonStore(): Promise<void> {
        if (!this.hass || !this._person || !this.dataStore) return;

        try {
            if (!this._person.entity) {
                console.warn("Cannot load records: person is missing entity_id");
                return;
            }

            // Get the store for this person (lazy loads if needed)
            this._personStore = await this.dataStore.records.getStoreForPerson(this._person, true);
            this.requestUpdate();

        } catch (error) {
            console.error("Error loading person store:", error);
        }
    }

    private addNewRecord() {
        showMedilogRecordDetailDialog(this, {
            personStore: this._personStore!,
            medications: this.dataStore.medications,
            record: {
                datetime: dayjs(),
                temperature: undefined,
                medication_id: undefined,
                note: ''
            }
        })

    }
}