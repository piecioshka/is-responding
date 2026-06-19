Output demo/is-responding.gif

Require is-responding

Set Shell "bash"
Set Framerate 60
Set FontSize 12
Set Width 800
Set Height 400
Set Padding 20
Set Margin 5
Set MarginFill "#212830"
Set BorderRadius 10

Hide
Type 'cd /tmp/is-responding-demo && clear' Enter
Show

Type "is-responding --help" Sleep 200ms Enter
Wait Sleep 1500ms

Enter Enter Type "# probe a URL across a {{integer}} range to find live endpoints" Sleep 200ms Enter Enter
Wait Sleep 800ms

Type 'is-responding -u "https://example.org/{{integer}}/" -f 1 -t 5 -v' Sleep 500ms Enter
Wait Sleep 2000ms

Sleep 3s
