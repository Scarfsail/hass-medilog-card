import { LitElement, css, html } from "lit-element"
import { customElement, state } from "lit/decorators.js";
import type { HomeAssistant } from "../hass-frontend/src/types";
import type { LovelaceCard } from "../hass-frontend/src/panels/lovelace/types";
import type { LovelaceCardConfig } from "../hass-frontend/src/data/lovelace/config/card";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';

dayjs.extend(duration);

interface MedilogCardConfig extends LovelaceCardConfig {

}


@customElement("medilog-card")
export class MedilogCard extends LitElement implements LovelaceCard {

    private config?: MedilogCardConfig;
    @state() private _hass?: HomeAssistant;

    constructor() {
        super();
        //dayjs.locale('cs');
        dayjs.locale(this._hass?.locale?.language ?? 'cs')
    }

    public set hass(value: HomeAssistant) {
        this._hass = value;

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
        
    `

    render() {

        if (!this.config) {
            return "Config is not defined";
        }


        return html`
            <ha-card>
                MedilogCard
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