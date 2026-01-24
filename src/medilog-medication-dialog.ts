import { LitElement, css, html, nothing, PropertyValues } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import { Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiClose } from '@mdi/js';
import { sharedStyles } from "./shared-styles";
import { loadHaForm } from "./load-ha-elements";
import { getLocalizeFunction, LocalizeFunction } from "./localize/localize";
import { MedicationsStore } from "./medications-store";

export interface MedicationDialogParams {
    medication?: Medication;
    medications: MedicationsStore;
    initialName?: string;
    onClose: (changed: boolean) => void;
}

loadHaForm();

@customElement("medilog-medication-dialog")
export class MedilogMedicationDialog extends LitElement {
    // Static styles
    static styles = [sharedStyles, css`
        .fill {
            width: 100%;
        }
        .field {
            margin-bottom: 16px;
        }
        .field ha-textfield {
            min-width: 426px;
        }
        .error {
            color: var(--error-color);
            font-size: 0.875rem;
            margin-top: 4px;
        }
        .checkbox-field {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        .form-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
    `]

    // Private properties
    private _localize?: (key: string) => string;

    // Public properties
    @property({ attribute: false }) public hass!: HomeAssistant;

    // State properties
    @state() private _params?: MedicationDialogParams;
    @state() private _formData: {
        name: string;
        units: string;
        is_antipyretic: boolean;
        active_ingredient: string;
    } = {
            name: '',
            units: '',
            is_antipyretic: false,
            active_ingredient: ''
        };
    @state() private _errors: { [key: string]: string } = {};

    // Public methods
    public showDialog(params: MedicationDialogParams): void {
        this._params = params;

        // Pre-fill form data
        if (params.medication) {
            // Edit mode
            this._formData = {
                name: params.medication.name,
                units: params.medication.units ?? '',
                is_antipyretic: params.medication.is_antipyretic,
                active_ingredient: params.medication.active_ingredient ?? ''
            };
        } else if (params.initialName) {
            // Create mode with initial name
            this._formData = {
                name: params.initialName,
                units: '',
                is_antipyretic: false,
                active_ingredient: ''
            };
        } else {
            // Create mode without initial name
            this._formData = {
                name: '',
                units: '',
                is_antipyretic: false,
                active_ingredient: ''
            };
        }
        this._errors = {};
    }

    // Lifecycle methods
    willUpdate(changedProperties: PropertyValues) {
        if (!this._localize && this.hass) {
            this._localize = getLocalizeFunction(this.hass);
        }
    }

    // Render method
    render() {
        if (!this._params || !this._localize) {
            return nothing;
        }

        const isEditMode = !!this._params.medication;

        return html`
            <ha-dialog open .heading=${true} @closed=${this._handleClose} @close-dialog=${this._handleClose}>
                <ha-dialog-header slot="heading">
                    <ha-icon-button slot="navigationIcon" dialogAction="cancel" .path=${mdiClose}></ha-icon-button>
                    <span slot="title">${isEditMode
                ? this._localize('medication_dialog.edit_title')
                : this._localize('medication_dialog.create_title')}</span>
                </ha-dialog-header>
                
                <div class="form-container">
                    <div class="field">
                        <ha-textfield
                            .label=${this._localize('medication_dialog.name')}
                            .value=${this._formData.name}
                            required
                            class="fill"
                            @input=${(e: Event) => {
                this._formData = { ...this._formData, name: (e.target as HTMLInputElement).value };
                delete this._errors.name;
            }}
                        ></ha-textfield>
                        ${this._errors.name ? html`<div class="error">${this._errors.name}</div>` : nothing}
                    </div>

                    <div class="field">
                        <ha-textfield
                            .label=${this._localize('medication_dialog.units')}
                            .value=${this._formData.units}
                            class="fill"
                            @input=${(e: Event) => {
                this._formData = { ...this._formData, units: (e.target as HTMLInputElement).value };
            }}
                        ></ha-textfield>
                    </div>

                    <div class="checkbox-field">
                        <ha-checkbox
                            .checked=${this._formData.is_antipyretic}
                            @change=${(e: Event) => {
                this._formData = { ...this._formData, is_antipyretic: (e.target as HTMLInputElement).checked };
            }}
                        ></ha-checkbox>
                        <label>${this._localize('medication_dialog.is_antipyretic')}</label>
                    </div>

                    <div class="field">
                        <ha-textfield
                            .label=${this._localize('medication_dialog.active_ingredient')}
                            .value=${this._formData.active_ingredient}
                            class="fill"
                            @input=${(e: Event) => {
                this._formData = { ...this._formData, active_ingredient: (e.target as HTMLInputElement).value };
            }}
                        ></ha-textfield>
                    </div>
                </div>

                ${isEditMode ? html`
                    <ha-button slot="primaryAction" .variant=${"danger"} @click=${this._handleDelete} class="button-error">
                        ${this._localize('common.delete')}
                    </ha-button>
                    
                    <ha-button slot="primaryAction" @click=${this._handleDuplicate}>
                        ${this._localize('common.duplicate')}
                    </ha-button>
                ` : nothing}
                
                <ha-button slot="primaryAction" .variant=${"success"} @click=${this._handleSave}>
                    ${this._localize('common.save')}
                </ha-button>
            </ha-dialog>
        `;
    }

    // Private helper methods
    private _validateForm(): boolean {
        this._errors = {};

        // Validate name is required
        if (!this._formData.name.trim()) {
            this._errors.name = this._localize?.('medication_dialog.error_name_required') || '';
            return false;
        }

        // Validate name is unique (excluding current medication in edit mode)
        const existingMedication = this._params!.medications.all.find(
            med => med.name.toLowerCase() === this._formData.name.trim().toLowerCase() &&
                med.id !== this._params?.medication?.id
        );

        if (existingMedication) {
            this._errors.name = this._localize?.('medication_dialog.error_name_exists') || '';
            return false;
        }

        return true;
    }

    private async _handleSave() {
        if (!this._params) return;

        if (!this._validateForm()) {
            this.requestUpdate();
            return;
        }

        try {
            const medicationData: Partial<Medication> = {
                name: this._formData.name.trim(),
                units: this._formData.units.trim() || undefined,
                is_antipyretic: this._formData.is_antipyretic,
                active_ingredient: this._formData.active_ingredient.trim() || undefined
            };

            // Add ID if editing
            if (this._params.medication) {
                medicationData.id = this._params.medication.id;
            }

            await this._params.medications.saveMedication(medicationData);
            this._handleClose(true);
        } catch (error) {
            console.error('Error saving medication:', error);
            this._errors.name = this._localize?.('medication_dialog.error_save_failed') || '';
            this.requestUpdate();
        }
    }

    private async _handleDelete() {
        if (!this._params?.medication || !this._localize) return;

        const confirmMessage = this._localize('medications_manager.delete_confirm').replace('{name}', this._params.medication.name);
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            await this._params.medications.deleteMedication(this._params.medication.id);
            this._handleClose(true);
        } catch (error) {
            console.error('Error deleting medication:', error);
            const errorMessage = this._localize('medications_manager.delete_in_use').replace('{name}', this._params.medication.name);
            alert(errorMessage);
        }
    }

    private _handleDuplicate() {
        if (!this._params?.medication) return;

        // Clear the medication reference to switch to create mode, but keep the form data
        this._params = {
            ...this._params,
            medication: undefined
        };
        this.requestUpdate();
    }

    private _handleClose(changed: boolean = false) {
        if (this._params) {
            this._params.onClose(changed);
        }
        this._params = undefined;
        this._formData = {
            name: '',
            units: '',
            is_antipyretic: false,
            active_ingredient: ''
        };
        this._errors = {};
    }
}
