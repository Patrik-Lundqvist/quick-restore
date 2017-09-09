# quick-restore

quick-restore is a cli tool which speeds up the tedious task of restoring backups.

Currently supports:

Sources:
- Local files
- S3

Targets:
- MSSQL

## Install

```
npm install quick-restore -g
```

## Setup workspace
#### Create config file at `<working-dir>/.quick-restore/config.json`
Example:
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

## Usage

#### Restore configured source
```
quick-restore
```

#### Restore local file

```
quick-restore <filepath>
```