import * as vscode from 'vscode'
import { Navigation } from './navigation/navigation'
import { NavigationConfiguration } from './navigation/navigationConfiguration'
import { Peek } from './peek/peek'
import { CONST_NUMBER_OF_SETS } from './settings/constants'
import { Settings } from './settings/settings'
import { ExtensionCommand } from './types/extension'
import { NavigationDirection } from './types/navigation'

export class GoToProblem {
    
    private static readonly navigation: {
        readonly forward: Navigation
        readonly backward: Navigation
    }[] = []
    
    static initialize() {
        Settings.initialize(this.onSettingsUpdated)
    }
    
    static onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent) {
        Settings.onDidChangeConfiguration(event)
    }
    
    private static onSettingsUpdated(this: void) {
        Peek.shutdown()
        NavigationConfiguration.onSettingsUpdated()
        
        if (GoToProblem.navigation.length === 0) {
            for (let i = 1; i <= CONST_NUMBER_OF_SETS; i++) {
                GoToProblem.navigation.push({
                    forward: new Navigation(i, NavigationDirection.FORWARD),
                    backward: new Navigation(i, NavigationDirection.BACKWARD)
                })
            }
        } else {
            for (const navigation of GoToProblem.navigation) {
                navigation.forward.onSettingsUpdated()
                navigation.backward.onSettingsUpdated()
            }
        }
    }
    
    static forEachCommand(callback: (command: ExtensionCommand) => void) {
        for (const set of this.navigation) {
            callback(set.forward.cmd)
            callback(set.forward.cmdInWorkspace)
            callback(set.backward.cmd)
            callback(set.backward.cmdInWorkspace)
            callback(set.forward.cmdOpenAll)
        }
    }

    static shutdown() {
        Peek.shutdown()
    }
    
}
