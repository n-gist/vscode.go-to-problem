import * as vscode from 'vscode'
import { Settings } from '../settings/settings'

export class PeekHover {
    
    private static delayInterval: ReturnType<typeof setInterval> | undefined = undefined
    
    static show(editor: vscode.TextEditor) {
        if (editor.visibleRanges.length === 0) return
        
        if (!Settings.smoothScrollingIsTrue) {
            this.reshow()
            return
        }
        
        const checker: {
            readonly editor: vscode.TextEditor
            readonly selection: vscode.Selection
            readonly startTime: number
            readonly minScrollTime: number
            lastStartLine: number
            lastEndLine: number
            lineMatched: boolean
        } = {
            editor,
            selection: editor.selection,
            startTime: Date.now(),
            minScrollTime: Settings.general.peekHoverSmoothScrollingDelay,
            lastStartLine: editor.visibleRanges[0].start.line,
            lastEndLine: editor.visibleRanges[editor.visibleRanges.length - 1].end.line,
            lineMatched: false
        }
        
        this.delayInterval = setInterval(() => {
            const scrollingTime = Date.now() - checker.startTime
            
            const cEditor = checker.editor
            const cVisibleRanges = cEditor.visibleRanges
            
            if (
                scrollingTime > checker.minScrollTime + 500 ||
                vscode.window.activeTextEditor !== cEditor ||
                cVisibleRanges.length === 0 ||
                cEditor.selection.isEqual(checker.selection) === false
            ) {
                this.cancel()
                return
            }
            
            const viewStartLine = cVisibleRanges[0].start.line
            const viewEndLine = cVisibleRanges[cVisibleRanges.length - 1].end.line
            if (checker.selection.start.line < viewStartLine || checker.selection.start.line > viewEndLine) return
            
            if (scrollingTime > checker.minScrollTime) {
                if (viewStartLine === checker.lastStartLine && viewEndLine === checker.lastEndLine) {
                    if (checker.lineMatched) {
                        this.cancel()
                        this.reshow()
                        return
                    }
                    checker.lineMatched = true
                } else {
                    checker.lineMatched = false
                }
                checker.lastStartLine = viewStartLine
                checker.lastEndLine = viewEndLine
            }
            
        }, 10)
    }
    
    static cancel() {
        if (this.delayInterval === undefined) return
        
        clearInterval(this.delayInterval)
        this.delayInterval = undefined
    }
    
    private static reshow() {
        vscode.commands.executeCommand('editor.action.hideHover')
            .then(this.showHover)
    }
    
    private static showHover(this: void) {
        vscode.commands.executeCommand('editor.action.showHover')
    }

    static shutdown() {
        this.cancel()
    }

}
