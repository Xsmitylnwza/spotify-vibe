# discord-ui.css

Reusable Discord-desktop-like UI pieces (dark theme, generic glyphs — no real logos or wordmarks). All rules are scoped under `.dui`, so the Discord-like font stack (`gg sans`, Noto Sans, Segoe UI) applies only inside it.

Pieces (place and size the outer `.dui` yourself, it is `position:absolute`):
- `.dui-top`: custom title bar. `.dui-body`: flex row holding the columns below.
- `.dui-rail` > `.dui-srv` (`.on` = active squircle + pill) / `.dui-sep`: server rail.
- `.dui-chs` > `h4`, `.dui-cat`, `.dui-ch` (`.on`), `.dui-me`: channel list + user panel.
- `.dui-chat` > `h5`, `.dui-msgs` (blurred, low contrast) > `.dui-msg`, `.dui-input`: chat area.
- `.dui-mem` > `.grp`, `.dui-mrow` (`.hl` = selected) with `.dui-av` (+ `<i>` status dot, `.idle` / `.dnd`), `.n` name, `.s` status line: member list.
- `.dui-pop`: profile popout with `.ban`, `.avw` (avatar + green ring dot), `.in` card (`.dn`, `.hd`, `h6`, `.ab`, `.ms`), and the activity block `.dui-act` / `.dui-big` (large image + `.sm` small icon) / `.tx`.
- `.dui-stack` + `.dui-fade`: stack two states and animate `opacity` from JS to cross-fade.

Example: `../clips/v1-switch/stage.html`. Put `.dui-pop` beside `.dui-mem` (popout right edge = member list left edge). Fictional names and avatars only.
