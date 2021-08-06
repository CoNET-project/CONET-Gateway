# `seguro-gateway` CHANGELOG

## `0.4.1`

### Additions

- None.

### Changes

- Change `/hello` API endpoint to return JSON format.

### Fixes

- None.

---

## `0.4.0`

### Additions

- Add `/hello` API endpoint on local server.

### Changes

- None.

### Fixes

- None.

---

## `0.3.1`

### Additions

- None.

### Changes

- None.

### Fixes

- Add missing `async` package.

---

## `0.3.0`

### Additions

- Added src/localServer folder
- Added src/localServer/utilities folder
- Added src/localServer/workers folder
- Added src/localServer/workers/utilities folder

- Added src/localServer/workers/utilities/Buffer.js
- Added src/localServer/workers/utilities/generatePassword.ts
- Added src/localServer/workers/utilities/launchAllWorkers.ts
- Added src/localServer/workers/utilities/mainWorkerDoCommand.ts
- Added src/localServer/workers/utilities/openpgp.js
- Added src/localServer/workers/utilities/Pouchdb.js
- Added src/localServer/workers/utilities/PouchdbFind.js
- Added src/localServer/workers/utilities/PouchdbMemory.js
- Added src/localServer/workers/utilities/SubWorkerInWorker.js
- Added src/localServer/workers/utilities/utilities.ts
- Added src/localServer/workers/utilities/UuidV4.js

- Added src/localServer/workers/encrypt.ts
- Added src/localServer/workers/mainWorker.ts
- Added src/localServer/workers/storage.ts

- Added src/localServer/utilities/Imap.ts
- Added src/localServer/utilities/imapPeer.ts
- Added src/localServer/utilities/network.ts

- Added src/localServer/utilities/define.d.ts
- Added src/localServer/utilities/index.ts
- Added src/localServer/utilities/localServer.ts

### Changes

- Comment out `allowJs` in `tsconfig.json`.
- Deleted sample `export` in `./src/index.ts`.
- Add scripts `local` in `package.json` to support `yarn local`
### Fixes

- None.

---

## `0.2.1`

### Additions

- None.

### Changes

- Comment out `declarationDir` in `tsconfig.json`.
- Change package.json `types` to `./build/index.d.ts`.

### Fixes

- None.

---

## `0.2.0`

### Additions

- None.

### Changes

- Customized the base template for the new project.

### Fixes

- None.

---

## `0.1.0`

### Additions

- Added the initial project.

### Changes

- None.

### Fixes

- None.

---

## `major.minor.patch`

### Additions

- None.

### Changes

- None.

### Fixes

- None.
