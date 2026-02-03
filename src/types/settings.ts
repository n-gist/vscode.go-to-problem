export interface SettingsGeneral {
    readonly peekHoverSmoothScrollingDelay: number
    readonly peekStandardAutoHide: string
    readonly problemsSortOrderNotification: boolean
}

export interface SettingsNavigation {
    readonly enabled: boolean
    readonly severity: string
    readonly reveal: string
    readonly prioritizeActive: boolean
    readonly openInPreview: boolean
    readonly peek: {
        readonly enabled: boolean
        readonly severity: string
        readonly style: string
    }
    readonly filter: {
        readonly include: string[]
        readonly exclude: string[]
        readonly caseSensitive: boolean
        readonly workspaceRelative: boolean
    }
}
