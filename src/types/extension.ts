export interface ExtensionCommand {
    readonly id: string
    readonly call: () => void
}
