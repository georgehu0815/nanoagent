---
name: datagov
description: Register and search datasets in Azure Purview using the datagov CLI. Use when the user wants to add a new dataset to Purview, register a dataset by name, search for existing datasets, verify a dataset exists, or look up dataset metadata. Triggers on "datagov", "add dataset", "register dataset", "search dataset", "find dataset in Purview", "Purview catalog", or any question about cataloging or discovering datasets.
---

# DataGov CLI Skill

Register and discover datasets in the `purview-msft` Azure Purview instance
using the globally installed `datagov` CLI.

## Setup

- **CLI:** `datagov` (installed globally at `/Users/ghu/.local/bin/datagov`)
- **Default collection:** `d3dnoy` (system name for `ADLSGen2Collection`)
- **Prerequisite:** Azure CLI login (`az account show` to verify)

---

## Commands

### 1. Add a dataset

```bash
datagov add-dataset -n <dataset_name> [options]
```

Registers a `DataSet` entity in Azure Purview under the `ADLSGen2Collection` collection.

| Flag | Short | Required | Default | Description |
|---|---|---|---|---|
| `--name` | `-n` | yes | — | Dataset name |
| `--description` | `-d` | no | — | Free-text description |
| `--owner` | `-o` | no | — | Owner string (email or team name) |
| `--classification` | `-c` | no | — | Purview classification type; repeat for multiple |
| `--collection` | — | no | `d3dnoy` | Collection system name (`d3dnoy` = ADLSGen2Collection) |

- `qualifiedName` is derived automatically as `purview://purview-msft/<name>`
- On success the response includes `mutatedEntities.CREATE` with the new entity's `guid`, `status`, `collectionId`, and attributes
- If the dataset already exists, Purview returns it under `mutatedEntities.UPDATE`

**Minimal example:**
```bash
datagov add-dataset -n my_dataset
```

**With description and owner:**
```bash
datagov add-dataset -n my_dataset -d "WDD dataset 01" -o analytics
```

**With classification:**
```bash
datagov add-dataset -n my_dataset -c MICROSOFT.PERSONAL.NAME
```

**Expected output:**
```
[OK] add-dataset

{
  "mutatedEntities": {
    "CREATE": [
      {
        "typeName": "DataSet",
        "attributes": {
          "qualifiedName": "purview://purview-msft/my_dataset",
          "name": "my_dataset"
        },
        "guid": "<uuid>",
        "status": "ACTIVE",
        "displayText": "my_dataset",
        "collectionId": "<collection_id>",
        "isIncomplete": false,
        "isIndexed": true
      }
    ]
  },
  "guidAssignments": {
    "-707720720207345": "<uuid>"
  }
}
```

---

### 2. Search datasets

```bash
datagov search-datasets -n <keyword> [--limit <n>]
```

Queries the Azure Purview discovery API for `DataSet` entities matching the keyword.

| Flag | Short | Required | Default | Description |
|---|---|---|---|---|
| `--name` | `-n` | yes | — | Keyword or partial name |
| `--limit` | `-l` | no | `10` | Max results to return |

- Results are ranked by `@search.score` — exact name matches score highest
- Each result includes: `id` (guid), `name`, `qualifiedName`, `collectionId`, `entityType`, `createTime`, `updateTime`, `@search.highlights`

**Example:**
```bash
datagov search-datasets -n my_dataset
```

**With limit:**
```bash
datagov search-datasets -n my_dataset --limit 20
```

**Expected output:**
```
[OK] search-datasets  (1 result(s) for 'my_dataset')

[
  {
    "id": "<uuid>",
    "name": "my_dataset",
    "qualifiedName": "purview://purview-msft/my_dataset",
    "collectionId": "<collection_id>",
    "entityType": "DataSet",
    "displayText": "my_dataset",
    "createTime": 1772158687729,
    "@search.score": 259.52582
  }
]
```

---

## Workflow: Register then verify

Always follow this two-step pattern when registering a dataset:

```bash
# 1. Register
datagov add-dataset -n my_dataset -d "My dataset description" -o my-team

# 2. Verify it is indexed and searchable
datagov search-datasets -n my_dataset
```

---

## Decision Guide

| User says... | Command |
|---|---|
| "Add dataset X to Purview" | `datagov add-dataset -n X` |
| "Register dataset X" | `datagov add-dataset -n X` |
| "Register X with description Y" | `datagov add-dataset -n X -d "Y"` |
| "Does dataset X exist?" | `datagov search-datasets -n X` |
| "Find datasets matching X" | `datagov search-datasets -n X` |
| "Search Purview for X" | `datagov search-datasets -n X` |
| "Register X in a different collection" | `datagov add-dataset -n X --collection <system_name>` |

---

## Collections

| Friendly name | System name | Use |
|---|---|---|
| ADLSGen2Collection | `d3dnoy` | Default — use for all registrations |
| Catalyst Data Lake | `dfyfrb` | Alternative root collection |

To override the default collection:
```bash
datagov add-dataset -n my_dataset --collection dfyfrb
```

---

## Error Handling

| Error | Meaning | Fix |
|---|---|---|
| `DefaultAzureCredentialError` | Not logged in | Run `az login` |
| `401 Unauthorized` | Token expired | Run `az login` |
| `ATLAS-403-00-001` | No Data Curator role on collection | Request Data Curator on `ADLSGen2Collection` |
| `CollectionPermissionDenied` | Wrong collection system name or missing role | Check `--collection` value; verify role assignment |
| `httpx.ConnectError` | Network issue | Check VPN / network |

If any command fails, contact:

```
Windows Data SDS Access Team
Email:        <email>
Service Tree: <service_tree_id>
Guide:        https://aka.ms/hermesmcp

Include: full error message + dataset name
```
