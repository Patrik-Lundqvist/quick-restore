# quick-restore

quick-restore is a cli tool which speeds up the tedious task of restoring backups.

Currently supports:

Sources:
- Local files
- S3
- Google Cloud Storage

Targets:
- MSSQL

## Usage

### Restore a [workspace](#setup-workspace)

```
npx quick-restore
```

### Restore a local file

```
npx quick-restore <filepath>
```

## Setup workspace

- Create config file at `<working-dir>/quick-restore/config.json`

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
    "client": "gcs",
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
> Setup and download your project's key file by following the instructions here:
https://cloud.google.com/docs/authentication/getting-started



## Troubleshooting

### Connection refused
When using MSSQL, the TCP/IP connection must be enabled. See this link on how to enable it:
https://docs.microsoft.com/en-us/sql/database-engine/configure-windows/enable-or-disable-a-server-network-protocol?view=sql-server-ver15

### Set file system permissions
The restoring process might be failing due to insufficient file system permissions for the database engine. Permissons must be granted to the folder where the database file is downloaded and read from. See this link on how to resolve it: 

- https://docs.microsoft.com/en-us/sql/database-engine/configure-windows/configure-file-system-permissions-for-database-engine-access?view=sql-server-2017
