# Go to Problem

This is an extension of the customizable problems navigation<br>
<br>

#### Capabilities

`severity` levels and prioritization<br>
`peek` severity, style, auto hide<br>
`source filter`<br>
`configuration sets`<br>
<br>

#### Adds commands

`go-to-problem.#.next`<br>
`go-to-problem.#.nextInWorkspace`<br>
`go-to-problem.#.prev`<br>
`go-to-problem.#.prevInWorkspace`<br>
`go-to-problem.#.openAll`<br>
<br>
`#` is `1`-`5`<br>
By default, `F8` hotkeys are remapped to use set `1`<br>
<br>

#### All defaults

```json
{
    "go-to-problem": {
        "peekHoverSmoothScrollingDelay": 175,
        "peekStandardAutoHide": "off",
        "problemsSortOrderNotification": true,
        
        "#/base": {
            "enabled": true,
            "severity": "error|warning|info",
            "reveal": "center",
            "prioritizeActive": false,
            "openInPreview": true,
            "peek": {
                "enabled": true,
                "severity": "error, warning, info, hint",
                "style": "standard"
            },
            "filter": {
                "include": [],
                "exclude": [],
                "caseSensitive": true,
                "workspaceRelative": true
            }
        }
    }
}
```

`severity` setting can use prioritization, such as `"error|warning > info|hint"`<br>
`#` numbered configurations are inherited from `base`