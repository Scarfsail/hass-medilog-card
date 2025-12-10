import { LitElement, css, html, nothing } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import dayjs from "dayjs";
import { MedilogRecord, MedilogRecordRaw, Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiClose, mdiCloseCircle } from '@mdi/js';
import { sharedStyles } from "./shared-styles";
import { loadHaForm, loadHaYamlEditor } from "./load-ha-elements";
import { getLocalizeFunction } from "./localize/localize";
import { Utils } from "./utils";
import "./medilog-medication-dialog";
import { Medications } from "./medications";
import { showMedicationDialog } from "./medilog-medications-manager";
import { showMedicationPicker } from "./medilog-medication-picker";

export interface MedilogRecordDetailDialogParams {
    record: MedilogRecord;
    personId: string;
    medications: Medications;
    allRecords?: MedilogRecord[];
    closed: (changed: boolean) => void;
}

loadHaForm();

@customElement("medilog-record-detail-dialog")
export class MedilogRecordDetailDialog extends LitElement {
    // Static styles
    static styles = [sharedStyles, css`
        .fill {
            width: 100%;
        }
        .field {
            margin-bottom: 5px;
        }
        .medication-row {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }
        .medication-row .medication-field-wrapper {
            flex: 1;
            position: relative;
        }
        .medication-row .medication-field {
            width: 100%;
        }
        .medication-row .medication-clear-btn {
            position: absolute;
            right: 8px;
            bottom: 8px;
            --mdc-icon-button-size: 24px;
            --mdc-icon-size: 18px;
        }
        .medication-row .amount-field {
            width: 120px;
        }
        .temperature-buttons{
            display: flex;
            justify-content: space-between;
            gap:5px;
            width: 280px;
            flex-wrap: wrap;
        }
        .wrapper{
            display: flex;   
            flex-flow: column;
            gap: 10px;
        }
        .temperature-value{
            margin: 0px;
        }
        .last-taken-info {
            color: var(--secondary-text-color);
            font-size: 0.9em;
            margin-top: 4px;
            font-style: italic;
        }
    `]

    // Public properties
    @property({ attribute: false }) public hass!: HomeAssistant;

    // State properties
    @state() private _params?: MedilogRecordDetailDialogParams;
    @state() private _editedRecord?: MedilogRecord;

    // Public methods
    public showDialog(dialogParams: MedilogRecordDetailDialogParams): void {
        this._params = dialogParams;
        this._editedRecord = dialogParams.record;
    }

    // Render method
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

                    <div>
                        <div class="medication-row">
                            <div class="medication-field-wrapper">
                                <ha-textfield
                                    class="medication-field"
                                    .label=${localize('dialog.medication')}
                                    .value=${this._getMedicationName()}
                                    readonly
                                    @focus=${this._openMedicationPicker}
                                >
                                </ha-textfield>
                                ${this._editedRecord.medication_id ? html`
                                    <ha-icon-button
                                        class="medication-clear-btn"
                                        .path=${mdiCloseCircle}
                                        @click=${this._clearMedication}
                                    ></ha-icon-button>
                                ` : nothing}
                            </div>
                            <ha-textfield
                                class="amount-field"
                                .label=${localize('dialog.medication_amount')}
                                .value=${this._editedRecord.medication_amount ?? ""}
                                type="number"
                                step="0.5"
                                min="0"
                                .disabled=${!this._editedRecord.medication_id}
                                @change=${(e: Event) => {
                const value = (e.target as HTMLInputElement).value;
                this._editedRecord = { ...this._editedRecord!, medication_amount: value ? parseFloat(value) : undefined };
            }}
                            ></ha-textfield>
                        </div>
                        ${this._renderLastTaken()}
                    </div>
                    <ha-textfield .label=${localize('dialog.notes')} .value=${this._editedRecord.note ?? ""} class="fill field" @change=${(e: Event) => { this._editedRecord = { ...this._editedRecord!, note: (e.target as HTMLTextAreaElement).value }; }}></ha-textfield>
                    ${this._editedRecord.temperature !== undefined ? html`
                        <p >
                            <strong>${localize('dialog.temperature')}:</strong> ${this._editedRecord.temperature}
                            <ha-button .variant=${"danger"} @click=${() => this._editedRecord = { ...this._editedRecord!, temperature: undefined }}>X</ha-button>
                        </p>
                        <div>
                            <div class="temperature-buttons">
                                ${[36, 37, 38, 39, 40].map((t) => html`
                                <ha-button .appearance=${this.doesTemperatureMatch(t, false) ? 'accent' : 'plain'} @click=${() => this.setTemperature(t, false)}>${t}</ha-button>`)}
                            </div>
                            <div class="temperature-buttons">
                                ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => html`
                                <ha-button .appearance=${this.doesTemperatureMatch(t, true) ? 'accent' : 'plain'}  @click=${() => this.setTemperature(t, true)}>${"." + t}</ha-button>`)}
                            </div>
                        </div>
                    ` : html`
                        <p class="temperature-value">
                            <strong>${localize('dialog.temperature')}:</strong>
                            <ha-button @click=${() => this._editedRecord = { ...this._editedRecord!, temperature: 36.7 }}>+</ha-button>
                        </p>
                    `}

                </div>

                ${this._editedRecord.id ? html`
                    <ha-button slot="primaryAction" .variant=${"danger"} @click=${this.deleteClick} class="button-error">
                        ${localize('common.delete')}
                    </ha-button>
                
                <ha-button slot="primaryAction" @click=${this.duplicateClick}>
                    ${localize('common.duplicate')}
                </ha-button>

                ` : nothing}

                <ha-button slot="primaryAction" .variant=${"success"} @click=${this.saveClick}>
                    ${localize('common.save')}
                </ha-button>
            </ha-dialog>
        `;

    }

    // Private helper methods
    private _getMedicationName(): string {
        if (!this._editedRecord?.medication_id) {
            return '';
        }

        const medication = this._params?.medications.getMedication(this._editedRecord.medication_id);
        return medication?.name ?? getLocalizeFunction(this.hass!)('medication_dialog.medication_not_found');
    }

    private _openMedicationPicker() {
        if (!this._params) return;

        showMedicationPicker(this, {
            medications: this._params.medications,
            personId: this._params.personId,
            allRecords: this._params.allRecords ?? [],
            onSelect: (medication) => {
                if (medication) {
                    this._editedRecord = {
                        ...this._editedRecord!,
                        medication_id: medication.id,
                        medication_amount: this._editedRecord!.medication_amount ?? 1
                    };
                }
            }
        });
    }

    private _clearMedication() {
        this._editedRecord = {
            ...this._editedRecord!,
            medication_id: undefined,
            medication_amount: undefined
        };
    }

    private _clearMedicationAndStopPropagation(e: Event) {
        e.stopPropagation();
        this._clearMedication();
    }

    private _renderLastTaken() {
        const lastRecord = this._getLastMedicationRecord();
        if (!lastRecord || !this._editedRecord) return nothing;

        const localize = getLocalizeFunction(this.hass!);
        const duration = Utils.formatDurationFromTo(lastRecord.datetime);
        const amount = lastRecord.medication_amount && lastRecord.medication_amount > 1
            ? ` (${lastRecord.medication_amount}x)`
            : '';

        return html`
            <div class="last-taken-info">
                ${localize('dialog.last_taken').replace('{duration}', duration)}${amount}
            </div>
        `;
    }

    private _getLastMedicationRecord(): MedilogRecord | undefined {
        if (!this._editedRecord?.medication_id || !this._params?.allRecords) return undefined;

        const medicationId = this._editedRecord.medication_id;
        if (!medicationId) return undefined;

        return this._params.allRecords
            .filter(record => record.medication_id === medicationId)
            .sort((a, b) => b.datetime.diff(a.datetime))[0];
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
            id: this._editedRecord.id,
            datetime: this._editedRecord.datetime.toISOString(),
            temperature: this._editedRecord.temperature,
            medication_id: this._editedRecord.medication_id,
            medication_amount: this._editedRecord.medication_amount,
            note: this._editedRecord.note?.trim(),
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