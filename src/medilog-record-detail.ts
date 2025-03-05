import { LitElement, css, html, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/cs';
import { MedilogRecord, MedilogRecordRaw, PersonInfo } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiClose } from '@mdi/js';
import { loadHaForm, loadHaYamlEditor } from "./load-ha-elements";
import { sharedStyles } from "./shared-styles";

loadHaForm();
loadHaYamlEditor()

@customElement("medilog-record-detail")
export class MedilogRecordDetail extends LitElement {

    @state() private _record?: MedilogRecord;
    @property({ attribute: false }) public set record(value: MedilogRecord | undefined) {
        if (this._record === undefined && value != undefined) {
            this._record = { ...value };
        } else if (this._record != undefined && value == undefined) {
            this._record = undefined;
        }
    }
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public personId: string = "";

    constructor() {
        super();
        customElements.whenDefined("ha-selector-datetimeg").then(() => {
            // The component is loaded and you can interact with it.
            alert("loaded");
        });
    }

    static styles = [sharedStyles, css`
        .fill {
            width: 100%;
        }
        .field {
            margin-bottom: 1em;
        }
        .temperature-buttons{
            display: flex;
            justify-content: space-between;
            gap:1;
            width: 350px;
            flex-wrap: wrap;
        }
    `]

    render() {
        if (!this._record || !this.hass) {
            return html``;
        }

        return html`
            <ha-dialog open .heading=${true} @closed=${this.closeDialog} @close-dialog=${this.closeDialog}>
                <ha-dialog-header slot="heading">
                    <ha-icon-button slot="navigationIcon" dialogAction="cancel" .path=${mdiClose}></ha-icon-button>
                    <span slot="title">${this._record.id ? "Upravit" : "Nový záznam"}</span>
                </ha-dialog-header>
                <div class="wrapper">
                    <div class="datetime-field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ datetime: {} }}
                            .value=${this._record.datetime.format("YYYY-MM-DD HH:mm:ss")}
                            @value-changed=${(e: CustomEvent) => { this._record = { ...this._record!, datetime: dayjs(e.detail.value) } }}
                        ></ha-selector>
                    </div>
                    <p>
                        <strong>Teplota:</strong> ${this._record.temperature}
                        <ha-button @click=${()=>this._record={...this._record!, temperature:undefined}}>X</ha-button>
                    </p>
                    <div class="field">
                        <div class="temperature-buttons">
                            ${[36, 37, 38, 39, 40].map((t) => html`
                            <ha-button class=${this.doesTemperatureMatch(t, false) ? "button-active" : ""} @click=${() => this.setTemperature(t, false)}>${t}</ha-button>`)}
                        </div>
                        <div class="temperature-buttons">
                            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => html`
                            <ha-button class=${this.doesTemperatureMatch(t, true) ? "button-active" : ""} @click=${() => this.setTemperature(t, true)}>${"." + t}</ha-button>`)}
                        </div>
                    </div>
                    <ha-textfield .label=${"Lék"} .value=${this._record.pill} class="fill field" @change=${(e: Event) => { this._record = { ...this._record!, pill: (e.target as HTMLInputElement).value }; }}></ha-textfield>
                    <ha-textarea .label=${"Poznámky"} .value=${this._record.note} class="fill field" @change=${(e: Event) => { this._record = { ...this._record!, note: (e.target as HTMLTextAreaElement).value }; }}></ha-textarea>
                </div>

                <ha-button slot="secondaryAction" @click=${this.closeDialog}>
                    ${this.hass.localize('ui.common.cancel')}
                </ha-button>

                <ha-button slot="primaryAction" @click=${this.deleteClick} class="button-error">
                    ${this.hass.localize('ui.common.delete')}
                </ha-button>

                <ha-button slot="primaryAction" @click=${this.saveClick}>
                    ${this.hass.localize('ui.common.save')}
                </ha-button>

            </ha-dialog>
        `;

    }

    private setTemperature(t: number, decimals: boolean) {
        let temperature = this._record?.temperature;
        if (temperature === undefined) {
            temperature = decimals ? 36 + (t / 10) : t + 0.7;
        } else {
            temperature = decimals ? Math.trunc(temperature) + (t / 10) : t + +((temperature - Math.trunc(temperature))).toPrecision(1)
        }

        this._record = { ...this._record, temperature: temperature } as MedilogRecord
    }

    private doesTemperatureMatch(t: number, decimals: boolean) {
        let temperature = this._record?.temperature;

        if (temperature === undefined)
            return false;

        return decimals ? +(temperature - Math.trunc(temperature)).toPrecision(1) == t / 10 : Math.trunc(temperature) == t;
    }


    private async saveClick() {
        if (!this.hass || !this._record)
            return;

        await this.hass.callService('medilog', 'add_or_update_record', {
            ...this._record,
            datetime: this._record.datetime.toISOString(),
            person_id: this.personId
        } as MedilogRecordRaw, {}, true, false);
        this.closeDialog(true);
    }

    private async deleteClick() {
        if (!this.hass || !this._record)
            return;
        if (!confirm("Opravdu chcete smazat tento záznam?")) {
            return;
        }
        await this.hass.callService('medilog', 'delete_record', {
            person_id: this.personId,
            id: this._record.id,
        }, {}, true, false);


        this.closeDialog(true);
    }

    private closeDialog(changed: boolean = false) {
        this.dispatchEvent(new CustomEvent('closed', {
            bubbles: true,
            composed: true,
            detail: { changed: changed }
        }));

    }
}