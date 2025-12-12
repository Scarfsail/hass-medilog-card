import { LitElement, css, html, nothing } from "lit-element"
import { customElement, property, state } from "lit/decorators.js";
import { Medication } from "./models";
import type { HomeAssistant } from "../hass-frontend/src/types";
import { sharedStyles } from "./shared-styles";
import { getLocalizeFunction } from "./localize/localize";
import "./medilog-medication-dialog";
import "./medilog-medications-table";
import "./medilog-medications-usage";
import { DataStore } from "./data-store";

@customElement("medilog-medications-manager")
export class MedilogMedicationsManager extends LitElement {
    // Static styles
    static styles = [sharedStyles, css`
        .container {
            padding: 16px;
        }

        .controls {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            align-items: center;
        }

        .view-toggle {
            display: flex;
            gap: 4px;
            flex: 1;
        }

        .add-button {
            --mdc-theme-primary: var(--success-color);
            width: auto;
            height: 48px;
            font-weight: bold;
            border-radius: 12px;
            padding: 0 24px;
            --mdc-button-raised-box-shadow: 0 3px 8px rgba(0,0,0,0.15);
            --mdc-button-raised-hover-box-shadow: 0 5px 12px rgba(0,0,0,0.25);
        }

        .add-button ha-icon {
            margin-right: 8px;
            --mdc-icon-size: 20px;
        }
    `]

    // Public properties
    @property({ attribute: false }) public hass?: HomeAssistant;
    @property({ attribute: false }) public dataStore!: DataStore;

    // State properties
    @state() private viewMode: 'list' | 'usage' = 'list';
    @state() private _selectedMedicationId?: string;

    // Lifecycle methods
    connectedCallback() {
        super.connectedCallback();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
    }


    // Render method
    render() {
        if (!this.hass) {
            return nothing;
        }

        const localize = getLocalizeFunction(this.hass);

        return html`
            <div class="container">
                <div class="controls">
                    <div class="view-toggle">
                        <ha-button .appearance=${this.viewMode === 'list' ? 'accent' : 'plain'} @click=${() => this.viewMode = 'list'}>
                            <ha-icon icon="mdi:format-list-bulleted"></ha-icon>
                        </ha-button>
                        <ha-button .appearance=${this.viewMode === 'usage' ? 'accent' : 'plain'} @click=${() => this.viewMode = 'usage'}>
                            <ha-icon icon="mdi:chart-box"></ha-icon>
                        </ha-button>
                    </div>
                    <ha-button @click=${this._handleAdd} class="add-button">
                        <ha-icon icon="mdi:plus"></ha-icon>
                        ${localize('medications_manager.add_medication')}
                    </ha-button>
                </div>

                ${this.viewMode === 'list' ? html`
                    <medilog-medications-table
                        .hass=${this.hass}
                        .dataStore=${this.dataStore}
                        .onUsageClick=${this._handleUsageClick.bind(this)}
                    ></medilog-medications-table>
                ` : html`
                    <medilog-medications-usage
                        .hass=${this.hass}
                        .dataStore=${this.dataStore}
                        .selectedMedicationId=${this._selectedMedicationId}
                    ></medilog-medications-usage>
                `}
            </div>
        `;
    }

    // Private helper methods
    private _handleAdd() {
        showMedicationDialog(this, {
            medications: this.dataStore.medications,
            onClose: (changed: boolean) => {

            }
        });
    }

    private _handleUsageClick(medicationId: string) {
        this._selectedMedicationId = medicationId;
        this.viewMode = 'usage';
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
