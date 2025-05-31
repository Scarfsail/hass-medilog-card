import { LitElement, css, html } from "lit-element"
import { customElement, state } from "lit/decorators.js";
import type { HomeAssistant } from "../hass-frontend/src/types";
import type { LovelaceCard } from "../hass-frontend/src/panels/lovelace/types";
import type { LovelaceCardConfig } from "../hass-frontend/src/data/lovelace/config/card";
import dayjs, { Dayjs } from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { PersonInfo, PersonInfoRaw } from "./models";
import "./medilog-person-detail"
import { sharedStyles } from "./shared-styles";
import { convertMedilogRecordRawToMedilogRecord } from "./medilog-person-detail";
dayjs.extend(duration);

interface MedilogCardConfig extends LovelaceCardConfig {

}


@customElement("medilog-card")
export class MedilogCard extends LitElement implements LovelaceCard {

    private config?: MedilogCardConfig;
    @state() private _hass?: HomeAssistant;
    @state() private persons: PersonInfo[] = [];

    @state() person?: PersonInfo;
    constructor() {
        super();
        //dayjs.locale('cs');
        dayjs.locale(this._hass?.locale?.language ?? 'cs')
    }

    public set hass(value: HomeAssistant) {
        this._hass = value;
    }

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

    connectedCallback() {
        super.connectedCallback();
        // Fetch persons when the component is connected
        if (this._hass) {
            this.fetchPersons();
        }
    }

    getCardSize() {
        return this.config?.card_size ?? 1;
    }

    public static async getStubConfig(hass: HomeAssistant): Promise<Partial<MedilogCardConfig>> {
        return {
            type: `custom:medilog-card`,
        };
    }

    async setConfig(config: MedilogCardConfig) {
        this.config = { ...config };
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }

    static styles = [sharedStyles, css`
    ha-card {
        overflow: visible;
        background: var(--card-background-color);
        box-shadow: var(--ha-card-box-shadow);
    }
    
    .tabs-container {
        display: flex;
        margin-bottom: 0;
        padding: 8px 16px 0;
        position: relative;
        background: var(--secondary-background-color);
        border-radius: 8px 8px 0 0;
    }
    
    .tab {
        margin: 0 2px;
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
        padding: 8px 16px;
        min-width: 100px;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
    }
    
    .tab:hover {
        background: var(--secondary-background-color);
        transform: translateY(2px);
    }
    
    .tab.active-tab {
        background: rgba(var(--rgb-primary-color), 0.3);
        border-color: rgba(var(--rgb-primary-color), 0.3);
        border-bottom: 1px solid rgba(var(--rgb-primary-color), 0.3);
        --mdc-theme-primary: var(--primary-text-color);
        color: var(--primary-text-color) !important;
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
        border-radius: 0 12px 12px 12px;
        background: var(--card-background-color);
        margin-top: -1px;
        padding: 24px;
        box-shadow: var(--ha-card-box-shadow);
        position: relative;
        width: fit-content;
        max-width: 100%;
    }
    
`]

    render() {

        if (!this.config) {
            return "Config is not defined";
        }

        // Convert persons array to format expected by ha-combo-box
        const personItems = this.persons.map(person => ({
            value: person.entity,
            label: person.name
        }));


        return html`
            <ha-card>
                <div class="tabs-container">
                    ${personItems.map(person => html`
                        <div 
                            class="tab ${this.person?.entity === person.value ? 'active-tab' : ''}"
                            @click=${() => {
                                this.person = this.persons.find(p => p.entity === person.value);
                            }}
                        >${person.label}</div>`)}            
                </div>
                <div class="tab-content">
                    ${this.person ? html`<medilog-person-detail .person=${this.person} .hass=${this._hass}></medilog-person-detail>` : 'No person selected'}
                </div>
            </ha-card>
        `
    }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: 'medilog-card',
    name: 'MediLog Card',
    description: 'A health monitoring card for Home Assistant that allows management of medical log for each person.',
    preview: true,
});