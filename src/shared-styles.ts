import { css } from "lit-element"
export const sharedStyles = css`
        ha-button.button-active {
            
            --mdc-theme-primary: var(--success-color);
            border-color: var(--primary-color);
            border: 1px solid var(--primary-color);
         }      
         ha-button.button-error{
            --mdc-theme-primary: var(--error-color);
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
        }
`

export const sharedTableStyles = css`
    table {
        border-collapse: collapse;
        margin-bottom: 16px;
    }
    
    table th {
        text-align: center;
        padding: 8px 8px;
        border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        color: var(--secondary-text-color);
        font-weight: 500;
    }
    
    table td {
        padding: 8px 8px;
        border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        text-align: center;
    }
    
    table tbody tr {
        cursor: pointer;
    }
    
    table tbody tr:hover {
        background-color: var(--primary-color);
        color: var(--text-primary-color);
    }
`