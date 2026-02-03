import * as vscode from 'vscode'
import { CONST_CLEANUP_INTERVAL } from '../settings/constants'
import { Settings } from '../settings/settings'
import { Validation } from '../settings/validation'
import { PeekAutoHide, PeekStyle } from '../types/peek'

export class PeekStandard {
    private static instance: PeekStandard | undefined = undefined
    
    private readonly vscDisposables: vscode.Disposable[]
    private readonly map: Map<vscode.TextEditor, State>
    private readonly current: Current
    private lastActivityTime: number
    
    private constructor() {
        this.vscDisposables = []
        this.map = new Map()
        this.current = {
            editor: undefined,
            state: undefined
        }
        this.lastActivityTime = Date.now()
        
        this.addListeners()
    }
    
    private addListeners() {
        this.vscDisposables.push(
            vscode.window.onDidChangeActiveTextEditor(PeekStandard.onDidChangeActiveTextEditor)
        )
        
        const autoHide = Validation.configStandardPeekAutoHide(Settings.general)
        if (autoHide === false) return
        
        if (autoHide === true || autoHide.includes(PeekAutoHide.EDIT)) {
            this.vscDisposables.push(
                vscode.workspace.onDidChangeTextDocument(PeekStandard.hide)
            )
        }
        
        if (autoHide === true) {
            this.vscDisposables.push(
                vscode.window.onDidChangeTextEditorSelection(PeekStandard.hide)
            )
        } else {
            const keyboard = autoHide.includes(PeekAutoHide.MOVE_KEYBOARD)
            const mouse = autoHide.includes(PeekAutoHide.MOVE_MOUSE)
            const other = autoHide.includes(PeekAutoHide.MOVE_OTHER)
            
            if (keyboard && mouse && other) {
                this.vscDisposables.push(
                    vscode.window.onDidChangeTextEditorSelection(PeekStandard.hide)
                )
            } else if (keyboard || mouse || other) {
                const kindMap: boolean[] = []
                kindMap[vscode.TextEditorSelectionChangeKind.Keyboard] = keyboard
                kindMap[vscode.TextEditorSelectionChangeKind.Command] = other
                kindMap[vscode.TextEditorSelectionChangeKind.Mouse] = mouse
                
                this.vscDisposables.push(
                    vscode.window.onDidChangeTextEditorSelection(
                        e => {
                            const kind = e.kind ?? vscode.TextEditorSelectionChangeKind.Command
                            if (kindMap[kind] === true) PeekStandard.hide()
                        }
                    )
                )
            }
        }
    }
    private show() {
        vscode.commands.executeCommand('editor.action.marker.next')
            .then(PeekStandard.onPeekShown)
    }
    private onPeekShown() {
        this.currentEnsure()
        
        if (this.current.state === undefined) return
        
        this.current.state.open = true
        this.lastActivityTime = Date.now()
    }
    private hide() {
        this.currentSync()
        
        if (
            this.current.state === undefined ||
            this.current.state.open === false
        ) return
        
        this.current.state.open = false
        vscode.commands.executeCommand('closeMarkersNavigation')
    }
    private currentSync() {
        const editor = vscode.window.activeTextEditor
        if (this.current.editor === editor) return
        
        this.current.editor = editor
        if (editor === undefined) {
            this.current.state = undefined
            return
        }
        
        this.current.state = this.map.get(editor)
    }
    private currentEnsure() {
        this.currentSync()
        
        if (this.current.state !== undefined) return 
        if (this.current.editor === undefined) return
        
        const newState: State = {
            open: false
        }
        this.map.set(this.current.editor, newState)
        
        this.current.state = newState
    }
    private dispose() {
        for (const disposable of this.vscDisposables) disposable.dispose()
        this.vscDisposables.length = 0
    }
    private cleanup() {
        const map = this.map
        const editors = vscode.window.visibleTextEditors
        const editorsLength = editors.length
        keys: for (const editor of map.keys()) {
            for (let j = 0; j < editorsLength; j++) {
                if (editors[j] === editor) continue keys
            }
            map.delete(editor)
        }
    }
    private hasOpenState() {
        const map = this.map
        for (const state of map.values()) {
            if (state.open) return true
        }
        
        return false
    }

    static shutdown() {
        if (this.instance === undefined) return
        
        this.instance.dispose()
        this.instance = undefined
    }
    static peekStyle(severity: vscode.DiagnosticSeverity) {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return PeekStyle.STANDARD
            case vscode.DiagnosticSeverity.Warning:
            case vscode.DiagnosticSeverity.Information: {
                if (Settings.sortOrderIsPosition) return PeekStyle.STANDARD
                if (Settings.general.problemsSortOrderNotification) {
                    this.sortOrderWrongSettingInformationMessage()
                }
                return PeekStyle.HOVER
            }
        }
        
        return PeekStyle.HOVER
    }
    static show() {
        this.instance ??= new PeekStandard()
        this.instance.show()
    }
    static hide(this: void) {
        if (PeekStandard.instance === undefined) return
        
        PeekStandard.instance.hide()
    }
    
    private static onDidChangeActiveTextEditor(this: void) {
        const instance = PeekStandard.instance!
        
        const time = Date.now()
        
        if (time - instance.lastActivityTime < CONST_CLEANUP_INTERVAL) return
        
        instance.cleanup()
        
        if (instance.hasOpenState()) {
            instance.lastActivityTime = time
        } else {
            PeekStandard.shutdown()
        }
    }
    private static onPeekShown(this: void) {
        if (PeekStandard.instance !== undefined) PeekStandard.instance.onPeekShown()
    }
    private static sortOrderWrongSettingInformationMessage() {
        vscode.window.showInformationMessage(
            SetSortOrderOption.MESSAGE,
            SetSortOrderOption.USER,
            SetSortOrderOption.WORKSPACE
        ).then(
            value => {
                if (value === undefined) return
                
                switch (value) {
                    case SetSortOrderOption.USER:
                        this.adjustSortOrderSetting(vscode.ConfigurationTarget.Global)
                        break
                    case SetSortOrderOption.WORKSPACE:
                        if (Settings.isWorkspace) {
                            this.adjustSortOrderSetting(vscode.ConfigurationTarget.Workspace)
                        } else {
                            vscode.window.showWarningMessage('No open Workspace at the moment')
                        }
                        break
                }
            }
        )
    }
    private static adjustSortOrderSetting(scope: vscode.ConfigurationTarget) {
        vscode.workspace.getConfiguration('problems')
            .update('sortOrder', 'position', scope)
    }
}

interface State {
    open: boolean
}

interface Current {
    editor: vscode.TextEditor | undefined
    state: State | undefined
}

const enum SetSortOrderOption {
    MESSAGE = 'For the standard style problem peeking to work correctly when using Go To Problem extension, it is necessary to set "problems.sortOrder" setting as "position". Set it for you?',
    USER = 'In User Settings',
    WORKSPACE = 'In Workspace Settings'
}
