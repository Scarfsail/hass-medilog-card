import { LitElement, css, html, nothing } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import { Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { mdiPlus } from '@mdi/js';
import { sharedStyles, sharedTableStyles } from "./shared-styles";
import { getLocalizeFunction } from "./localize/localize";
import "./medilog-medication-dialog";
import { MedicationsStore } from "./medications-store";

@customElement("medilog-medications-manager")
export class MedilogMedicationsManager extends LitElement {
    // Static styles
    static styles = [sharedStyles, sharedTableStyles, css`
        .container {
            padding: 16px;
        }

        .header {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            margin-bottom: 16px;
            gap: 16px;
        }

        .add-button {
            --mdc-theme-primary: var(--success-color);
            height: 48px;
            font-weight: bold;
            border-radius: 12px;
            padding: 0 24px;
        }

        table th {
            text-align: left;
            padding: 8px;
            vertical-align: top;
        }

        table td {
            text-align: left;
        }

        .filter-field {
            width: 100%;
            --mdc-text-field-outlined-idle-border-color: var(--divider-color);
            --mdc-text-field-outlined-hover-border-color: var(--primary-color);
        }

        .empty-state {
            text-align: center;
            padding: 48px 16px;
            color: var(--secondary-text-color);
        }

        .empty-state ha-icon {
            --mdc-icon-size: 64px;
            color: var(--disabled-text-color);
            margin-bottom: 16px;
        }

        .antipyretic-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 12px;
            background-color: var(--info-color);
            color: white;
            font-size: 0.875rem;
        }
    `]

    // Public properties
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public medications!: MedicationsStore;

    // State properties
    @state() private _filterName: string = '';
    @state() private _filterUnits: string = '';
    @state() private _filterAntipyretic: string = '';
    @state() private _filterIngredient: string = '';

    // Render method
    render() {
        if (!this.hass) {
            return nothing;
        }

        const localize = getLocalizeFunction(this.hass);
        const filteredMedications = this._getFilteredMedications();

        return html`
            <div class="container">
                <div class="header">
                    <ha-button @click=${this._handleAdd} class="add-button">
                        <ha-icon icon="mdi:plus"></ha-icon>
                        ${localize('medications_manager.add_medication')}
                    </ha-button>
                </div>

                ${filteredMedications.length === 0 && !this._filterName && !this._filterUnits && !this._filterAntipyretic && !this._filterIngredient ? html`
                    <div class="empty-state">
                        <ha-icon icon="mdi:pill"></ha-icon>
                        <p>${localize('medications_manager.empty_state')}</p>
                    </div>
                ` : html`
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_name')}
                                        .value=${this._filterName}
                                        @input=${(e: Event) => {
                                            this._filterName = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_units')}
                                        .value=${this._filterUnits}
                                        @input=${(e: Event) => {
                                            this._filterUnits = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_antipyretic')}
                                        .value=${this._filterAntipyretic}
                                        @input=${(e: Event) => {
                                            this._filterAntipyretic = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                                <th>
                                    <ha-textfield
                                        class="filter-field"
                                        .label=${localize('medications_manager.column_ingredient')}
                                        .value=${this._filterIngredient}
                                        @input=${(e: Event) => {
                                            this._filterIngredient = (e.target as HTMLInputElement).value;
                                        }}
                                    ></ha-textfield>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredMedications.map(med => html`
                                <tr @click=${() => this._handleEdit(med)}>
                                    <td><strong>${med.name}</strong></td>
                                    <td>${med.units || '-'}</td>
                                    <td>
                                        ${med.is_antipyretic ? html`
                                            <span class="antipyretic-badge">
                                                <ha-icon icon="mdi:thermometer"></ha-icon>
                                                ${localize('medications_manager.yes')}
                                            </span>
                                        ` : localize('medications_manager.no')}
                                    </td>
                                    <td>${med.active_ingredient || '-'}</td>
                                </tr>
                            `)}
                        </tbody>
                    </table>
                    ${filteredMedications.length === 0 ? html`
                        <div class="empty-state">
                            <ha-icon icon="mdi:filter-remove"></ha-icon>
                            <p>${localize('medications_manager.no_results')}</p>
                        </div>
                    ` : nothing}
                `}
            </div>
        `;
    }

    // Private helper methods
    private _getFilteredMedications(): Medication[] {
        const localize = getLocalizeFunction(this.hass!);
        
        return this.medications?.all
            .filter(med => {
                const matchesName = !this._filterName.trim() || 
                    med.name.toLowerCase().includes(this._filterName.toLowerCase());
                
                const matchesUnits = !this._filterUnits.trim() || 
                    (med.units?.toLowerCase().includes(this._filterUnits.toLowerCase()) ?? false);
                
                const antipyreticText = med.is_antipyretic 
                    ? localize('medications_manager.yes').toLowerCase()
                    : localize('medications_manager.no').toLowerCase();
                const matchesAntipyretic = !this._filterAntipyretic.trim() || 
                    antipyreticText.includes(this._filterAntipyretic.toLowerCase());
                
                const matchesIngredient = !this._filterIngredient.trim() || 
                    (med.active_ingredient?.toLowerCase().includes(this._filterIngredient.toLowerCase()) ?? false);
                
                return matchesName && matchesUnits && matchesAntipyretic && matchesIngredient;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

    }

    private _handleAdd() {
        showMedicationDialog(this, {
            medications: this.medications,
            onClose: (changed: boolean) => {

            }
        });
    }

    private _handleEdit(medication: Medication) {
        showMedicationDialog(this, {
            medication: medication,
            medications: this.medications,
            onClose: (changed: boolean) => {
                
            }
        });
    }
}

export function showMedicationDialog(element: HTMLElement, params: import('./medilog-medication-dialog').MedicationDialogParams) {
    const event = new CustomEvent("show-dialog", {
        bubbles: true,
        composed: true,
        detail: {
            dialogTag: "medilog-medication-dialog",
            dialogImport: () => import("./medilog-medication-dialog"),
            dialogParams: params
        }
    });
    element.dispatchEvent(event);
}
