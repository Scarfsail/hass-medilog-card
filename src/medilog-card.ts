import { LitElement, css, html } from "lit-element"
import { customElement, state } from "lit/decorators.js";
import type { HomeAssistant } from "../hass-frontend/src/types";
import type { LovelaceCard } from "../hass-frontend/src/panels/lovelace/types";
import type { LovelaceCardConfig } from "../hass-frontend/src/data/lovelace/config/card";
import dayjs, { Dayjs } from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { PersonInfo, PersonInfoRaw, Medication } from "./models";
import "./medilog-person-detail"
import "./medilog-medications-manager"
import { sharedStyles } from "./shared-styles";
import { convertMedilogRecordRawToMedilogRecord } from "./medilog-person-detail";
import { getLocalizeFunction } from "./localize/localize";
import { Medications } from "./medications";
dayjs.extend(duration);

interface MedilogCardConfig extends LovelaceCardConfig {

}


@customElement("medilog-card")
export class MedilogCard extends LitElement implements LovelaceCard {
    // Static configuration methods (HA-specific)
    public static async getStubConfig(hass: HomeAssistant): Promise<Partial<MedilogCardConfig>> {
        return {
            type: `custom:medilog-card`,
        };
    }

    // Static styles
    static styles = [sharedStyles, css`
    ha-card {
        overflow-x: auto;
        background: var(--card-background-color);
        box-shadow: var(--ha-card-box-shadow);
        padding: 0 16px;
    }
    
    .tabs-container {
        display: flex;
        margin-bottom: 0;
        padding: 8px 0 0;
        position: relative;
        background: var(--secondary-background-color);
        border-radius: 8px 8px 0 0;
        margin: 0 -16px;
        padding: 8px 16px 0;
    }
    
    .tab {
        margin: 0 -15px;
        border-radius: 12px 12px 0 0;
        border: 2px solid var(--divider-color);
        border-bottom: none;
        background: var(--card-background-color);
        color: var(--secondary-text-color);
        position: relative;
        transform: translateY(4px);
        box-shadow: var(--ha-card-box-shadow);
        transition: all 0.3s ease;
        font-weight: 500;
        padding: 20px 25px;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
        flex-grow: 1;
        text-align: center;
    }
    
    .tab:first-child {
        margin-left: 0;
    }
    
    .tab:last-child {
        margin-right: 0;
    }
    
    .tab:hover {
        background: var(--secondary-background-color);
        transform: translateY(2px);
    }
    
    .tab.active-tab {
        background: rgb(var(--rgb-primary-color));
        border-color: rgba(var(--rgb-primary-color), 0.3);
        border-bottom: 1px solid rgba(var(--rgb-primary-color), 0.3);
        --mdc-theme-primary: var(--primary-text-color);
        color: white !important;
        font-weight: bold;
        transform: translateY(0px);
        z-index: 10;
        font-size: 15px;
    }
    
    .tab.active-tab:before {
        display: none;
    }
    
    .tab-content {
        border: 2px solid rgba(var(--rgb-primary-color), 0.3);
        border-radius: 0 8px 8px 8px;
        background: var(--card-background-color);
        margin-top: -1px;
        padding: 24px;
        box-shadow: var(--ha-card-box-shadow);
        position: relative;
        box-sizing: border-box;
        margin-left: 0;
        margin-right: -8px;
        min-width: 100%;
        width: fit-content;
    }
    
    `]

    // Private config
    private config?: MedilogCardConfig;

    // State properties
    @state() private _hass?: HomeAssistant;
    @state() private persons: PersonInfo[] = [];
    @state() private medications?: Medications;
    @state() private activeTab: 'person' | 'medications' = 'person';
    @state() person?: PersonInfo;

    // Constructor
    constructor() {
        super();
        dayjs.locale(this._hass?.locale?.language ?? 'cs')
    }

    // HA-specific property setter
    public set hass(value: HomeAssistant) {
        this._hass = value;
    }

    // HA-specific methods
    async setConfig(config: MedilogCardConfig) {
        this.config = { ...config };
    }

    getCardSize() {
        return this.config?.card_size ?? 1;
    }

    // Lifecycle methods
    connectedCallback() {
        super.connectedCallback();
        // Fetch medications first, then persons (persons need medications for conversion)
        
        if (this._hass) {
            this.medications = new Medications(this._hass, this.handleMedicationsChanged.bind(this));
            this.medications?.fetchMedications().then(() => {
                this.fetchPersons();
            });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    // Render method
    render() {        if (!this.config) {
            return "Config is not defined";
        }

        const localize = getLocalizeFunction(this._hass!);

        // Convert persons array to format expected by ha-combo-box
        const personItems = this.persons.map(person => ({
            value: person.entity,
            label: person.name
        }));


        return html`
            <ha-card>
                <div class="tabs-container">
                    ${personItems.map((person, index) => {
                        const isActive = this.activeTab === 'person' && this.person?.entity === person.value;
                        return html`
                        <div 
                            class="tab ${isActive ? 'active-tab' : ''}"
                            style="z-index: ${isActive ? personItems.length + 1 : index};"
                            @click=${() => {
                                this.activeTab = 'person';
                                this.person = this.persons.find(p => p.entity === person.value);
                            }}
                        >${person.label}</div>`
                    })}
                    <div 
                        class="tab ${this.activeTab === 'medications' ? 'active-tab' : ''}"
                        style="z-index: ${this.activeTab === 'medications' ? personItems.length + 1 : personItems.length};"
                        @click=${() => {
                            this.activeTab = 'medications';
                        }}
                    ><ha-icon icon="mdi:pill-multiple"></ha-icon> </div>
                </div>
                <div class="tab-content">
                    ${this.activeTab === 'person' && this.person 
                        ? html`<medilog-person-detail .person=${this.person} .medications=${this.medications!} .hass=${this._hass}></medilog-person-detail>` 
                        : this.activeTab === 'medications'
                        ? html`<medilog-medications-manager .medications=${this.medications!} .hass=${this._hass}></medilog-medications-manager>`
                        : 'No person selected'}
                </div>
            </ha-card>
        `
    }

    // Private helper methods
    private async fetchPersons(): Promise<void> {
        if (!this._hass) return;

        try {
            const response = await this._hass.callService('medilog', 'get_person_list', {}, {}, true, true);
            if (response && response.response.persons) {
                this.persons = (response.response.persons as PersonInfoRaw[]).map((person) => ({
                    entity: person.entity,
                    name: this._hass?.states[person.entity]?.attributes?.friendly_name ?? person.entity,
                    recent_record: convertMedilogRecordRawToMedilogRecord(person.recent_record)
                } as PersonInfo)).sort((a,b)=>a.name.localeCompare(b.name));
                if (!this.person) {

                    const personWithMostRecentRecord = [...this.persons].sort((a, b) => (a.recent_record?.datetime ?? 0) > (b.recent_record?.datetime ?? 0) ? -1 : 1)[0];

                    this.person = personWithMostRecentRecord;
                }
            }
        } catch (error) {
            console.error("Error fetching persons:", error);
        }
    }

    handleMedicationsChanged(){
        this.requestUpdate();
    }
}

// Card registration
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: 'medilog-card',
    name: 'MediLog Card',
    description: 'A health monitoring card for Home Assistant that allows management of medical log for each person.',
    preview: true,
});