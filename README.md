# quick-restore

quick-restore is a cli tool which speeds up the tedious task of restoring backups.

Currently supports:

Sources:
- Local files
- S3
- Google Cloud Storage

Targets:
- MSSQL

## Install

```
npm install quick-restore -g
```

## Setup workspace
#### Create config file at `<working-dir>/.quick-restore/config.json`
Example S3:
```json
{
  "source": {
    "client": "s3",
    "connection": {
      "secretAccessKey": "1234",
      "accessKeyId": "1234",
      "bucket": "my-bucket"
    },
    "prefix": "sqlbackup/"
  },
  "target": {
    "client": "mssql",
    "connection": {
      "server": "127.0.0.1",
      "username": "sa",
      "password": "1234",
      "database": "northwind"
    },
    "script": "./scrub.sql"
  }
}
```

Example GCS:
```json
{
  "source": {
    "client": "s3",
    "connection": {
      "bucket": "my-bucket",
      "keyFilePath": "/path/to/keyFile.json"
    },
    "prefix": "sqlbackup/"
  },
  "target": {
    "client": "mssql",
    "connection": {
      "server": "127.0.0.1",
      "username": "sa",
      "password": "1234",
      "database": "northwind"
    },
    "script": "./scrub.sql"
  }
}
```
Setup and download your project's key file by following the instructions here:
https://cloud.google.com/docs/authentication/getting-started

## Usage

#### Restore configured source
```
quick-restore
```

#### Restore local file

```
quick-restore <filepath>
```

#### Set database permissions
https://docs.microsoft.com/en-us/sql/database-engine/configure-windows/configure-file-system-permissions-for-database-engine-access?view=sql-server-2017