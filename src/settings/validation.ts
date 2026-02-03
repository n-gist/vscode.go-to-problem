import * as vscode from 'vscode'
import { NavigationConfigurationPeek } from '../types/navigation'
import { PeekAutoHide, PeekStyle } from '../types/peek'
import { SettingsGeneral, SettingsNavigation } from '../types/settings'
import { CONST_NUMBER_OF_SETS } from './constants'

export class Validation {
    static settingsGeneral(configuration: vscode.WorkspaceConfiguration): SettingsGeneral {
        const defaults = this.settingsGeneralDefaults
        
        return {
            peekHoverSmoothScrollingDelay: vPositiveInteger(
                configuration.get<number>('peekHoverSmoothScrollingDelay'),
                defaults.peekHoverSmoothScrollingDelay
            ),
            peekStandardAutoHide: vRegExp(
                configuration.get<string>('peekStandardAutoHide'),
                defaults.peekStandardAutoHide,
                regexp.peekAutoHideList
            ),
            problemsSortOrderNotification: vBoolean(
                configuration.get<boolean>('problemsSortOrderNotification'),
                defaults.problemsSortOrderNotification
            )
        }
    }
    static settingsNavigation(configuration: vscode.WorkspaceConfiguration): SettingsNavigation[] {
        const base = this.settingsNavigationSet(
            configuration.get<Optional<SettingsNavigation>>('base'),
            settingsNavigationDefaults
        )
        
        const navigation: SettingsNavigation[] = []
        for (let i = 1; i <= CONST_NUMBER_OF_SETS; i++) {
            navigation.push(
                Validation.settingsNavigationSet(
                    configuration.get<Optional<SettingsNavigation>>(i.toString()),
                    base
                )
            )
        }
        
        return navigation
    }
    static get settingsGeneralDefaults() {
        return settingsGeneralDefaults
    }
    
    static configSeverityBaskets(settings: SettingsNavigation): (number | undefined)[] {
        const baskets: (number | undefined)[] = []
        for (const severity of map.severity.values()) baskets[severity] = undefined
        
        const groups_str = settings.severity.split('>')
        for (let groupI = 0; groupI < groups_str.length; groupI++) {
            for (const group_severity_str of groups_str[groupI].trim().split('|')) {
                const severity = Validation.severity(group_severity_str.trim())
                baskets[severity] ??= groupI
            }
        }

        return baskets
    }
    static configReveal(settings: SettingsNavigation): vscode.TextEditorRevealType {
        return vMap(map.reveal, settings.reveal, vscode.TextEditorRevealType.InCenter)
    }
    static configPeek(settings: SettingsNavigation): NavigationConfigurationPeek | undefined {
        if (!settings.peek.enabled) return undefined
        
        return {
            enabled: true,
            severity: Validation.peekSeverity(settings),
            style: vMap(map.peekStyle, settings.peek.style, PeekStyle.STANDARD)
        }
    }
    static configStandardPeekAutoHide(settings: SettingsGeneral): PeekAutoHide[] | boolean {
        const off: string = LPeekAutoHide.OFF
        if (settings.peekStandardAutoHide === off) return false
        
        const on: string = LPeekAutoHide.ON
        if (settings.peekStandardAutoHide === on) return true
        
        const list: PeekAutoHide[] = []
        for (const autoHide_str of settings.peekStandardAutoHide.split(',')) {
            const autoHide = map.peekAutoHide.get(autoHide_str.trim())
            if (autoHide !== undefined) list.push(autoHide)
        }
        return list
    }
    
    private static settingsNavigationSet(navigation: Optional<SettingsNavigation>, base: SettingsNavigation): SettingsNavigation {
        if (navigation === undefined) return base
        
        return {
            enabled: vBoolean(navigation.enabled, base.enabled),
            severity: vRegExp(navigation.severity, base.severity, regexp.severityPrioritized),
            reveal: vRegExp(navigation.reveal, base.reveal, regexp.reveal),
            openInPreview: vBoolean(navigation.openInPreview, base.openInPreview),
            prioritizeActive: vBoolean(navigation.prioritizeActive, base.prioritizeActive),
            peek: vPeek(navigation.peek, base.peek),
            filter: vFilter(navigation.filter, base.filter)
        }
    }
    private static peekSeverity(settings: SettingsNavigation) {
        const list: boolean[] = []
        for (const severity of map.severity.values()) list[severity] = false
        
        for (const severity_str of settings.peek.severity.split(',')) {
            list[this.severity(severity_str.trim())] = true
        }
        
        return list
    }
    private static severity(severity: string) {
        return vMap(map.severity, severity, vscode.DiagnosticSeverity.Error)
    }
}

type Optional<T>
    = (
        T extends (infer Entry)[]
            ? Entry[]
            : T extends object
                ? {
                    [K in keyof T]: Optional<T[K]>
                }
                : T
    )
    | undefined

const settingsGeneralDefaults: SettingsGeneral = {
    peekHoverSmoothScrollingDelay: 175,
    peekStandardAutoHide: LPeekAutoHide.OFF,
    problemsSortOrderNotification: true
}

const settingsNavigationDefaults: SettingsNavigation = {
    enabled: true,
    severity: `${LSeverity.ERROR}|${LSeverity.WARNING}|${LSeverity.INFO}`,
    reveal: LReveal.CENTER,
    prioritizeActive: false,
    openInPreview: true,
    peek: {
        enabled: true,
        severity: `${LSeverity.ERROR}, ${LSeverity.WARNING}, ${LSeverity.INFO}, ${LSeverity.HINT}`,
        style: LPeekStyle.STANDARD
    },
    filter: {
        include: [],
        exclude: [],
        caseSensitive: true,
        workspaceRelative: true
    }
}


const enum LSeverity {
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    HINT = 'hint'
}

const enum LPeekStyle {
    STANDARD = 'standard',
    HOVER = 'hover'
}

const enum LReveal {
    CENTER = 'center',
    TOP = 'top',
    LITTLE = 'little',
    ADAPTIVE = 'adaptive'
}

const enum LPeekAutoHide {
    OFF = 'off',
    ON = 'on',
    EDIT = 'edit',
    MOVE_KEYBOARD = 'moveKeyboard',
    MOVE_MOUSE = 'moveMouse',
    MOVE_OTHER = 'moveOther'
}


const re_severity = `(${LSeverity.ERROR}|${LSeverity.WARNING}|${LSeverity.INFO}|${LSeverity.HINT})`
const re_autoHide = `(${LPeekAutoHide.EDIT}|${LPeekAutoHide.MOVE_KEYBOARD}|${LPeekAutoHide.MOVE_MOUSE}|${LPeekAutoHide.MOVE_OTHER})`
const regexp = {
    severityPrioritized: new RegExp(`^${re_severity}(\\s*[|>]\\s*${re_severity}){0,3}$`),
    reveal: new RegExp(`^${LReveal.LITTLE}|${LReveal.CENTER}|${LReveal.TOP}|${LReveal.ADAPTIVE}$`),
    severityList: new RegExp(`^${re_severity}(,\\s*${re_severity}){0,3}$`),
    peekStyle: new RegExp(`^${LPeekStyle.STANDARD}|${LPeekStyle.HOVER}$`),
    peekAutoHideList: new RegExp(`^(${LPeekAutoHide.OFF}|${LPeekAutoHide.ON})|(${re_autoHide}(,\\s*${re_autoHide}){0,3})$`)
}


const map: {
    readonly severity: Map<string, vscode.DiagnosticSeverity>
    readonly peekStyle: Map<string, PeekStyle>
    readonly reveal: Map<string, vscode.TextEditorRevealType>
    readonly peekAutoHide: Map<string, PeekAutoHide>
} = {
    severity: new Map([
        [LSeverity.ERROR,   vscode.DiagnosticSeverity.Error],
        [LSeverity.WARNING, vscode.DiagnosticSeverity.Warning],
        [LSeverity.INFO,    vscode.DiagnosticSeverity.Information],
        [LSeverity.HINT,    vscode.DiagnosticSeverity.Hint]
    ]),
    peekStyle: new Map([
        [LPeekStyle.STANDARD, PeekStyle.STANDARD],
        [LPeekStyle.HOVER,    PeekStyle.HOVER]
    ]),
    reveal: new Map([
        [LReveal.CENTER,   vscode.TextEditorRevealType.InCenter],
        [LReveal.TOP,      vscode.TextEditorRevealType.AtTop],
        [LReveal.LITTLE,   vscode.TextEditorRevealType.Default],
        [LReveal.ADAPTIVE, vscode.TextEditorRevealType.InCenterIfOutsideViewport]
    ]),
    peekAutoHide: new Map([
        [LPeekAutoHide.EDIT,          PeekAutoHide.EDIT],
        [LPeekAutoHide.MOVE_KEYBOARD, PeekAutoHide.MOVE_KEYBOARD],
        [LPeekAutoHide.MOVE_MOUSE,    PeekAutoHide.MOVE_MOUSE],
        [LPeekAutoHide.MOVE_OTHER,    PeekAutoHide.MOVE_OTHER]
    ])
}


type SettingsPeek = SettingsNavigation['peek']
const vPeek = (peek: Optional<SettingsPeek>, defaults: SettingsPeek): SettingsPeek => {
    if (peek === undefined) return defaults
    
    return {
        enabled: vBoolean(peek.enabled, defaults.enabled),
        severity: vRegExp(peek.severity, defaults.severity, regexp.severityList),
        style: vRegExp(peek.style, defaults.style, regexp.peekStyle)
    }
}

type SettingsFilter = SettingsNavigation['filter']
const vFilter = (filter: Optional<SettingsFilter>, defaults: SettingsFilter): SettingsFilter => {
    if (filter === undefined) return defaults
    
    return {
        include: vArrayOfStrings(filter.include, defaults.include),
        exclude: vArrayOfStrings(filter.exclude, defaults.exclude),
        caseSensitive: vBoolean(filter.caseSensitive, defaults.caseSensitive),
        workspaceRelative: vBoolean(filter.workspaceRelative, defaults.workspaceRelative)
    }
}


const vRegExp = (str: Optional<string>, defaults: string, regex: RegExp): string => {
    if (typeof str === 'string' && regex.test(str)) return str
    return defaults
}
const vMap = <T>(map: Map<string, T>, key: string | undefined, defaults: T) => {
    if (key === undefined) return defaults
    return map.get(key) ?? defaults
}
const vBoolean = (value: Optional<boolean>, defaults: boolean): boolean => {
    if (typeof value === 'boolean') return value
    return defaults
}
const vPositiveInteger = (num: Optional<number>, defaults: number): number => {
    if (num === undefined || Number.isFinite(num) === false || num < 0) return defaults
    return Math.round(num)
}
const vArrayOfStrings = (value: Optional<string[]>, defaults: string[]): string[] => {
    if (value === undefined || !Array.isArray(value)) return defaults
    for (const item of value) {
        if (typeof item !== 'string') {
            return value.filter(item => typeof item === 'string')
        }
    }
    return value
}
