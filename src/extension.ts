import * as vscode from 'vscode'
import { GoToProblem } from './goToProblem'

export function activate(context: vscode.ExtensionContext) {
    
    GoToProblem.initialize()

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(
            event => {
                GoToProblem.onDidChangeConfiguration(event)
            }
        )
    )
    
    GoToProblem.forEachCommand(
        command => {
            context.subscriptions.push(
                vscode.commands.registerCommand(command.id, command.call)
            )
        }
    )
    
}

export function deactivate() {
    GoToProblem.shutdown()
}
