import * as vscode from 'vscode'
import { Peek } from '../peek/peek'
import { CONST_EXTENSION_NAME, CONST_OPENALL_WARNING_SOURCES_NUM } from '../settings/constants'
import { Settings } from '../settings/settings'
import { ExtensionCommand } from '../types/extension'
import { NavigationDirection } from '../types/navigation'
import { NavigationConfiguration } from './navigationConfiguration'

export class Navigation {
    private readonly setNumber: number
    private readonly direction: NavigationDirection
    private config: NavigationConfiguration
    
    constructor(setNumber: number, direction: NavigationDirection) {
        this.setNumber = setNumber
        this.direction = direction
        this.config = this.getConfig()
    }
    
    get cmd(): ExtensionCommand {
        return {
            id: this.command(),
            call: () => { this.navigate() }
        }
    }
    get cmdInWorkspace(): ExtensionCommand {
        return {
            id: this.command(true),
            call: () => { this.navigateInWorkspace() }
        }
    }
    get cmdOpenAll(): ExtensionCommand {
        return {
            id: this.commandId('openAll'),
            call: () => { this.openAll() }
        }
    }
    private command(inWorkspace = false) {
        const direction = this.direction === NavigationDirection.FORWARD ? 'next' : 'prev'
        const affix = inWorkspace ? 'InWorkspace' : ''
        return this.commandId(`${direction}${affix}`)
    }
    private commandId(cmd: string) {
        return `${CONST_EXTENSION_NAME}.${this.setNumber.toString()}.${cmd}`
    }
    
    onSettingsUpdated() {
        this.config = this.getConfig()
    }
    private getConfig() {
        return NavigationConfiguration.get(Settings.navigation[this.setNumber - 1])
    }

    private navigate() {
        if (!this.config.settings.enabled) return

        const next = this.nextInActiveEditor()
        if (next === undefined) return

        this.jumpInActiveEditor(next.diagnostic)
    }
    private navigateInWorkspace() {
        if (!this.config.settings.enabled) return
        
        
        let segment = WorkspaceSegment.UNDEFINED
        let basket = Number.POSITIVE_INFINITY


        const nextInActiveEditor = this.nextInActiveEditor()
        
        
        if (nextInActiveEditor !== undefined) {
            if (this.config.settings.prioritizeActive) {
                segment = WorkspaceSegment.ACTIVE_EDITOR
                basket = 0
            } else if (nextInActiveEditor.wrap === false) {
                segment = WorkspaceSegment.ACTIVE_EDITOR
                basket = nextInActiveEditor.basket
            }
        }


        const nextInRestWorkspace = basket > 0
            ? this.nextInRestWorkspace()
            : undefined
        
            
        if (
            nextInRestWorkspace !== undefined &&
            nextInRestWorkspace.basket < basket
        ) {
            segment = WorkspaceSegment.REST_WORKSPACE
            basket = nextInRestWorkspace.basket
        }
        

        if (
            nextInActiveEditor !== undefined &&
            nextInActiveEditor.basket < basket
        ) {
            segment = WorkspaceSegment.ACTIVE_EDITOR
            basket = nextInActiveEditor.basket
        }

        
        switch (segment) {
            case WorkspaceSegment.ACTIVE_EDITOR:
                this.jumpInActiveEditor(nextInActiveEditor!.diagnostic)
                break
            case WorkspaceSegment.REST_WORKSPACE:
                this.jumpInRestWorkspace(nextInRestWorkspace!)
                break
        }
    }
    private openAll() {
        const pathsOpen: string[] = []
        const tabGroups = vscode.window.tabGroups
        for (const group of tabGroups.all) {
            for (const tab of group.tabs) {
                if (tab.input instanceof vscode.TabInputText) {
                    pathsOpen.push(tab.input.uri.path)
                }
            }
        }
        
        const urisToOpen: vscode.Uri[] = []
        this.searchInRestWorkspace(
            pUri => {
                urisToOpen.push(pUri)
                return SearchControl.SKIP_URI
            }
        )
        
        if (urisToOpen.length === 0) return
        
        if (urisToOpen.length > CONST_OPENALL_WARNING_SOURCES_NUM) {
            vscode.window.showInformationMessage(
                `Found ${urisToOpen.length} sources containing problems. Proceed?`,
                { modal: true },
                'Yes'
            ).then(
                answer => {
                    if (answer !== 'Yes') return
                    void this.openSources(pathsOpen, urisToOpen)
                }
            )
        } else {
            void this.openSources(pathsOpen, urisToOpen)
        }
    }
    
    private nextInActiveEditor(): NextProblemActiveEditor | undefined {
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return undefined
        
        const config = this.config
        
        if (config.filter !== undefined && !config.filter.isIncluded(editor.document.uri)) return undefined

        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri)
        const length = diagnostics.length
        if (length === 0) return undefined

        diagnostics.sort(compareDiagnostic)

        const startI = this.nextDiagnosticIndex(diagnostics, editor.selection.start)
        if (startI === undefined) return undefined

        const result = {
            basket: Number.POSITIVE_INFINITY,
            index: -1
        }
        const shift = this.direction === NavigationDirection.FORWARD ? 1 : length - 1
        let index = startI
        while (true) {
            const basket = config.basket(diagnostics[index].severity)

            if (basket !== undefined && basket < result.basket) {
                result.basket = basket
                result.index = index
                if (basket === 0) break
            }

            index = (index + shift) % length
            if (index === startI) break
        }

        if (result.index < 0) return undefined

        const diagnostic = diagnostics[result.index]
        const diagnosticStart = diagnostic.range.start
        const selectionStart = editor.selection.start

        const wrap =
            (this.direction === NavigationDirection.FORWARD && diagnosticStart.isBeforeOrEqual(selectionStart)) ||
            (this.direction === NavigationDirection.BACKWARD && diagnosticStart.isAfterOrEqual(selectionStart))

        return {
            basket: result.basket,
            editor,
            diagnostic,
            wrap
        }
    }
    private nextDiagnosticIndex(diagnostics: vscode.Diagnostic[], start: vscode.Position): number | undefined {
        if (diagnostics.length === 0) return undefined

        const last = diagnostics.length - 1
        if (this.direction === NavigationDirection.FORWARD) {
            for (let i = 0; i <= last; i++) {
                if (diagnostics[i].range.start.isAfter(start)) return i
            }
            return 0
        } else {
            for (let i = last; i >= 0; i--) {
                if (diagnostics[i].range.start.isBefore(start)) return i
            }
            return last
        }
    }
    private nextInRestWorkspace(): NextProblemWorkspace | undefined {
        let basket = Number.POSITIVE_INFINITY
        let uri: vscode.Uri | undefined = undefined
        let diagnostic: vscode.Diagnostic | undefined = undefined
        
        this.searchInRestWorkspace(
            (pUri, pDiagnostic, pBasket) => {
                if (pBasket < basket) {
                    basket = pBasket
                    uri = pUri
                    diagnostic = pDiagnostic
                    if (basket === 0) return SearchControl.BREAK
                }
                
                return SearchControl.CONTINUE
            }
        )
        
        if (uri === undefined) return undefined
        
        return {
            basket,
            uri,
            diagnostic: diagnostic!
        }
    }
    private searchInRestWorkspace(problemCallback: (uri: vscode.Uri, diagnostic: vscode.Diagnostic, basket: number) => SearchControl) {
        const diagnosticss = vscode.languages.getDiagnostics()
        const length = diagnosticss.length
        if (length === 0) return

        diagnosticss.sort(compareDiagnostics)

        const startI = this.nextDiagnosticsIndex(diagnosticss)
        if (startI === undefined) return

        const direction = this.direction === NavigationDirection.FORWARD ? 1 : -1
        const endI = this.isPrevDiagnosticsFromActiveEditor(diagnosticss, startI)
            ? (startI - direction + length) % length
            : startI

        const config = this.config
        const filter = config.filter
        const shift = this.direction === NavigationDirection.FORWARD ? 1 : length - 1
        let index = startI
        while (true) {
            const entry = diagnosticss[index]
            const diagnostics = entry[1]
            const dLength = diagnostics.length
            if (dLength !== 0 && (filter === undefined || filter.isIncluded(entry[0]))) {
                diagnostics.sort(compareDiagnostic)
                let checkI = direction > 0 ? 0 : dLength - 1
                for (let i = 0; i < dLength; i++) {
                    const diagnostic = diagnostics[checkI]
                    const basket = config.basket(diagnostic.severity)
                    if (basket !== undefined) {
                        const control = problemCallback(entry[0], diagnostic,  basket)
                        if (control !== SearchControl.CONTINUE) {
                            if (control === SearchControl.BREAK) return
                            if (control === SearchControl.SKIP_URI) break
                        }
                    }
                    checkI += direction
                }
            }

            index = (index + shift) % length
            if (index === endI) break
        }
    }
    private nextDiagnosticsIndex(diagnosticss: DiagnosticssEntry[]): number | undefined {
        const length = diagnosticss.length
        if (length === 0) return undefined

        const editor = vscode.window.activeTextEditor
        if (editor !== undefined) {
            const currentPath = editor.document.uri.path
            for (let i = 0; i < length; i++) {
                if (diagnosticss[i][0].path > currentPath) {
                    if (this.direction === NavigationDirection.FORWARD) {
                        return i
                    } else {
                        const nextI = (i - 1 + length) % length
                        if (diagnosticss[nextI][0].path !== currentPath) return nextI
                        return (nextI - 1 + length) % length
                    }
                }
            }
        }

        return this.direction === NavigationDirection.FORWARD ? 0 : length - 1
    }
    private isPrevDiagnosticsFromActiveEditor(diagnosticss: DiagnosticssEntry[], startI: number): boolean {
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return false

        const length = diagnosticss.length
        const prevI = (startI + (this.direction === NavigationDirection.FORWARD ? length - 1 : 1)) % length

        return diagnosticss[prevI][0].path === editor.document.uri.path
    }
    private jumpInRestWorkspace(problem: NextProblemWorkspace) {
        Peek.cancel()
        Peek.hide()
        
        const options = this.config.settings.openInPreview ? textDocumentOpenInPreview : textDocumentOpenNotInPreview
        const editor = vscode.window.activeTextEditor
        vscode.window.showTextDocument(problem.uri, options).then(
            () => {
                if (vscode.window.activeTextEditor === editor) return
                this.jumpInActiveEditor(problem.diagnostic)
            }
        )
    }
    private jumpInActiveEditor(diagnostic: vscode.Diagnostic) {
        Peek.cancel()
        
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return
        
        const position = diagnostic.range.start
        editor.selection = new vscode.Selection(position, position)
        
        Peek.peek(
            editor,
            this.config,
            diagnostic.severity,
            () => {
                if (editor !== vscode.window.activeTextEditor) return
                editor.revealRange(editor.selection, this.config.reveal)
            }
        )
    }
    private async openSources(pathsOpen: string[], urisToOpen: vscode.Uri[]) {
        const initialEditor = vscode.window.activeTextEditor
        
        const length = pathsOpen.length
        filter: for (const uri of urisToOpen) {
            const path = uri.path
            for (let i = 0; i < length; i++) {
                if (path === pathsOpen[i]) continue filter
            }
            await vscode.window.showTextDocument(uri, textDocumentOpenNotInPreview)
        }
        
        if (initialEditor !== undefined) {
            vscode.window.showTextDocument(initialEditor.document)
        } else {
            vscode.window.showTextDocument(urisToOpen[0])
        }
    }
}

interface NextProblemActiveEditor {
    readonly basket: number
    readonly editor: vscode.TextEditor
    readonly diagnostic: vscode.Diagnostic
    readonly wrap: boolean
}

interface NextProblemWorkspace {
    readonly basket: number
    readonly uri: vscode.Uri
    readonly diagnostic: vscode.Diagnostic
}

type DiagnosticssEntry = [vscode.Uri, vscode.Diagnostic[]]

const enum WorkspaceSegment {
    UNDEFINED,
    ACTIVE_EDITOR,
    REST_WORKSPACE
}

const enum SearchControl {
    CONTINUE,
    BREAK,
    SKIP_URI
}

const compareDiagnostics = (entry1: DiagnosticssEntry, entry2: DiagnosticssEntry) => {
    if (entry1[0].path < entry2[0].path) return -1
    if (entry1[0].path > entry2[0].path) return 1
    return 0
}

const compareDiagnostic = (diagnostic1: vscode.Diagnostic, diagnostic2: vscode.Diagnostic) => {
    if (diagnostic1.range.start.isBefore(diagnostic2.range.start)) return -1
    if (diagnostic1.range.start.isAfter(diagnostic2.range.start)) return 1
    if (diagnostic1.severity < diagnostic2.severity) return -1
    if (diagnostic1.severity > diagnostic2.severity) return 1
    return 0
}

const textDocumentOpenInPreview: vscode.TextDocumentShowOptions = {
    preview: true
}
const textDocumentOpenNotInPreview: vscode.TextDocumentShowOptions = {
    preview: false
}
