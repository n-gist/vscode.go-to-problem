import * as vscode from 'vscode'
import { NavigationConfiguration } from '../navigation/navigationConfiguration'
import { PeekStyle } from '../types/peek'
import { PeekHover } from './peekHover'
import { PeekStandard } from './peekStandard'

export class Peek {

    static shutdown() {
        this.hide()
        PeekStandard.shutdown()
        PeekHover.shutdown()
    }
    
    static peek(editor: vscode.TextEditor, config: NavigationConfiguration, problemSeverity: vscode.DiagnosticSeverity, revealCallback: () => void) {
        this.hide()
        revealCallback()
        
        if (config.peek === undefined) return
        if (config.peek.severity[problemSeverity] !== true) return
        
        const peekStyle = config.peek.style === PeekStyle.STANDARD
            ? PeekStandard.peekStyle(problemSeverity)
            : PeekStyle.HOVER

        switch (peekStyle) {
            case PeekStyle.STANDARD: {
                PeekStandard.show()
                revealCallback()
                break
            }
            case PeekStyle.HOVER: {
                PeekHover.show(editor)
                break
            }
        }
    }
    
    static cancel() {
        PeekHover.cancel()
    }
    
    static hide() {
        PeekStandard.hide()
    }

}
