import { PeekStyle } from './peek'

export const enum NavigationDirection {
    FORWARD,
    BACKWARD
}

export interface NavigationConfigurationPeek {
    readonly enabled: boolean
    readonly severity: boolean[]
    readonly style: PeekStyle
}
