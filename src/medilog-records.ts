import { LitElement, css, html } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import 'dayjs/locale/cs';
import { MedilogRecord, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import "./medilog-records-chart"
import "./medilog-records-table"
import { getLocalizeFunction } from "./localize/localize";

@customElement("medilog-records")
export class MedilogRecords extends LitElement {
    @property({ attribute: false }) public person?: PersonInfo
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public records?: (MedilogRecord | null)[];
    @state() private visualization: 'chart' | 'table' = 'table';

    static styles = css`
    
    `

    render() {
        if (!this.person) {
            return "Person is not defined";
        }

        if (!this.records) {
            return html`<ha-circular-progress active></ha-circular-progress>`;
        }
        const localize = getLocalizeFunction(this.hass!);

        return html`
            <div>
                <ha-button .raised=${this.visualization == 'table'} @click=${() => this.visualization = 'table'}><ha-icon icon="mdi:table"></ha-icon></ha-button>            
                <ha-button .raised=${this.visualization == 'chart'} @click=${() => this.visualization = 'chart'}><ha-icon icon="mdi:chart-line"></ha-icon></ha-button>
            </div>
            
            ${this.visualization === 'table'
                ? html`<medilog-records-table .records=${this.records} .hass=${this.hass} .person=${this.person}></medilog-records-table>`
                : html`<medilog-records-chart .records=${this.records}></medilog-records-chart>`
            }
        `;
    }
}
