# `seguro-gateway` README

The seguro-gateway library.

## Usage

Add as a dependency to a Node.js project:

```bash
yarn add @conet-project/seguro-gateway
```

Import from the package:

```ts
import { Daemon } from '@conet-project/seguro-gateway'

// Launch with default port of 3001 and path of ''
Daemon()

// Launch on port 3005 and path of './'
Daemon(3005, './')
```

Run CLI command:

```bash
yarn run seguro-gateway [--port] [port] [--path] [./path/to/workers]

Examples:

// Run with default port 3001 and empty path
yarn run seguro-gateway

// Run with port 3005 and current path
Ex: yarn run seguro-gateway --port 3005 --path ./
```

## Development

### Install

```bash
yarn
```

### Lint

```bash
yarn lint
```

### Test
```bash
yarn test
```

### Build

```bash
yarn build
```

### Clean

```bash
yarn clean
```
