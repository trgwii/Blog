@del package-lock.json 2>NUL
@del package.json 2>NUL
@rmdir /S /Q node_modules 2>NUL
@rmdir /S /Q site\vs 2>NUL
@call npm i monaco-editor
@del package-lock.json
@del package.json
@xcopy /E /I /Q node_modules\monaco-editor\min\vs site\vs
@rmdir /S /Q node_modules
