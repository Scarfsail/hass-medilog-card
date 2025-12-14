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
        gap: 4px;
        border-bottom: 2px solid var(--divider-color);
        margin: 0 -16px 16px;
        padding: 0 16px;
    }
    
    .tab {
        padding: 1px 2px;
        min-height: 36px;
        cursor: pointer;
        user-select: none;
        flex: 1;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0px;
        background: transparent;
        border: 1px solid rgba(var(--rgb-disabled-color), 0.3);
        color: var(--secondary-text-color);
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        margin-bottom: -2px;
        border-radius: 8px 8px 0 0;
    }
    
    .tab:hover {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
    }
    
    .tab.active-tab {
        background: rgba(var(--rgb-primary-color), 0.8);
        color: var(--primary-text-color);
        border-bottom-color: var(--primary-color);
    }
    
    .tab-elapsed-time {
        font-size: 10px;
        font-weight: normal;
        opacity: 0.5;
    }
    
    .tab-content {
        padding: 0 0 10px 0;
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
                    ${personItems.map((person) => {
                        const isActive = this.activeTab === 'person' && this.person?.entity === person.value;
                        const personStore = this.dataStore!.records.getCachedStore(person.value);
                        const lastRefresh = personStore?.lastRefreshTime;
                        const elapsedTime = lastRefresh ? Utils.formatDurationFromTo(lastRefresh) : '';
                        
                        return html`
                        <div 
                            class="tab ${isActive ? 'active-tab' : ''}"
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
                            ${isActive && elapsedTime ? html`<div class="tab-elapsed-time">${elapsedTime}</div>` : ''}
                        </div>`
                    })}
                    <div 
                        class="tab ${this.activeTab === 'medications' ? 'active-tab' : ''}"
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
                        <div><ha-icon icon="mdi:pill-multiple"></ha-icon></div>
                        ${(() => {
                            const isMedicationsActive = this.activeTab === 'medications';
                            const lastRefresh = this.dataStore!.medications.lastRefreshTime;
                            const elapsedTime = lastRefresh ? Utils.formatDurationFromTo(lastRefresh) : '';
                            return isMedicationsActive && elapsedTime ? html`<div class="tab-elapsed-time">${elapsedTime}</div>` : '';
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