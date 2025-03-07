import { LitElement, css, html, nothing } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import { MedilogRecord, MedilogRecordRaw } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiClose } from '@mdi/js';
import { sharedStyles } from "./shared-styles";
import { loadHaForm, loadHaYamlEditor } from "./load-ha-elements";
import { getLocalizeFunction } from "./localize/localize";

export interface MedilogRecordDetailDialogParams {
    record: MedilogRecord;
    personId: string;
    closed: (changed: boolean) => void;
}

loadHaForm();

@customElement("medilog-record-detail-dialog")
export class MedilogRecordDetailDialog extends LitElement {

    @state() private _params?: MedilogRecordDetailDialogParams;
    @state() private _editedRecord?: MedilogRecord;

    @property({ attribute: false }) public hass!: HomeAssistant;

    public showDialog(dialogParams: MedilogRecordDetailDialogParams): void {
        this._params = dialogParams;
        this._editedRecord = dialogParams.record;
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
        if (!this._params || !this.hass || !this._editedRecord) {
            return nothing;
        }

        const localize = getLocalizeFunction(this.hass!);

        return html`
            <ha-dialog open .heading=${true} @closed=${this.closeDialog} @close-dialog=${this.closeDialog}>
                <ha-dialog-header slot="heading">
                    <ha-icon-button slot="navigationIcon" dialogAction="cancel" .path=${mdiClose}></ha-icon-button>
                    <span slot="title">${this._editedRecord.id
                ? localize('dialog.edit_record')
                : localize('dialog.new_record')}</span>
                </ha-dialog-header>
                <div class="wrapper">
                    <div class="datetime-field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ datetime: {} }}
                            .value=${this._editedRecord.datetime.format("YYYY-MM-DD HH:mm:ss")}
                            @value-changed=${(e: CustomEvent) => { this._editedRecord = { ...this._editedRecord!, datetime: dayjs(e.detail.value) } }}
                        ></ha-selector>
                    </div>
                    <p>
                        <strong>${localize('dialog.temperature')}:</strong> ${this._editedRecord.temperature}
                        <ha-button @click=${() => this._editedRecord = { ...this._editedRecord!, temperature: undefined }}>X</ha-button>
                    </p>
                    <div class="field">
                        <div class="temperature-buttons">
                            ${[36, 37, 38, 39, 40].map((t) => html`
                            <ha-button .raised=${this.doesTemperatureMatch(t, false)} @click=${() => this.setTemperature(t, false)}>${t}</ha-button>`)}
                        </div>
                        <div class="temperature-buttons">
                            ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => html`
                            <ha-button .raised=${this.doesTemperatureMatch(t, true)}  @click=${() => this.setTemperature(t, true)}>${"." + t}</ha-button>`)}
                        </div>
                    </div>
                    <ha-textfield .label=${localize('dialog.medication')} .value=${this._editedRecord.medication ?? ""} class="fill field" @change=${(e: Event) => { this._editedRecord = { ...this._editedRecord!, medication: (e.target as HTMLInputElement).value }; }}></ha-textfield>
                    <ha-textarea .label=${localize('dialog.notes')} .value=${this._editedRecord.note ?? ""} class="fill field" @change=${(e: Event) => { this._editedRecord = { ...this._editedRecord!, note: (e.target as HTMLTextAreaElement).value }; }}></ha-textarea>
                </div>

                <ha-button slot="secondaryAction" @click=${this.closeDialog}>
                    ${localize('common.cancel')}
                </ha-button>
                ${this._editedRecord.id ? html`
                    <ha-button slot="primaryAction" @click=${this.deleteClick} class="button-error">
                        ${localize('common.delete')}
                    </ha-button>

                <ha-button slot="primaryAction" @click=${this.duplicateClick}>
                    ${localize('common.duplicate')}
                </ha-button>

                ` : nothing}

                <ha-button slot="primaryAction" @click=${this.saveClick}>
                    ${localize('common.save')}
                </ha-button>

            </ha-dialog>
        `;

    }

    private setTemperature(t: number, decimals: boolean) {
        let temperature = this._editedRecord?.temperature;
        if (temperature === undefined) {
            temperature = decimals ? 36 + (t / 10) : t + 0.7;
        } else {
            temperature = decimals ? Math.trunc(temperature) + (t / 10) : t + +((temperature - Math.trunc(temperature))).toPrecision(1)
        }

        this._editedRecord = { ...this._editedRecord, temperature: temperature } as MedilogRecord
    }

    private doesTemperatureMatch(t: number, decimals: boolean) {
        let temperature = this._editedRecord?.temperature;

        if (temperature === undefined)
            return false;

        return decimals ? +(temperature - Math.trunc(temperature)).toPrecision(1) == t / 10 : Math.trunc(temperature) == t;
    }

    private duplicateClick() {
        if (!this._editedRecord)
            return;

        this._editedRecord = { ...this._editedRecord, id: undefined, datetime: dayjs() };
    }
    private async saveClick() {
        if (!this.hass || !this._editedRecord)
            return;

        await this.hass.callService('medilog', 'add_or_update_record', {
            ...this._editedRecord,
            datetime: this._editedRecord.datetime.toISOString(),
            person_id: this._params?.personId
        } as MedilogRecordRaw, {}, true, false);
        this.closeDialog(true);
    }

    private async deleteClick() {
        if (!this.hass || !this._editedRecord)
            return;

        const localize = getLocalizeFunction(this.hass!);
        if (!confirm(localize('dialog.delete_confirm'))) {
            return;
        }
        await this.hass.callService('medilog', 'delete_record', {
            person_id: this._params?.personId,
            id: this._editedRecord.id,
        }, {}, true, false);


        this.closeDialog(true);
    }

    private closeDialog(changed: boolean = false) {
        this._params?.closed(changed);
        this._params = undefined;
        this._editedRecord = undefined;
    }
}