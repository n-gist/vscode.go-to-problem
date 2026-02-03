import * as vscode from 'vscode'
import { Validation } from '../settings/validation'
import { NavigationConfigurationPeek } from '../types/navigation'
import { SettingsNavigation } from '../types/settings'
import { Filter } from './filter'

export class NavigationConfiguration {
    private static readonly list: NavigationConfiguration[] = []
    
    readonly settings: SettingsNavigation
    readonly reveal: vscode.TextEditorRevealType
    readonly peek: NavigationConfigurationPeek | undefined
    readonly filter: Filter | undefined

    private readonly baskets: (number | undefined)[]

    private constructor(settings: SettingsNavigation) {
        this.settings = settings
        this.reveal = Validation.configReveal(settings)
        this.peek = Validation.configPeek(settings)
        this.filter = Filter.get(settings)
        
        this.baskets = Validation.configSeverityBaskets(settings)
        
        NavigationConfiguration.list.push(this)
    }

    basket(severity: vscode.DiagnosticSeverity) {
        return this.baskets[severity]
    }
    
    static get(settings: SettingsNavigation) {
        for (const config of this.list) {
            if (config.settings === settings) return config
        }
        
        return new NavigationConfiguration(settings)
    }
    
    static onSettingsUpdated() {
        this.list.length = 0
        Filter.onSettingsUpdated()
    }
}
