import { LitElement, css, html } from "lit-element"
import { customElement, state } from "lit/decorators.js";
import type { HomeAssistant } from "../hass-frontend/src/types";
import type { LovelaceCard } from "../hass-frontend/src/panels/lovelace/types";
import type { LovelaceCardConfig } from "../hass-frontend/src/data/lovelace/config/card";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { PersonInfo } from "./models";
import "./medilog-person-detail"
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
                this.persons = response.response.persons.map((person_id: string) => ({
                    entity_id: person_id,
                    name: this._hass?.states[person_id]?.attributes?.friendly_name ?? person_id
                }));
                if (!this.person) {
                    const current_user_id = this._hass?.user?.id;
                    // Find person entity that matches current user's ID
                    const matchingPerson = this.persons.find(person => 
                        person.entity_id === this._hass?.states[person.entity_id]?.attributes?.user_id
                    );
                    this.person = matchingPerson || this.persons[0];
                }}
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

    static styles = css`
    // add your styles here
    
    ha-button {
        margin: 0.2rem;
    }
    
    ha-button.button-active {
        background-color: var(--primary-background-color);
        border-color: var(--primary-color);
        border: 1px solid var(--primary-color);
    }
    
`

    render() {

        if (!this.config) {
            return "Config is not defined";
        }

        // Convert persons array to format expected by ha-combo-box
        const personItems = this.persons.map(person => ({
            value: person.entity_id,
            label: person.name
        }));

        return html`
            <ha-card>
                MedilogCard
                <div>
                    ${personItems.map(person => html`
                        <ha-button 
                            .value=${person.value} 
                            .label=${person.label}
                            class=${this.person?.entity_id === person.value ? 'button-active' : ''}
                            @click=${() => this.person = this.persons.find(p=>p.entity_id === person.value)}
                        ></ha-button>`)}            
                </div>
                ${this.person ? html`<medilog-person-detail .person=${this.person} .hass=${this._hass}></medilog-person-detail>` : 'No person selected'}
                

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