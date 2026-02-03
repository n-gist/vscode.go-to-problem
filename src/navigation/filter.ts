import GlobToRegExp from 'glob-to-regexp'
import path from 'path'
import * as vscode from 'vscode'
import { Settings } from '../settings/settings'
import { SettingsNavigation } from '../types/settings'

export class Filter {
    private static readonly list: Filter[] = []
    
    private readonly settings: SettingsNavigation
    private readonly include: RegExp[] | undefined
    private readonly exclude: RegExp[] | undefined
    private readonly cache: Map<string, boolean>
    
    private constructor(settings: SettingsNavigation) {
        this.settings = settings
        
        const converterOptions: GlobToRegExp.Options = {
            extended: true,
            globstar: true,
            flags: settings.filter.caseSensitive === true ? '' : 'i'
        }
        const converter = (pattern: string) => GlobToRegExp(pattern, converterOptions)
        
        this.include = settings.filter.include.length === 0
            ? undefined
            : settings.filter.include.map(converter)
        
        this.exclude = settings.filter.exclude.length === 0
            ? undefined
            : settings.filter.exclude.map(converter)
            
        this.cache = new Map()
        
        Filter.list.push(this)
    }
    
    isIncluded(uri: vscode.Uri) {
        const cached = this.cache.get(uri.path)
        if (cached !== undefined) return cached
        
        const path = this.settings.filter.workspaceRelative
            ? Filter.workspaceRelative(uri)
            : uri.path
        
        let included = true
        
        const include = this.include
        if (include !== undefined) {
            const length = include.length
            included = false
            for (let i = 0; i < length; i++) {
                if (include[i].test(path)) {
                    included = true
                    break
                }
            }
        }
        
        if (included) {
            const exclude = this.exclude
            if (exclude !== undefined) {
                const length = exclude.length
                for (let i = 0; i < length; i++) {
                    if (exclude[i].test(path)) {
                        included = false
                        break
                    }
                }
            }
        }
        
        this.cache.set(uri.path, included)
        
        return included
    }
    
    private settingsMatch(settings: SettingsNavigation) {
        
        if (
            this.settings.filter.caseSensitive !== settings.filter.caseSensitive ||
            this.settings.filter.workspaceRelative !== settings.filter.workspaceRelative
        ) {
            return false
        }
        
        const include = settings.filter.include
        const exclude = settings.filter.exclude
        
        const fInclude = this.settings.filter.include
        const fExclude = this.settings.filter.exclude
        
        if (fInclude === include && fExclude === exclude) {
            return true
        }
        
        if (include.length === fInclude.length) {
            for (let i = 0; i < fInclude.length; i++) {
                if (include[i] !== fInclude[i]) return false
            }
        } else return false
    
        if (exclude.length === fExclude.length) {
            for (let i = 0; i < fExclude.length; i++) {
                if (exclude[i] !== fExclude[i]) return false
            }
        } else return false
        
        return true
    }
    
    static get(settings: SettingsNavigation): Filter | undefined {
        if (settings.filter.include.length === 0 && settings.filter.exclude.length === 0) {
            return undefined
        }
        
        for (const filter of this.list) {
            if (filter.settingsMatch(settings)) return filter
        }
        
        return new Filter(settings)
    }
    
    static onSettingsUpdated() {
        this.list.length = 0
    }

    private static workspaceRelative(uri: vscode.Uri) {
        if (!Settings.isWorkspace) return uri.path
        
        const fsPath = uri.fsPath
        
        for (const folder of vscode.workspace.workspaceFolders!) {
            const wfsPath = folder.uri.fsPath
            const relativePath = path.relative(wfsPath, fsPath)
            if (relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
                return vscode.workspace.asRelativePath(uri)
            }
        }
        
        return uri.path
    }
}
