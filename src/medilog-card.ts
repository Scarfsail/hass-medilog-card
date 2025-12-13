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
import { getLocalizeFunction } from "./localize/localize";
import { DataStore } from "./data-store";
import { Utils } from "./utils";
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
        padding: 3px 10px;
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
    private _updateInterval?: number;

    // State properties
    @state() private _hass?: HomeAssistant;
    @state() private dataStore?: DataStore;
    @state() private activeTab: 'person' | 'medications' = 'person';
    @state() person?: PersonInfo;
    @state() private _refreshTrigger = 0;

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
        
        if (this._hass) {
            this.dataStore = new DataStore(this._hass, this.handleDataChanged.bind(this));
            this.dataStore.initialize().then(() => {
                // After initialization, select the person with most recent record
                if (!this.person && this.dataStore) {
                    this.person = this.dataStore.persons.getPersonWithMostRecentRecord();
                }
            });
        }

        // Update elapsed times every minute
        this._updateInterval = window.setInterval(() => {
            this._refreshTrigger++;
        }, 60000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
        }
    }

    // Render method
    render() {        if (!this.config) {
            return "Config is not defined";
        }

        const localize = getLocalizeFunction(this._hass!);

        if (!this.dataStore) {
            return html`<ha-card><ha-circular-progress active></ha-circular-progress></ha-card>`;
        }

        // Convert persons array to format expected by tabs
        const personItems = this.dataStore.persons.all.map(person => ({
            value: person.entity,
            label: person.name
        }));


        return html`
            <ha-card>
                <div class="tabs-container">
                    ${personItems.map((person, index) => {
                        const isActive = this.activeTab === 'person' && this.person?.entity === person.value;
                        const personStore = this.dataStore!.records.getCachedStore(person.value);
                        const lastRefresh = personStore?.lastRefreshTime;
                        const elapsedTime = lastRefresh ? Utils.formatDurationFromTo(lastRefresh) : '';
                        
                        return html`
                        <div 
                            class="tab ${isActive ? 'active-tab' : ''}"
                            style="z-index: ${isActive ? personItems.length + 1 : index};"
                            @click=${() => {
                                this.activeTab = 'person';
                                this.person = this.dataStore!.persons.getPerson(person.value);
                            }}
                            @dblclick=${async () => {
                                const personInfo = this.dataStore!.persons.getPerson(person.value);
                                if (personInfo) {
                                    const store = await this.dataStore!.records.getStoreForPerson(personInfo);
                                    await store.fetch();
                                }
                            }}
                        >
                            <div>${person.label}</div>
                            ${elapsedTime ? html`<div style="font-size: 0.8em; font-weight: normal; opacity: 0.5; margin-top: 4px;">${elapsedTime}</div>` : ''}
                        </div>`
                    })}
                    <div 
                        class="tab ${this.activeTab === 'medications' ? 'active-tab' : ''}"
                        style="z-index: ${this.activeTab === 'medications' ? personItems.length + 1 : personItems.length};"
                        @click=${async () => {
                            this.activeTab = 'medications';
                            await this.dataStore!.getMedications();
                        }}
                        @dblclick=${async () => {
                            await this.dataStore!.medications.fetch();
                            await this.dataStore!.records.refreshAllCachedStores();
                            this.requestUpdate();
                        }}
                    >
                        <ha-icon icon="mdi:pill-multiple"></ha-icon>
                        ${(() => {
                            const lastRefresh = this.dataStore!.medications.lastRefreshTime;
                            const elapsedTime = lastRefresh ? Utils.formatDurationFromTo(lastRefresh) : '';
                            return elapsedTime ? html`<div style="font-size: 0.8em; font-weight: normal; opacity: 0.5; margin-top: 4px;">${elapsedTime}</div>` : '';
                        })()}
                    </div>
                </div>
                <div class="tab-content">
                    ${this.activeTab === 'person' && this.person 
                        ? html`<medilog-person-detail .person=${this.person} .dataStore=${this.dataStore!} .hass=${this._hass}></medilog-person-detail>` 
                        : this.activeTab === 'medications'
                        ? html`<medilog-medications-manager .hass=${this._hass} .dataStore=${this.dataStore}></medilog-medications-manager>`
                        : 'No person selected'}
                </div>
            </ha-card>
        `
    }

    // Private helper methods
    private handleDataChanged(): void {
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