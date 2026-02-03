import * as vscode from 'vscode'
import { SettingsNavigation } from '../types/settings'
import { CONST_EXTENSION_NAME } from './constants'
import { Validation } from './validation'

export class Settings {
    static general = Validation.settingsGeneralDefaults
    static navigation: SettingsNavigation[] = []
    static smoothScrollingIsTrue = false
    static sortOrderIsPosition = false
    static isWorkspace = false
    
    private static onExtensionSettingsUpdated: (() => void) | undefined = undefined
    
    static initialize(onExtensionSettingsUpdated: () => void) {
        this.onExtensionSettingsUpdated = onExtensionSettingsUpdated
        
        const wsFolders = vscode.workspace.workspaceFolders
        this.isWorkspace = wsFolders !== undefined && wsFolders.length > 0
        
        this.update()
        this.updateSmoothScrolling()
        this.updateSortOrder()
    }
    
    static onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
        if (event.affectsConfiguration(CONST_EXTENSION_NAME)) {
            this.update()
        }
        
        if (event.affectsConfiguration('editor.smoothScrolling')) {
            this.updateSmoothScrolling()
        }
        
        if (event.affectsConfiguration('problems.sortOrder')) {
            this.updateSortOrder()
        }
    }
    
    private static update() {
        const configuration = vscode.workspace.getConfiguration(CONST_EXTENSION_NAME)
        
        this.general = Validation.settingsGeneral(configuration)
        
        this.navigation = Validation.settingsNavigation(configuration)
        
        this.onExtensionSettingsUpdated!()
    }
    
    private static updateSmoothScrolling() {
        this.smoothScrollingIsTrue
            = vscode.workspace.getConfiguration('editor').get<boolean>('smoothScrolling') === true
    }
    
    private static updateSortOrder() {
        this.sortOrderIsPosition
            = vscode.workspace.getConfiguration('problems').get<string>('sortOrder') === 'position'
    }
}
