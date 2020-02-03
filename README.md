# ![RealWorld Example App](logo.png)

> ### [Servant TS](https://github.com/ivivona/servant-ts) codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld) spec and API.

### [Demo](https://github.com/gothinkster/realworld)&nbsp;&nbsp;&nbsp;&nbsp;[RealWorld](https://github.com/gothinkster/realworld)

This codebase was created to demonstrate a fully fledged backend application built with **[Servant TS](https://github.com/ivivona/servant-ts)**, [IO-TS](https://github.com/gcanti/io-ts) and [Postgres SQL](https://www.postgresql.org/) including CRUD operations, authentication, routing, pagination, and more.

We've gone to great lengths to adhere to the **[Servant TS](https://github.com/ivivona/servant-ts)** community styleguides & best practices.

For more information on how to this works with other frontends/backends, head over to the [RealWorld](https://github.com/gothinkster/realworld) repo.

# Getting started

- Clone this repository
- Install Postgres SQL
- Create a new database and import (assuming named `real-ts`) the dump with `psql real-ts < real-ts.pgsql`
- `npm install`
- `POSTGRES_DB_URL=<database connection string> npm start`
- In a different terminal, go into the `spec` directory and execute `APIURL=http://localhost:3000/api ./run-api-tests.sh` to run the [API spec tests](/spec/README.md).
