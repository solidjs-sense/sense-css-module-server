# sense-css-module-server

Sense css module language server

- what's [sense css module](https://github.com/solidjs-sense/vite-plugin-sense-css-module)

![image](https://user-images.githubusercontent.com/5492542/192134513-17a9d4b4-c402-4174-98a5-30510d4b6c59.png)


## Features

- [x] class name autocomplete
- [x] hover document
- [x] goto definition

## Installation

yarn `yarn global add sense-css-module-server`

Or

npm `npm install -g sense-css-module-server`

## Usage

Using with coc.nvim

coc-settings.json

``` json
  "languageserver": {
    "sense-css-module": {
      "module": "sense-css-module-server",
      "args": ["--node-ipc"],
      "filetypes": ["javascriptreact", "javascript.jsx", "typescriptreact", "typescript.tsx", "css", "scss", "less"]
    }
  }
```
