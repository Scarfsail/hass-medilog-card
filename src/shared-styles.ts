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
`